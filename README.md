# IAO Architecture — Input Portal

AG Grid-powered web editor for tower capability architecture data. Part of the IAO Architecture two-repo solution.

## Architecture

```
┌───────────────────────────────────────────────────────────────┐
│  Input Portal (this repo)                                     │
│  React + Vite + AG Grid Community                             │
│  GitHub Pages                                                 │
│                                                               │
│  Architect → 14-column simplified grid → Download XLSX        │
│  Push to GitHub → Contents API via PAT                        │
└───────────────────────┬───────────────────────────────────────┘
                        │  (GitHub Contents API)
                        ▼
┌───────────────────────────────────────────────────────────────┐
│  Architecture Portal (sajivfrancis777/ADA-Artifacts)       │
│                                                               │
│  enrich_flows.py → expands 14 cols to 47 (IAPM + inference)   │
│  generate-architecture.yml → SADs, dashboards, summaries      │
│  deploy-pages.yml → toolbar, sidebar, chatbot injection       │
│  data-refresh.yml → daily Smartsheet + JIRA pull              │
│                                                               │
│  Triggers: push to towers/**/input/** OR daily 07:00 UTC      │
└───────────────────────────────────────────────────────────────┘
```

## Simplified Input (14 Columns)

Architects fill only what requires human knowledge. The enrichment pipeline auto-fills the remaining 33 columns.

### Flows Tab — Architect Input
| # | Column | Required | TOGAF |
|---|--------|----------|-------|
| 1 | Flow Chain | Yes | All |
| 2 | Hop # | Yes | All |
| 3 | Source System | Yes (autocomplete, 4,953 IAPM apps) | A |
| 4 | Source Lane | Yes | B/A |
| 5 | Target System | Yes (autocomplete, 4,953 IAPM apps) | A |
| 6 | Target Lane | Yes | B/A |
| 7 | Interface / Technology | Yes (dropdown) | A/T |
| 8 | Frequency | Yes (dropdown) | A/T |
| 9 | Data Description | Yes | D |
| 10 | Source DB Platform | Yes (dropdown) | D/T |
| 11 | Target DB Platform | Yes (dropdown) | D/T |
| 12 | Source Tech Platform | Optional — auto-filled from IAPM | T |
| 13 | Target Tech Platform | Optional — auto-filled from IAPM | T |
| 14 | Integration Pattern | Optional — inferred from Interface | T |

### Auto-Enriched by Pipeline
IAPM URL, Product Owner, Business Owner, Application Status, Middleware, Protocol, Auth Method, Data Classification, Direction, Environment Scope, and 23 more columns.

### Other Tabs
| Tab | Columns | Description |
|-----|---------|-------------|
| Business Drivers | 5 | Strategic drivers and priorities |
| Success Criteria | 5 | Metrics, targets, baselines |
| NFRs | 5 | Non-functional requirements |
| Security Controls | 5 | Security concerns and approaches |
| Recommendations | 7 | Architecture recommendations |

## Features

- **Autocomplete system dropdowns** — 65 known systems pinned first, 4,888 active IAPM apps searchable below
- **Single-click editing** — click any cell to start editing immediately
- **Dropdown selectors** — Interface, Frequency, DB Platform, Tech Platform, Integration Pattern
- **Auto-size columns** — columns fit content width on load; manual resize via toolbar button
- **Right-click context menu** — clear all values in a column
- **Column header menu** — clear column via the ≡ hamburger menu
- **Load XLSX** — import an existing workbook (extra columns silently ignored)
- **Download XLSX** — export current grid state without needing to save first
- **Push to GitHub** — direct browser-to-repo save via PAT (triggers regeneration)
- **Save locally** — persist drafts in browser localStorage
- **Clipboard** — Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A, Delete (custom implementation for AG Grid Community)
- **File tree sidebar** — browse existing flow files in the Architecture repo

## Quick Start

```bash
npm install
npm run dev       # http://localhost:5173/ADA-Ingestion/
npm run build     # Production build → dist/
```

## Usage

1. Select **Tower** and **Capability** from the dropdowns
2. Fill in flow data using the 14-column simplified grid
3. Use **autocomplete** on Source/Target System to pick from IAPM applications
4. Click **Download XLSX** to export locally, or **Push to GitHub** to trigger doc generation
5. The Architecture Portal pipeline auto-enriches to 47 columns and regenerates all documents

## Sync with Architecture Portal

| Trigger | What Happens |
|---------|-------------|
| Push to GitHub (manual) | XLSX saved to `towers/{tower}/{cap}/input/data/` → triggers `generate-architecture.yml` |
| Daily schedule (07:00 UTC) | Full regeneration of all SADs, dashboards, summaries |
| Data refresh (06:00 UTC) | Smartsheet + JIRA data pulled, committed to repo |

## Tech Stack

- **React 18** + **TypeScript** + **Vite**
- **AG Grid Community** — data grid with grouping, filtering, inline editing
- **SheetJS** — browser-side XLSX read/write
- **GitHub Contents API** — direct browser-to-repo save via PAT
- **IAPM System Registry** — 4,953 active applications for autocomplete (generated from IAPM CSV)

## Demo Video

A **2:28 hybrid demo video** covers the full IAO Architecture solution — including this Input Portal's AG Grid editor, bulk editing, and XLSX import/export workflow. The video combines AI motion graphics with real browser walkthrough footage, rendered using [Remotion](https://www.remotion.dev/).

**Video**: Available in the [ADA-Artifacts](https://github.com/sajivfrancis777/ADA-Artifacts) repo at `remotion-demo/out/ADA-Artifacts-Demo.mp4` (60 MB, 1920×1080, 30fps)

| Segment | Duration | What It Shows |
|---|---|---|
| Architecture Portal | 57s | Tower landing pages, capability navigation, SAD documents |
| **Input Portal** | **25s** | **AG Grid data editor, bulk cell editing, XLSX import/export** |
| Dashboards & Chatbot | 31s | Plotly.js dashboards, MCP chatbot queries |

> Source code: [`remotion-demo/`](https://github.com/sajivfrancis777/ADA-Artifacts/tree/main/remotion-demo) in the Architecture repo.

---

## Phased Roadmap

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Load / Edit / Download XLSX locally | ✅ Done |
| 1 | Push to GitHub via browser PAT | ✅ Done |
| 1 | Simplified 14-column input + IAPM enrichment | ✅ Done |
| 1 | Autocomplete system dropdowns (4,953 apps) | ✅ Done |
| 1 | Right-click clear column + auto-size columns | ✅ Done |
| 1 | Cross-repo sync (push triggers Architecture Portal regeneration) | ✅ Done |
| 2 | Azure Functions backend (server-held token, no per-user PAT) | Planned |
| 3 | Embedded chatbot in the Input Portal | Planned |
