# ADA — Architecture Delivery Accelerator (Input Portal)

> **ADA** = **A**rchitecture **D**elivery **A**ccelerator — an automation pipeline for architecture documentation, developed for the **IAO (Intel Architecture Office) Program**.

AG Grid-powered web editor for tower capability architecture data. Part of the ADA two-repo solution.

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

---

## Embedded Chat Features

The Input Portal includes an embedded chat widget (same capabilities as the Architecture Portal) for querying architecture data without leaving the editor.

| Feature | Description |
|---|---|
| **Mermaid.js diagram rendering** | Chat responses containing Mermaid code blocks are rendered as interactive SVG diagrams |
| **SVG persistence** | Rendered diagrams are cached and survive DOM rebuilds (panel maximize/minimize) |
| **Fullscreen expand** | ⛶ Expand button opens each diagram in a fullscreen overlay for detailed inspection |
| **Scrollable code blocks** | Long code blocks contained in scrollable regions |
| **IAPM system name grounding** | System names grounded to official IAPM application names via curated cross-reference (37 entries, 60 aliases) |
| **Unified release & phase scoping** | Prompts disambiguate release (R3, R4) and phase (Current/Future for flows, MC1–UAT for tests, all for dev objects) before generating outputs |

---

## Required Inputs from Architects

The Input Portal captures the minimum structured data needed for the ADA pipeline. Accuracy depends on timely architect input.

| Input | Who Provides | Priority | Impact if Missing |
|---|---|---|---|
| **CurrentFlows / FutureFlows** (14-column grid) | Tower Architects (per capability) | Critical | No flow diagrams or system dependency maps in generated SADs |
| **Release-scoped flow variants** (R3, R4, etc.) | Tower Architects | High | Diagrams default to "all releases" — cannot reconcile against published SADs |
| **KDD ID and Link mapping** | OTC Architecture Team | Medium | No traceability from dev objects to key design decisions |
| **SAP Package Name + Object ID** per RICEFW | Deloitte Build Team | High | No SAP ↔ RICEFW linkage |
| **Test phase mapping** (MC1/MC2/ITC1/ITC2/UAT per capability) | Test Champion | High | Test reports lack phase-level granularity |

> **Current coverage**: ~141 of 188 capabilities have architect-provided flow data. The remaining ~47 need architect input.

---

## API Access Dependencies

| System | Access Required | Status | Impact |
|---|---|---|---|
| **GitHub Contents API** | PAT with repo scope | ✅ Working | Push to GitHub from browser |
| **IAPM registry** | CSV export (30K+ apps) | ✅ Working | Autocomplete system dropdowns |
| **Azure AD** (future auth) | App registration in Intel tenant | ❌ Pending | Server-held token (Phase 2) — eliminates per-user PAT requirement |
| **Azure Functions** (future backend) | Intel Azure subscription | ❌ Pending | Web chatbot + save-data endpoint (Phase 2–3) |

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
| 1 | Embedded chat with Mermaid.js diagram rendering | ✅ Done |
| 1 | SVG cache persistence across DOM rebuilds | ✅ Done |
| 1 | Fullscreen expand button for rendered diagrams | ✅ Done |
| 1 | Scrollable code blocks in chat responses | ✅ Done |
| 1 | IAPM system name grounding (37 entries, 60 aliases) | ✅ Done |
| 1 | Unified release & phase scoping in chat prompts | ✅ Done |
| 2 | Azure Functions backend (server-held token, no per-user PAT) | Planned |
| 3 | Embedded chatbot in the Input Portal (Azure Functions backend) | Planned |
