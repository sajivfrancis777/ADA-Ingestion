"""
parse_visio.py — Server-side Visio parser for .vsd and .vsdx files.

Called by the GitHub Actions workflow after LibreOffice converts .vsd → .vsdx.
Parses the .vsdx ZIP/XML structure and extracts integration hops.

Usage:
    python scripts/parse_visio.py --input <file.vsdx> --output <hops.json> \
        --tower <TOWER> --cap <CAP-ID>
"""

import argparse
import json
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


def parse_visio_page(page_xml: str, page_name: str) -> dict:
    """Parse a single Visio page XML and extract nodes + edges."""
    root = ET.fromstring(page_xml)
    # Visio uses namespaces
    ns = {'v': 'http://schemas.microsoft.com/office/visio/2012/main'}

    nodes: dict[str, str] = {}  # shape_id → label
    connects: dict[str, dict] = {}  # connector_id → {from: id, to: id}

    # Extract shapes with text
    for shape in root.iter('{http://schemas.microsoft.com/office/visio/2012/main}Shape'):
        shape_id = shape.get('ID', '')
        text_el = shape.find('.//v:Text', ns)
        if text_el is None:
            # Try without namespace (some exports)
            text_el = shape.find('.//Text')
        label = ''
        if text_el is not None:
            label = ''.join(text_el.itertext()).strip()
        if shape_id and label:
            nodes[shape_id] = label

    # Extract connections
    for connect in root.iter('{http://schemas.microsoft.com/office/visio/2012/main}Connect'):
        from_sheet = connect.get('FromSheet', '')
        to_sheet = connect.get('ToSheet', '')
        from_cell = connect.get('FromCell', '')

        if from_sheet not in connects:
            connects[from_sheet] = {}

        if from_cell == 'BeginX':
            connects[from_sheet]['from'] = to_sheet
        elif from_cell == 'EndX':
            connects[from_sheet]['to'] = to_sheet

    # Build edges
    edges = []
    for connector_id, conn in connects.items():
        if 'from' in conn and 'to' in conn:
            edge_label = nodes.pop(connector_id, '')  # Connector text = edge label
            edges.append({
                'source': conn['from'],
                'target': conn['to'],
                'label': edge_label,
            })

    return {
        'name': page_name,
        'nodes': nodes,
        'edges': edges,
    }


def detect_release_state(tab_name: str) -> tuple[str, str]:
    """Detect release and state from tab/page name."""
    release = 'All'
    state = 'Current'

    release_patterns = [
        (r'\bR1\b', 'R1'), (r'\bRelease\s*1\b', 'R1'),
        (r'\bR2\b', 'R2'), (r'\bRelease\s*2\b', 'R2'),
        (r'\bR3\b', 'R3'), (r'\bRelease\s*3\b', 'R3'),
        (r'\bR4\b', 'R4'), (r'\bRelease\s*4\b', 'R4'),
    ]
    state_patterns = [
        (r'\bfuture\b', 'Future'), (r'\bto[\s-]?be\b', 'Future'),
        (r'\btarget\b', 'Future'), (r'\bcurrent\b', 'Current'),
        (r'\bas[\s-]?is\b', 'Current'), (r'\bbaseline\b', 'Current'),
    ]

    for pattern, val in release_patterns:
        if re.search(pattern, tab_name, re.IGNORECASE):
            release = val
            break
    for pattern, val in state_patterns:
        if re.search(pattern, tab_name, re.IGNORECASE):
            state = val
            break

    return release, state


