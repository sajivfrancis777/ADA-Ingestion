# ADA Integration Flow Templates

Templates for documenting integration architecture flows per release.  
Upload via the **ADA Editor → 📐 Upload Diagram** button.

---

## Available Templates

| Template | Tool | Format |
|----------|------|--------|
| `integration-flows-template.drawio` | Draw.io / diagrams.net | XML (multi-tab) |
| `integration-flows-template.archimate.xml` | BiZZdesign / Archi / Sparx EA | ArchiMate Open Exchange XML |
| `integration-flows-template.vsdx` | Microsoft Visio 2013+ | OOXML/ZIP (multi-page) |

> **Existing .vsd files?** No problem — the upload pipeline auto-converts `.vsd` → `.vsdx` via LibreOffice before parsing.

---

## Tab / Page / View Naming Convention

The parser auto-detects **release** and **state** from tab names.  
Use these exact names for guaranteed 100% detection:

| Tab Name | Release | State | Maps to XLSX |
|----------|---------|-------|-------------|
| `CurrentFlows(UNIVERSAL)` | All | Current | `CurrentFlows.xlsx` |
| `FutureFlows(UNIVERSAL)` | All | Future | `FutureFlows.xlsx` |
| `R1_CurrentFlows` | R1 | Current | `R1_CurrentFlows.xlsx` |
| `R1_FutureFlows` | R1 | Future | `R1_FutureFlows.xlsx` |
| `R2_CurrentFlows` | R2 | Current | `R2_CurrentFlows.xlsx` |
| `R2_FutureFlows` | R2 | Future | `R2_FutureFlows.xlsx` |
| `R3_CurrentFlows` | R3 | Current | `R3_CurrentFlows.xlsx` |
| `R3_FutureFlows` | R3 | Future | `R3_FutureFlows.xlsx` |
| `R4_CurrentFlows` | R4 | Current | `R4_CurrentFlows.xlsx` |
| `R4_FutureFlows` | R4 | Future | `R4_FutureFlows.xlsx` |
| `R5_CurrentFlows` | R5 | Current | `R5_CurrentFlows.xlsx` |
| `R5_FutureFlows` | R5 | Future | `R5_FutureFlows.xlsx` |

### Also Recognized (free-form)

The parser matches many naming variations — you don't have to use the exact names above:

**Release names** (all case-insensitive):
- `R1` through `R9`, `Release 1`, `Rel-1`, `Rel.1`, `Rel 1`
- `Wave 1`, `W1`, `Phase 1`, `Ph1`
- `Cutover 1`, `Go-Live 1`, `GL1`, `Sprint 1`
- Sub-releases: `R1.1`, `R2.3`, etc. (map to parent release)
- `POC`, `Pilot`, `MVP` → treated as R1

**State names** (all case-insensitive):
- **Future**: `FutureFlows`, `future`, `future state`, `to-be`, `target`, `proposed`, `planned`, `in-design`, `draft`, `delta`, `incremental`
- **Current**: `CurrentFlows`, `current`, `current state`, `as-is`, `baseline`, `existing`, `legacy`, `pre-migration`

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
4. Use `FlowRelationship` for data flows, `ServingRelationship` for service calls
5. **Label every relationship** — that becomes the "Interface / Technology" column
6. Export as ArchiMate Open Exchange XML and upload

### Visio (.vsdx / .vsd)

1. Open the `.vsdx` template in Visio 2013+
2. Each **page** = one tab (page names match the convention above)
3. Use rectangles/shapes for systems, connectors for hops
4. Label connectors with the interface technology
5. Save as `.vsdx` and upload (or `.vsd` — auto-converted)

---

## Template Download Filenames

When downloaded via the ADA Editor, templates are named with the active tower and capability context:

```
{Tower}_{CapID}_{CapName}_Integration-Flows.drawio
{Tower}_{CapID}_{CapName}_Integration-Flows.archimate.xml
{Tower}_{CapID}_{CapName}_Integration-Flows.vsdx
```

Example: `FPR_DS-020_Product-Costing_Integration-Flows.drawio`
