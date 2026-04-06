# IAO Architecture — Input Portal

AG Grid-powered web editor for tower capability architecture data. Part of the IAO Architecture two-repo solution.

## Architecture

```
┌───────────────────────────────────────────────────────────────┐
│  Input Portal (this repo)                                     │
│  React + Vite + AG Grid Community                             │
│  GitHub Pages (private)                                       │
│                                                               │
│  Architect → Load XLSX → Edit → Download XLSX (Phase 1)       │
│  Push to GitHub → direct browser API via PAT (Phase 1)        │
└───────────────────────┬───────────────────────────────────────┘
                        │  (GitHub Contents API)
                        ▼
┌───────────────────────────────────────────────────────────────┐
│  Architecture Portal (sajivfrancis777/IAO-Architecture)       │
│  Generated docs, dashboards, SAD, AI chatbot                  │
│  GitHub Pages (enterprise access)                             │
│                                                               │
│  data-refresh.yml → auto-pulls Smartsheet + JIRA daily        │
│  deploy-pages.yml → rebuilds site with toolbar, sidebar,      │
│                     chatbot injection                         │
│  chat-api.yml → GitHub Actions chatbot backend (Phase 1)      │
└───────────────────────────────────────────────────────────────┘
```

## Current Features

### Editor (6-Tab Grid)
| Tab | Columns | Description |
|-----|---------|-------------|
| Flows | 47 (5 groups) | Integration flow data — base, data arch, tech arch, interface, endpoint |
| Business Drivers | 5 | Strategic drivers and priorities |
| Success Criteria | 5 | Metrics, targets, baselines |
| NFRs | 5 | Non-functional requirements |
| Security Controls | 5 | Security concerns and approaches |
| Recommendations | 7 | Architecture recommendations |

### Save to GitHub (Phase 1 — Working)
- Direct browser → GitHub Contents API (no server needed)
- Each user provides a fine-grained PAT with `Contents: Read and write` on `IAO-Architecture`
- Token stored in browser `localStorage` only — never saved to repo
- Path: `data/input-portal/{tower}/{cap}/{release}_{state}.json`

> **Note:** SAP Dev Status is auto-generated from SAP OData API, and Business Architecture (BPMN) is fetched from Signavio/BIC API — neither is architect input.

## Quick Start

```bash
npm install
npm run dev       # http://localhost:5173/IAO-Architecture-Input-Portal/
npm run build     # Production build → dist/
```

## Usage

1. Select **Tower** and **Capability** from the dropdown
2. Click **Load XLSX** to import an existing workbook
3. Edit data across the 6 tabs using AG Grid (dropdowns, inline editing)
4. Click **Download XLSX** to save the workbook locally
5. Click **Push to GitHub** to save data to the Architecture Portal repo (requires PAT)

## Tech Stack

- **React 18** + **TypeScript**
- **Vite** — Fast build tool
- **AG Grid Community** — Free data grid with grouping, filtering, editing
- **SheetJS** — Browser-side XLSX read/write (no server needed)
- **GitHub Contents API** — Direct browser-to-repo save via PAT

## Phased Roadmap

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Load / Edit / Download XLSX locally | ✅ Done |
| 1 | Push to GitHub via browser PAT | ✅ Done |
| 2 | Azure Functions / Cloudflare Workers backend (server-held token, no per-user PAT) | Planned |
| 3 | Cross-repo trigger → Architecture Portal regeneration on save | Planned |
| 3 | Embedded chatbot in the Input Portal | Planned |