def graph_to_hops(pages: list[dict]) -> list[dict]:
    """Convert graph pages to hop rows."""
    sheets = []

    for page in pages:
        release, state = detect_release_state(page['name'])
        nodes = page['nodes']
        edges = page['edges']

        if not edges:
            continue

        # Build adjacency
        adj: dict[str, list] = {}
        has_incoming: set = set()
        for edge in edges:
            adj.setdefault(edge['source'], []).append(edge)
            has_incoming.add(edge['target'])

        # Find roots
        roots = [nid for nid in adj if nid not in has_incoming]
        if not roots and edges:
            seen = set()
            for edge in edges:
                if edge['source'] not in seen:
                    roots.append(edge['source'])
                    seen.add(edge['source'])

        hops = []
        chain_id = 0

        for root in roots:
            visited = set()
            stack = [{'node': root, 'path': []}]

            while stack:
                item = stack.pop()
                node_id = item['node']
                path = item['path']
                out_edges = adj.get(node_id, [])

                if not out_edges and path:
                    chain_id += 1
                    for i, step in enumerate(path):
                        src = nodes.get(root, root) if i == 0 else nodes.get(path[i-1]['node'], path[i-1]['node'])
                        tgt = nodes.get(step['node'], step['node'])
                        hops.append({
                            'Flow Chain': f'Chain-{chain_id}',
                            'Hop #': i + 1,
                            'Source System': src,
                            'Target System': tgt,
                            'Interface / Technology': step['label'],
                            'Frequency': '',
                            'Data Description': '',
                        })
                    continue

                for edge in out_edges:
                    key = f"{node_id}->{edge['target']}"
                    if key in visited:
                        continue
                    visited.add(key)
                    stack.append({
                        'node': edge['target'],
                        'path': path + [{'node': edge['target'], 'label': edge['label']}],
                    })

        # Fallback: if DFS produced nothing, emit edges directly
        if not hops and edges:
            chain_id += 1
            for i, edge in enumerate(edges):
                src = nodes.get(edge['source'], edge['source'])
                tgt = nodes.get(edge['target'], edge['target'])
                hops.append({
                    'Flow Chain': f'Chain-{chain_id}',
                    'Hop #': i + 1,
                    'Source System': src,
                    'Target System': tgt,
                    'Interface / Technology': edge['label'],
                    'Frequency': '',
                    'Data Description': '',
                })

        if hops:
            sheets.append({
                'tabName': page['name'],
                'release': release,
                'state': state,
                'hops': hops,
            })

    return sheets


def parse_vsdx(file_path: Path) -> list[dict]:
    """Parse a .vsdx file (ZIP/XML) and extract pages with nodes/edges."""
    pages = []

    with zipfile.ZipFile(file_path, 'r') as z:
        # Read page names from pages.xml
        page_names: dict[int, str] = {}
        if 'visio/pages/pages.xml' in z.namelist():
            pages_xml = z.read('visio/pages/pages.xml').decode('utf-8')
            root = ET.fromstring(pages_xml)
            for idx, page_el in enumerate(root.iter('{http://schemas.microsoft.com/office/visio/2012/main}Page')):
                name = page_el.get('Name') or page_el.get('NameU') or f'Page {idx + 1}'
                page_names[idx] = name

        # Find and parse page XML files
        page_files = sorted([
            f for f in z.namelist()
            if re.match(r'^visio/pages/page\d+\.xml$', f, re.IGNORECASE)
        ])

        for idx, page_file in enumerate(page_files):
            page_xml = z.read(page_file).decode('utf-8')
            page_name = page_names.get(idx, f'Page {idx + 1}')
            page_data = parse_visio_page(page_xml, page_name)
            if page_data['edges']:
                pages.append(page_data)

    return pages


def main():
    parser = argparse.ArgumentParser(description='Parse Visio .vsdx and extract integration hops')
    parser.add_argument('--input', required=True, help='Path to .vsdx file')
    parser.add_argument('--output', required=True, help='Path to output hops JSON')
    parser.add_argument('--tower', required=True, help='Tower ID')
    parser.add_argument('--cap', required=True, help='Capability ID')
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f'ERROR: Input file not found: {input_path}', file=sys.stderr)
        sys.exit(1)

    pages = parse_vsdx(input_path)
    if not pages:
        print(f'WARNING: No integration flows found in {input_path.name}', file=sys.stderr)
        # Still write empty result
        sheets = []
    else:
        sheets = graph_to_hops(pages)

    total_hops = sum(len(s['hops']) for s in sheets)
    total_chains = sum(len(set(h['Flow Chain'] for h in s['hops'])) for s in sheets)

    result = {
        'metadata': {
            'source_file': input_path.name,
            'extracted_at': __import__('datetime').datetime.utcnow().isoformat() + 'Z',
            'format': 'visio',
            'total_chains': total_chains,
            'total_hops': total_hops,
            'capability': args.cap,
            'tower': args.tower,
        },
        'sheets': sheets,
    }

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(f'✓ Extracted {total_hops} hops from {total_chains} chains → {output_path}')


if __name__ == '__main__':
    main()
