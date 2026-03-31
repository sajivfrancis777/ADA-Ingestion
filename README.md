# IAO Architecture — Input Portal

AG Grid-powered web editor for tower capability architecture data. Part of the IAO Architecture two-repo solution.

## Architecture

```
┌─────────────────────────────────────┐
│  Input Portal (this repo)           │
│  React + Vite + AG Grid Community   │
│  GitHub Pages (private)             │
│                                     │
│  Architect → Load XLSX → Edit →     │
│  Download XLSX (Phase 1)            │
│  Save → Azure Function (Phase 2)   │
└─────────────────────────────────────┘
         │ (future: cross-repo trigger)
         ▼
┌─────────────────────────────────────┐
│  Architecture Portal (IAO-Arch)     │
│  Generated docs, dashboards, SAD    │
│  GitHub Pages (enterprise access)   │
└─────────────────────────────────────┘
```

## 8-Tab Editor

| Tab | Columns | Description |
|-----|---------|-------------|
| Flows | 47 (5 groups) | Integration flow data — base, data arch, tech arch, interface, endpoint |
| Business Drivers | 5 | Strategic drivers and priorities |
| Success Criteria | 5 | Metrics, targets, baselines |
| Business Architecture | 23 | BPMN-style process steps |
| NFRs | 5 | Non-functional requirements |
| Security Controls | 5 | Security concerns and approaches |
| SAP Dev Status | 6 | Transport requests, build progress |
| Recommendations | 7 | Architecture recommendations |

## Quick Start

```bash
npm install
npm run dev       # http://localhost:5173/IAO-Architecture-Input-Portal/
npm run build     # Production build → dist/
```

## Usage

1. Select **Tower** and **Capability** from the dropdown
2. Click **Load XLSX** to import an existing workbook
3. Edit data across the 8 tabs using AG Grid (dropdowns, inline editing)
4. Click **Download XLSX** to save the workbook locally

## Tech Stack

- **React 18** + **TypeScript**
- **Vite** — Fast build tool
- **AG Grid Community** — Free data grid with grouping, filtering, editing
- **SheetJS** — Browser-side XLSX read/write (no server needed)

## Roadmap

- **Phase 1** (current): Load/Edit/Download XLSX locally
- **Phase 2**: Azure Function API → auto-commit to repo on Save
- **Phase 3**: Cross-repo trigger → Architecture Portal regeneration
- **Phase 4**: Embedded chatbot (Anthropic Claude RAG)
