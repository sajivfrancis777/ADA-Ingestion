# ADA Integration Flow Templates

Templates for documenting integration architecture flows per release.  
Upload via the **ADA Editor → 📐 Upload Diagram** button.

---

## Available Templates

| Template | Tool | Format |
|----------|------|--------|
| `integration-flows-template.drawio` | Draw.io / diagrams.net | XML (multi-tab) |
| `integration-flows-template.archimate.xml` | BiZZdesign / Archi / Sparx EA | ArchiMate Open Exchange XML |
| *(Visio — see naming guide below)* | Microsoft Visio | .vsdx (modern) or .vsd (legacy) |

---

## Tab / Page / View Naming Convention

The parser auto-detects **release** and **state** from tab names.  
Use these names for guaranteed 100% detection:

| Tab Name | Release | State |
|----------|---------|-------|
| `Current State` | All | Current |
| `R1 - Future State` | R1 | Future |
| `R2 - Future State` | R2 | Future |
| `R3 - Future State` | R3 | Future |
| `R4 - Future State` | R4 | Future |

### Also Recognized (free-form)

The parser matches many naming variations — you don't have to use the exact names above:

**Release names** (all case-insensitive):
- `R1` through `R9`, `Release 1`, `Rel-1`, `Rel.1`, `Rel 1`
- `Wave 1`, `W1`, `Phase 1`, `Ph1`
- `Cutover 1`, `Go-Live 1`, `GL1`, `Sprint 1`
- Sub-releases: `R1.1`, `R2.3`, etc. (map to parent release)
- `POC`, `Pilot`, `MVP` → treated as R1

**State names** (all case-insensitive):
- **Future**: `future`, `future state`, `to-be`, `target`, `proposed`, `planned`, `in-design`, `draft`, `delta`, `incremental`
- **Current**: `current`, `current state`, `as-is`, `baseline`, `existing`, `legacy`, `pre-migration`

**Default** (if no pattern matches): `release=All`, `state=Current`

---

## What the Parser Extracts

From each tab/page/view, the parser identifies:

| Grid Column | Extracted From |
|-------------|---------------|
| Flow Chain | DFS traversal path (auto-numbered) |
| Hop # | Position in the chain (1, 2, 3...) |
| Source System | Node/shape label at arrow start |
| Target System | Node/shape label at arrow end |
| Interface / Technology | Arrow/edge/relationship label |
| Frequency | *(not extracted — fill in manually)* |
| Data Description | *(not extracted — fill in manually)* |

---

## Format-Specific Guidance

### Draw.io (.drawio)

1. Open the template in [app.diagrams.net](https://app.diagrams.net)
2. Each tab = one page in the bottom tab bar
3. Use **rectangles** for systems, **arrows** (connectors) for integration hops
4. Label arrows with the interface technology (e.g. "MuleSoft API", "IDoc", "RFC")
5. Save as `.drawio` and upload

### ArchiMate XML (BiZZdesign / Archi)

1. Import the template into BiZZdesign Enterprise Studio or Archi
2. Each **view** = one tab in parser output
3. Use `ApplicationComponent` elements for systems
4. Use `FlowRelationship` between elements — **name the relationship** with the technology
5. Export as ArchiMate Open Exchange (`.xml`) and upload
6. BiZZdesign: File → Export → Open Exchange File

### Visio (.vsdx / .vsd)

No template file provided (Visio requires proprietary tools to create).  
Follow these conventions:

1. **Name your pages** using the tab naming convention above
2. Use **rectangles/shapes** for systems with text labels
3. Use **connectors** (arrows) between systems
4. Label connectors with the interface technology
5. Save as `.vsdx` (preferred) or `.vsd` (legacy — converted server-side)
6. Upload via ADA Editor

**Tip:** You can also export your Visio diagram to `.drawio` format using [diagrams.net](https://app.diagrams.net) (File → Import from → Visio) and use the `.drawio` template tab names.

---

## Processing Pipeline

| Format | Processing | Location |
|--------|-----------|----------|
| `.drawio` | Client-side (instant) | Browser |
| `.archimate.xml` | Client-side (instant) | Browser |
| `.vsdx` | Client-side (instant) | Browser |
| `.vsd` | Server-side (GitHub Action) | ~2 min |
| `.bpmn` | **Not parsed** — stored as-is | `input/bpmn/` |

---

## File Layout After Upload

```
towers/{TOWER}/{L1}/{CAP-ID}/input/
├── data/       ← XLSX workbook data
├── uploads/    ← your diagrams (.drawio, .vsdx, .vsd, .xml)
├── extracts/   ← parsed hops JSON (auto-generated)
└── bpmn/       ← BPMN business process files (not parsed)
```
