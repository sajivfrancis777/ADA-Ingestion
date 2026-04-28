/**
 * generate-vsdx-template.mjs — Builds a minimal .vsdx template file
 * with correctly named pages matching the ADA tab naming convention.
 *
 * .vsdx is an OPC (Open Packaging Convention) ZIP archive containing XML files.
 * This generates the minimum required structure for Visio to open successfully.
 *
 * Usage: node scripts/generate-vsdx-template.mjs
 */
import JSZip from 'jszip';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PAGE_NAMES = [
  'Instructions',
  'CurrentFlows(UNIVERSAL)',
  'FutureFlows(UNIVERSAL)',
  'R1_CurrentFlows', 'R1_FutureFlows',
  'R2_CurrentFlows', 'R2_FutureFlows',
  'R3_CurrentFlows', 'R3_FutureFlows',
  'R4_CurrentFlows', 'R4_FutureFlows',
  'R5_CurrentFlows', 'R5_FutureFlows',
];

// Visio 2013+ namespace
const VNS = 'http://schemas.microsoft.com/office/visio/2012/main';
const RNS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

function contentTypes(pageCount) {
  const pageOverrides = Array.from({ length: pageCount }, (_, i) =>
    `  <Override PartName="/visio/pages/page${i + 1}.xml" ContentType="application/vnd.ms-visio.page+xml"/>`
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/visio/document.xml" ContentType="application/vnd.ms-visio.drawing.main+xml"/>
  <Override PartName="/visio/pages/pages.xml" ContentType="application/vnd.ms-visio.pages+xml"/>
${pageOverrides}
</Types>`;
}

function rootRels() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.microsoft.com/visio/2010/relationships/document" Target="visio/document.xml"/>
</Relationships>`;
}

function documentXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<VisioDocument xmlns="${VNS}" xmlns:r="${RNS}">
  <DocumentProperties>
    <Creator>ADA Template Generator</Creator>
    <Description>ADA Integration Flows Template — pre-named pages for parser compatibility</Description>
  </DocumentProperties>
</VisioDocument>`;
}

function documentRels() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.microsoft.com/visio/2010/relationships/pages" Target="pages/pages.xml"/>
</Relationships>`;
}

function pagesXml(names) {
  const entries = names.map((name, i) => `    <Page ID="${i}" NameU="${escXml(name)}" Name="${escXml(name)}">
      <Rel r:id="rId${i + 1}"/>
    </Page>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Pages xmlns="${VNS}" xmlns:r="${RNS}">
${entries}
</Pages>`;
}

function pagesRels(count) {
  const entries = Array.from({ length: count }, (_, i) =>
    `  <Relationship Id="rId${i + 1}" Type="http://schemas.microsoft.com/visio/2010/relationships/page" Target="page${i + 1}.xml"/>`
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${entries}
</Relationships>`;
}

function pageXml(name) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<PageContents xmlns="${VNS}" xmlns:r="${RNS}">
  <!-- ${escXml(name)} — add shapes and connectors in Visio -->
</PageContents>`;
}

function escXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function main() {
  const zip = new JSZip();

  zip.file('[Content_Types].xml', contentTypes(PAGE_NAMES.length));
  zip.file('_rels/.rels', rootRels());
  zip.file('visio/document.xml', documentXml());
  zip.file('visio/_rels/document.xml.rels', documentRels());
  zip.file('visio/pages/pages.xml', pagesXml(PAGE_NAMES));
  zip.file('visio/pages/_rels/pages.xml.rels', pagesRels(PAGE_NAMES.length));

  for (let i = 0; i < PAGE_NAMES.length; i++) {
    zip.file(`visio/pages/page${i + 1}.xml`, pageXml(PAGE_NAMES[i]));
  }

  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  const outPath = resolve(__dirname, '..', 'public', 'templates', 'integration-flows-template.vsdx');
  writeFileSync(outPath, buf);
  console.log(`✓ Generated ${outPath} (${buf.length} bytes, ${PAGE_NAMES.length} pages)`);
}

main().catch(err => { console.error(err); process.exit(1); });
