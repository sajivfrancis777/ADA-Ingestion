"""
Build a valid .vsdx template for ADA Integration Flows.

Strategy: Start from Visio's real BASICD_M.VSTX template (which Visio 
definitely opens), then replace the pages section with our 13 pre-named pages.
This preserves all the required document.xml, theme, windows, and metadata
that Visio requires to consider a file valid.
"""
import zipfile, os, io, shutil

VISIO_TEMPLATE = r"C:\Program Files\Microsoft Office\root\Office16\Visio Content\1033\BASICD_M.VSTX"
OUTPUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'templates', 'integration-flows-template.vsdx')

PAGES = [
    ("Instructions", "page1.xml"),
    ("CurrentFlows(UNIVERSAL)", "page2.xml"),
    ("FutureFlows(UNIVERSAL)", "page3.xml"),
    ("R1_CurrentFlows", "page4.xml"),
    ("R1_FutureFlows", "page5.xml"),
    ("R2_CurrentFlows", "page6.xml"),
    ("R2_FutureFlows", "page7.xml"),
    ("R3_CurrentFlows", "page8.xml"),
    ("R3_FutureFlows", "page9.xml"),
    ("R4_CurrentFlows", "page10.xml"),
    ("R4_FutureFlows", "page11.xml"),
    ("R5_CurrentFlows", "page12.xml"),
    ("R5_FutureFlows", "page13.xml"),
]


def make_pages_xml():
    """Generate pages.xml with all 13 named pages."""
    pages = []
    for i, (name, _) in enumerate(PAGES):
        rel_id = f"rId{i+1}"
        pages.append(f'''  <Page ID="{i}" NameU="{name}" Name="{name}" IsCustomNameU="1" IsCustomName="1">
    <PageSheet LineStyle="0" FillStyle="0" TextStyle="0">
      <Cell N="PageWidth" V="11.02777777777778"/>
      <Cell N="PageHeight" V="8.263888888888889"/>
      <Cell N="PageScale" V="1"/>
      <Cell N="DrawingScale" V="1"/>
      <Cell N="DrawingScaleType" V="0"/>
      <Cell N="DrawingSizeType" V="3"/>
      <Cell N="InhibitSnap" V="0"/>
      <Cell N="PageLockReplace" V="0" U="BOOL"/>
      <Cell N="PageLockDuplicate" V="0" U="BOOL"/>
    </PageSheet>
    <Rel r:id="{rel_id}"/>
  </Page>''')
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Pages xmlns="http://schemas.microsoft.com/office/visio/2012/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
{chr(10).join(pages)}
</Pages>'''


def make_pages_rels():
    """Generate pages.xml.rels for all page files."""
    rels = []
    for i, (_, filename) in enumerate(PAGES):
        rels.append(f'  <Relationship Id="rId{i+1}" Type="http://schemas.microsoft.com/visio/2010/relationships/page" Target="{filename}"/>')
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
{chr(10).join(rels)}
</Relationships>'''


def make_page_xml():
    """Empty but valid page content."""
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<PageContents xmlns="http://schemas.microsoft.com/office/visio/2012/main"
              xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
</PageContents>'''


def make_content_types():
    """Generate [Content_Types].xml with all page overrides."""
    page_overrides = '\n  '.join(
        f'<Override PartName="/visio/pages/{fn}" ContentType="application/vnd.ms-visio.page+xml"/>'
        for _, fn in PAGES
    )
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="emf" ContentType="image/x-emf"/>
  <Override PartName="/visio/document.xml" ContentType="application/vnd.ms-visio.drawing.main+xml"/>
  <Override PartName="/visio/pages/pages.xml" ContentType="application/vnd.ms-visio.pages+xml"/>
  {page_overrides}
  <Override PartName="/visio/windows.xml" ContentType="application/vnd.ms-visio.windows+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/custom.xml" ContentType="application/vnd.openxmlformats-officedocument.custom-properties+xml"/>
</Types>'''


def build():
    if not os.path.exists(VISIO_TEMPLATE):
        print(f"ERROR: Visio template not found at: {VISIO_TEMPLATE}")
        print("This script must run on a machine with Visio installed.")
        return

    buf = io.BytesIO()
    with zipfile.ZipFile(VISIO_TEMPLATE, 'r') as src, \
         zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as dst:
        
        # Copy everything from source EXCEPT pages-related files and [Content_Types].xml
        skip_prefixes = ('visio/pages/', '[Content_Types].xml')
        for item in src.infolist():
            if any(item.filename.startswith(p) or item.filename == p for p in skip_prefixes):
                continue
            data = src.read(item.filename)
            dst.writestr(item, data)
        
        # Write our custom pages
        dst.writestr('[Content_Types].xml', make_content_types())
        dst.writestr('visio/pages/pages.xml', make_pages_xml())
        dst.writestr('visio/pages/_rels/pages.xml.rels', make_pages_rels())
        for _, fn in PAGES:
            dst.writestr(f'visio/pages/{fn}', make_page_xml())

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, 'wb') as f:
        f.write(buf.getvalue())
    print(f'Written: {OUTPUT} ({os.path.getsize(OUTPUT)} bytes)')


if __name__ == '__main__':
    build()
