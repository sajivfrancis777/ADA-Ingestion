# ADA — Architecture Delivery Accelerator (Input Portal)

> **ADA** = **A**rchitecture **D**elivery **A**ccelerator — an automation pipeline for architecture documentation, developed for the **IAO (IDM Acceleration Office) Program**.

AG Grid-powered web editor for capturing tower capability architecture flows. Architects fill a simplified 14-column grid; the companion [ADA-Artifacts](https://github.com/sajivfrancis777/ADA-Artifacts) pipeline auto-enriches to 47 columns and generates full TOGAF BDAT architecture documents.

**Live Editor**: [sajivfrancis777.github.io/ADA-Ingestion](https://sajivfrancis777.github.io/ADA-Ingestion/)

---

## How It Works

1. Select **Tower** and **Capability** from the dropdowns
2. Fill in integration flow data (source system, target system, interface, frequency, etc.)
3. **Download XLSX** locally or **Push to GitHub** to trigger automatic document generation
4. The Architecture Portal enriches flows with IAPM metadata and regenerates all architecture documents

---

## Key Features

- **Autocomplete system dropdowns** — 4,953 IAPM applications searchable with known systems pinned first
- **Inline editing** — click any cell to edit; dropdowns for constrained fields
- **IAPM clickable links** — system nodes in Mermaid diagrams link directly to IAPM application pages
- **Embedded chat** — query architecture data with Mermaid diagram rendering, fullscreen expand, and IAPM grounding
- **Load / Download XLSX** — import existing workbooks or export current state
- **Push to GitHub** — browser-to-repo save via PAT (triggers doc regeneration)
- **File tree sidebar** — browse existing flow files in the Architecture repo
- **Mobile support** — touch panning on diagram previews

---

## Quick Start

```bash
npm install
npm run dev       # http://localhost:5173/ADA-Ingestion/
npm run build     # Production build → dist/
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | React + TypeScript + Vite |
| Grid | AG Grid Community |
| XLSX | SheetJS (browser-side read/write) |
| Diagrams | Mermaid.js with interactive SVG rendering |
| Persistence | GitHub Contents API (PAT) + localStorage |
| Data | IAPM registry (4,953 active applications) |

---

## Related

| Repository | Purpose |
|---|---|
| [ADA-Artifacts](https://github.com/sajivfrancis777/ADA-Artifacts) | Pipeline + generated architecture documents + GitHub Pages portal |
| [ADA-Artifacts Portal](https://sajivfrancis777.github.io/ADA-Artifacts/) | Live architecture documentation site |
