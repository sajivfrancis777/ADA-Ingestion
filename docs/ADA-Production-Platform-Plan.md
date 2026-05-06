# ADA Production Platform Plan

## Architecture Delivery Accelerator (ADA) — Production-Grade Transformation

**Author:** Enterprise Architecture / Sajiv Francis  
**Date:** May 6, 2026  
**Status:** DRAFT — Planning Phase  
**Governance Level:** L0 (Strategic — New Business Capability / Technology Transformation)

---

## 1. Business Context

### Problem Statement
ADA currently operates as two GitHub-hosted repos (ADA-Ingestion + ADA-Artifacts) with client-side authentication, localStorage persistence, and direct GitHub API calls. To scale beyond IAO to any project/initiative (regardless of size), it must become a production-grade platform with:
- Centralized monitoring and health observability
- Multi-project tenancy (not just IAO)
- Proper identity (Entra ID), RBAC, and admin controls
- Workflow automation (n8n) for data refresh and notifications
- Graceful failure handling and dependency tracking
- Self-service for smaller teams without Smartsheet/JIRA

### Desired Business Outcomes
1. **Any team** (large SAP programs or 5-person initiatives) can track architecture delivery
2. **Production reliability** — health monitoring, graceful degradation, admin visibility
3. **Zero vendor lock-in** on data entry — manual-first with optional MCP/API connectors
4. **Single deployment** — Azure Static Web Apps + Azure Functions (merged repo)

---

## 2. APQC PCF Classification

| Capability | Level 1 | Level 2 | Description |
|------------|---------|---------|-------------|
| Architecture Delivery Platform | 8.0 Manage Information Technology | 8.3 Manage IT Operations | Platform for managing architecture artifacts and delivery tracking |
| Project/Initiative Tracking | 13.0 Develop & Manage Business Capabilities | 13.2 Manage portfolio, program, and project | Multi-project scope management |
| Workflow Automation (n8n) | 8.0 Manage Information Technology | 8.2 Develop and manage IT solutions | Automated data pipelines and notifications |
| Identity & Access Management | 8.0 Manage Information Technology | 8.4 Manage IT security and risk | Entra ID, RBAC, role management |

---

## 3. Current-State Function Inventory

### ADA-Ingestion (Frontend — React/Vite)

| Category | Count | Key Functions |
|----------|-------|---------------|
| **Services** | 27 | sendMessage, loadContextIndex, searchContextIndex, loadLLMConfig, runHealthChecks, loadWorkbook, saveToGitHub |
| **UI Components** | 15 | App, ChatPanel, TabEditor, TowerSelector, Toolbar, FileTree, DiagramPreview, ChatFAB, HealthCheck |
| **Utilities** | 22 | parseDiagram, flowsToMermaid, xlsxUtils (4), githubFetch (5), githubSave (5), githubDiagramUpload (3), platformLookup (2) |
| **Hooks** | 1 | useGridClipboard |
| **Data Registries** | 5 | towerRegistry, projectRegistry, systemRegistry, sampleDataGenerator, columnDefs |
| **Types/Interfaces** | ~40 | ChatMessage, LLMConfig, WorkbookData, FlowRow, HopRow, ParseResult, etc. |

### ADA-Artifacts (Backend — Python + Node)

| Category | Count | Key Functions |
|----------|-------|---------------|
| **CI/CD Workflows** | 7 | deploy-pages, data-refresh, parse-diagram, chat-api, generate-architecture, quick-redeploy, sharepoint-sync |
| **Python Scripts** | 34 | build_context_index, gen_tower_pages, fetch_smartsheet_data, fetch_jira_data, enrich_flows, gen_pdf |
| **Python Modules** | 20 | config, project_config, xlsx_loader, csv_parser, bpmn_parser, iapm_lookup, smartsheet_loader, mermaid_builder |
| **MCP Servers** | 5 | smartsheet_server, iapm_server, jira_server, sap_odata_server (placeholder), bic_server (placeholder) |

### External Dependencies (npm — ADA-Ingestion)

| Package | Version | Risk Level | Notes |
|---------|---------|------------|-------|
| ag-grid-community | ^32.3.3 | LOW | Stable, active, MIT |
| ag-grid-react | ^32.3.3 | LOW | Aligned with community |
| react | ^18.3.1 | LOW | LTS, widely supported |
| react-dom | ^18.3.1 | LOW | Paired with React |
| **mermaid** | ^11.14.0 | **MEDIUM** | Large bundle, frequent breaking changes, FOUC possible |
| xlsx (SheetJS) | ^0.18.5 | LOW | Community edition, stable |
| jszip | ^3.10.1 | LOW | Minimal, well-maintained |
| vite | ^6.0.5 | LOW | Build tool only |

### External API Endpoints

| Endpoint | Failure Impact | Current Handling |
|----------|---------------|------------------|
| GitHub Git Trees API | File tree won't load | Silent fail + sessionStorage cache |
| GitHub Blobs API | XLSX won't load | Shows error toast |
| GitHub Contents API (write) | Save fails | Error state + user message |
| GitHub Pages (context-index.json) | No cross-cap grounding | Chat still works, warns "no data" |
| GitHub Pages (system-platforms.json) | Auto-fill disabled | Falls back to static SYSTEM_DEFAULTS |
| Azure OpenAI (LLM) | Chat dead | Shows "No API configured" |
| Ollama localhost | Local fallback dead | Falls back to Azure if configured |

---

## 4. Production-Grade Architecture (Target State)

### 4.1 Deployment Topology

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Azure Static Web Apps (SWA)                       │
│                                                                     │
│  ┌──────────────────────┐  ┌──────────────────────────────────────┐ │
│  │  ADA Portal (React)  │  │  Azure Functions (Managed API)       │ │
│  │  - Editor (AG Grid)  │  │  /api/flows     — CRUD flows         │ │
│  │  - Chat (LLM)        │  │  /api/diagrams  — parse + store      │ │
│  │  - Docs (static)     │  │  /api/chat      — LLM proxy          │ │
│  │  - Admin panel       │  │  /api/context   — context-index       │ │
│  │  - Health dashboard  │  │  /api/projects  — project CRUD       │ │
│  └──────────────────────┘  │  /api/health    — system health      │ │
│                             │  /api/admin     — config management  │ │
│                             └──────────────────────────────────────┘ │
│                                                                     │
│  Auth: /.auth/login/aad  (Entra ID built-in)                       │
└─────────────────────────────────────────────────────────────────────┘
         │                              │
         │                              │
    ┌────▼─────┐              ┌─────────▼──────────┐
    │ Cosmos DB │              │  n8n (Azure VM)    │
    │           │              │                    │
    │ - flows   │              │  - Smartsheet sync │
    │ - projects│              │  - JIRA sync       │
    │ - context │              │  - IAPM refresh    │
    │ - users   │              │  - Health alerts   │
    │ - audit   │              │  - Scheduled build │
    └───────────┘              └────────────────────┘
```

### 4.2 Multi-Project Tenancy Model

```
┌───────────────────────────────────────────────────────────────────┐
│                         ADA Platform                               │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ IAO Program │  │ Small Init  │  │ Another Prg │             │
│  │ (8 towers)  │  │ (1 tower)   │  │ (3 towers)  │             │
│  │             │  │             │  │             │  ...          │
│  │ Smartsheet  │  │ Manual only │  │ JIRA + API  │             │
│  │ JIRA        │  │ No ext deps │  │ Smartsheet  │             │
│  │ SAP OData   │  │             │  │             │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                   │
│  Shared: Entra ID, Chat, Mermaid, Templates, Admin               │
└───────────────────────────────────────────────────────────────────┘
```

**Key Design Principle:** Every project starts manual-first. Connectors (Smartsheet, JIRA, SAP, MCP) are OPTIONAL add-ons configured per project.

---

## 5. Implementation Plan

### Phase 1: Foundation (Weeks 1-3) — Azure SWA + Merged Repo

| # | Task | Details |
|---|------|---------|
| 1.1 | Create ADO monorepo | Merge ADA-Ingestion + ADA-Artifacts into `ADA-Platform` |
| 1.2 | Azure SWA setup | Deploy merged app (React frontend + Azure Functions API) |
| 1.3 | Entra ID integration | Replace localStorage auth with `/.auth/login/aad` |
| 1.4 | Cosmos DB provisioning | Create database: `ada-platform` with containers: projects, flows, context, users, audit |
| 1.5 | Pin Mermaid version | Lock mermaid to exact version, bundle as chunked import, add fallback SVG on failure |
| 1.6 | Environment config | Move all secrets to Azure Key Vault, inject via SWA app settings |

### Phase 2: Admin & Monitoring (Weeks 4-6)

| # | Task | Details |
|---|------|---------|
| 2.1 | Admin page (Entra-gated) | Role: `ADA.Admin` — system config, project management, connector setup |
| 2.2 | RBAC implementation | Roles: Admin, Architect (CRUD), Viewer (read-only) — per-project assignment |
| 2.3 | Function execution monitor | Log all API calls to Cosmos `audit` container — function name, duration, status, user |
| 2.4 | Health dashboard (admin) | Server-side health checks: Cosmos, LLM, Connectors, n8n, Build pipeline |
| 2.5 | Package health monitor | Automated npm audit + Python safety check in CI — alert on vulnerabilities |
| 2.6 | Graceful failure patterns | Circuit breaker on all external calls (GitHub, LLM, Smartsheet, JIRA) with fallback responses |

### Phase 3: Multi-Project Support (Weeks 7-9)

| # | Task | Details |
|---|------|---------|
| 3.1 | Project CRUD API | `/api/projects` — create, configure towers, set connectors, assign roles |
| 3.2 | Dynamic tower/cap registry | Move from static `towerRegistry.ts` to Cosmos-backed `/api/projects/{id}/towers` |
| 3.3 | Manual data entry mode | Default for new projects — architects enter flows, RICEFW, etc. directly in grid |
| 3.4 | Project templates | "IAO-style" (8 towers, full RICEFW) vs "Lightweight" (1-3 towers, flows only) |
| 3.5 | Per-project context index | Build context-index per project (Azure Function timer trigger) |
| 3.6 | Project switching UI | Project selector in header — all state scoped to active project |

### Phase 4: Connector Framework (Weeks 10-12)

| # | Task | Details |
|---|------|---------|
| 4.1 | Connector abstraction | Interface: `IDataConnector { name, type, healthCheck(), sync(), getStatus() }` |
| 4.2 | Smartsheet connector | Wrap existing MCP → Azure Function (optional per-project config) |
| 4.3 | JIRA connector | Wrap existing MCP → Azure Function (PAT per-project) |
| 4.4 | MCP discovery service | Admin UI: browse available MCPs, test connection, activate per-project |
| 4.5 | n8n workflow engine | Deploy n8n (Azure VM or container) for scheduled syncs + notifications |
| 4.6 | Manual-to-API migration | Admin toggle: "Use Smartsheet for RICEFW" flips from manual grid to synced data |

### Phase 5: n8n Workflow Automation (Weeks 13-15)

| # | Task | Details |
|---|------|---------|
| 5.1 | n8n deployment | Azure Container Instance or VM (self-hosted, Intel-safe) |
| 5.2 | Smartsheet refresh workflow | Schedule: every 6h, fetch RICEFW + RAID → Cosmos |
| 5.3 | JIRA refresh workflow | Schedule: every 4h, fetch defects + tests → Cosmos |
| 5.4 | Context index rebuild | Trigger: on flow data change (Cosmos changefeed) → rebuild context-index.json |
| 5.5 | Health alert workflow | Check: all connectors, LLM, Cosmos → Teams/email notification on failure |
| 5.6 | Diagram parse pipeline | Trigger: on upload → parse → extract hops → update flows (replace GitHub Action) |

### Phase 6: Observability & Hardening (Weeks 16-18)

| # | Task | Details |
|---|------|---------|
| 6.1 | Application Insights | Full APM: request tracing, dependency tracking, failure rates, performance |
| 6.2 | Structured logging | All functions log to App Insights with correlation IDs |
| 6.3 | Error boundary UI | React error boundaries per section (grid, chat, diagram) — never full-page crash |
| 6.4 | Rate limiting | Azure Functions: per-user rate limits on LLM proxy (prevent abuse) |
| 6.5 | Data backup | Cosmos DB continuous backup + point-in-time restore |
| 6.6 | Load testing | Verify: 50 concurrent users, 10 projects, 5000 flows per project |

---

## 6. Function Monitoring Framework

### 6.1 Core Functions to Monitor

| Function | Tier | SLA | Failure Mode | Fallback |
|----------|------|-----|--------------|----------|
| `/api/flows` (CRUD) | Critical | 99.9% | Cosmos timeout | Retry 3x, then localStorage cache |
| `/api/chat` (LLM proxy) | Important | 99% | Azure OpenAI timeout | Ollama fallback → graceful "service busy" |
| `/api/context` (context-index) | Important | 99% | Build pipeline stale | Serve last-good cached version |
| `/api/diagrams/parse` | Standard | 95% | Parse error | Return partial result + error details |
| `/api/projects` (CRUD) | Critical | 99.9% | Cosmos failure | Read from cache, queue writes |
| `/api/health` | Critical | 99.99% | Self-check failure | Return degraded status (never fail) |
| `/api/admin` | Standard | 95% | Config error | Reject change, preserve current config |

### 6.2 Health Check Matrix

| Check | Method | Frequency | Alert Channel |
|-------|--------|-----------|---------------|
| Cosmos DB connectivity | TCP + query | 60s | Teams + email |
| Azure OpenAI reachability | HEAD + test prompt | 5min | Teams |
| Smartsheet API token validity | Auth check | 1h | Email (admin) |
| JIRA API token validity | Auth check | 1h | Email (admin) |
| n8n workflow health | n8n API /executions | 15min | Teams |
| Context-index freshness | Last-modified check | 30min | Email |
| npm audit (CI) | npm audit --production | On PR + daily | ADO pipeline alert |
| Python safety (CI) | safety check | On PR + daily | ADO pipeline alert |
| Mermaid render test | Render sample diagram | On deploy | Block deploy on failure |
| Certificate/token expiry | Check exp date | Daily | Email (14d, 7d, 1d warnings) |

### 6.3 Graceful Failure Patterns

```typescript
// Circuit Breaker Pattern for all external calls
interface CircuitBreaker {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailure: number;
  threshold: number;      // failures before opening
  resetTimeout: number;   // ms before trying again
}

// Every external service gets a circuit breaker:
// - LLM API (threshold: 3, reset: 30s)
// - GitHub API (threshold: 5, reset: 60s)
// - Smartsheet API (threshold: 3, reset: 120s)
// - JIRA API (threshold: 3, reset: 120s)
// - Cosmos DB (threshold: 2, reset: 10s)
```

**Degradation Levels:**
1. **Full service** — All systems operational
2. **Degraded** — One or more connectors down; manual entry still works, chat may be limited
3. **Read-only** — Cosmos write failures; users can view but not save
4. **Emergency** — Core services down; show maintenance page with ETA

---

## 7. Mermaid Packaging Strategy

### Current Risk
- Mermaid `^11.14.0` (floating semver) — breaking changes possible on install
- 2.4 MB bundle size — impacts initial load
- Runtime rendering failures silent (no diagram shown)

### Production Strategy

| Concern | Solution |
|---------|----------|
| Version stability | Pin EXACT version: `"mermaid": "11.14.0"` (no caret) |
| Bundle size | Dynamic import: `const mermaid = await import('mermaid')` — loaded only when diagram visible |
| Render failures | Try-catch per diagram; show raw source code + "Render failed" message |
| CSP compliance | Configure Mermaid's `securityLevel: 'strict'` |
| Test coverage | CI renders 5 reference diagrams on every build — fail pipeline if any break |
| Upgrade policy | Quarterly review; test against reference diagrams before bumping |
| Offline fallback | Pre-render SVG on server (Azure Function) for static docs; client renders interactive only |

---

## 8. Admin Page Design

### 8.1 Access Control (Entra ID + RBAC)

| Role | Scope | Permissions |
|------|-------|-------------|
| `ADA.Admin` | Platform-wide | All config, user management, connector setup, health view, audit logs |
| `ADA.ProjectAdmin` | Per-project | Project config, tower/cap management, connector toggle, role assignment |
| `ADA.Architect` | Per-project | CRUD flows/diagrams/RICEFW, chat, diagram upload |
| `ADA.Viewer` | Per-project | Read-only access to all data, chat (read history only) |

### 8.2 Admin Page Sections

```
┌────────────────────────────────────────────────────────┐
│  ADA Admin                               [user] [logout]│
├────────────────────────────────────────────────────────┤
│                                                        │
│  📊 System Health        👥 Users & Roles              │
│  ├─ API Status           ├─ User list                  │
│  ├─ Connector Health     ├─ Role assignments           │
│  ├─ LLM Status           └─ Pending invitations       │
│  ├─ Build Pipeline                                     │
│  └─ n8n Workflows        📋 Projects                   │
│                           ├─ Project list               │
│  🔌 Connectors           ├─ Create new project         │
│  ├─ Smartsheet           ├─ Tower/Cap configuration    │
│  ├─ JIRA                 └─ Connector toggles          │
│  ├─ SAP OData                                          │
│  ├─ MCP Servers          📜 Audit Log                   │
│  └─ Custom APIs          ├─ Recent activity            │
│                           ├─ Error log                  │
│  ⚙️ Configuration        └─ Performance metrics        │
│  ├─ LLM Provider                                       │
│  ├─ Context Index        📦 Packages                    │
│  ├─ Feature Flags        ├─ npm audit results          │
│  └─ Maintenance Mode     ├─ Python safety results      │
│                           └─ Upgrade recommendations    │
└────────────────────────────────────────────────────────┘
```

### 8.3 Entra ID Integration (Azure SWA Built-in)

```json
// staticwebapp.config.json
{
  "auth": {
    "identityProviders": {
      "azureActiveDirectory": {
        "registration": {
          "openIdIssuer": "https://login.microsoftonline.com/{tenant-id}/v2.0",
          "clientIdSettingName": "AAD_CLIENT_ID",
          "clientSecretSettingName": "AAD_CLIENT_SECRET"
        }
      }
    }
  },
  "routes": [
    { "route": "/admin/*", "allowedRoles": ["ADA.Admin"] },
    { "route": "/api/admin/*", "allowedRoles": ["ADA.Admin"] },
    { "route": "/api/projects/*/config", "methods": ["PUT", "DELETE"], "allowedRoles": ["ADA.Admin", "ADA.ProjectAdmin"] },
    { "route": "/api/*", "allowedRoles": ["authenticated"] },
    { "route": "/*", "allowedRoles": ["anonymous"] }
  ],
  "responseOverrides": {
    "401": { "redirect": "/.auth/login/aad" }
  }
}
```

---

## 9. Multi-Project Extensibility

### 9.1 Project Configuration Model

```typescript
interface ProjectConfig {
  id: string;                    // e.g. 'iao', 'fab-automation', 'scm-pilot'
  name: string;                  // Display name
  description: string;
  size: 'enterprise' | 'standard' | 'lightweight';
  towers: TowerConfig[];
  connectors: ConnectorConfig[];
  features: FeatureFlags;
  team: TeamMember[];
  createdAt: string;
  updatedAt: string;
}

interface TowerConfig {
  id: string;
  name: string;
  capabilities: CapabilityConfig[];
}

interface CapabilityConfig {
  id: string;
  name: string;
  l1Group: string;              // L1 grouping (e.g. "DC — Manage Accounting")
}

interface ConnectorConfig {
  type: 'smartsheet' | 'jira' | 'sap-odata' | 'mcp' | 'manual';
  enabled: boolean;
  config: Record<string, string>;  // connection params (stored in Key Vault)
  lastSync?: string;
  status: 'active' | 'error' | 'disabled';
}

interface FeatureFlags {
  chatEnabled: boolean;
  diagramUpload: boolean;
  bpmnParsing: boolean;
  ricefwTracking: boolean;
  raidTracking: boolean;
  jiraIntegration: boolean;
  smartsheetIntegration: boolean;
  abapCodeAssessment: boolean;
}
```

### 9.2 Onboarding Flow (New Project)

1. **Admin creates project** → name, description, size template
2. **Define towers & capabilities** → manual entry or import from Excel/YAML
3. **Assign team** → Entra ID group or individual UPNs → roles
4. **Configure connectors** → optional: Smartsheet, JIRA, SAP — test connection
5. **Import existing data** → optional: upload XLSX with existing flows
6. **Activate** → project visible to assigned team

### 9.3 Small Initiative Support (No External Tools)

For teams without Smartsheet or JIRA:
- **All data stays in the grid** — flows, RICEFW, success criteria entered manually
- **Local RAID** — simple grid tab (no Smartsheet dependency)
- **Chat still works** — grounded on project's own flow data
- **Diagram upload** — still supports Draw.io, BPMN, Visio
- **Reports** — basic dashboard generated from grid data alone
- **Future upgrade path** — when team adopts Smartsheet/JIRA, admin toggles connector ON

---

## 10. n8n Workflow Opportunities

| Workflow | Trigger | Source | Destination | Benefit |
|----------|---------|--------|-------------|---------|
| RICEFW Sync | Schedule (6h) | Smartsheet | Cosmos DB | Always-fresh object tracking |
| RAID Sync | Schedule (6h) | Smartsheet | Cosmos DB | Real-time risk visibility |
| Defect Sync | Schedule (4h) | JIRA | Cosmos DB | Test/defect dashboard data |
| Context Index Rebuild | Cosmos changefeed | Cosmos (flows) | Cosmos (context) | Auto-update after any flow edit |
| Stale Data Alert | Schedule (daily) | Cosmos | Teams channel | Notify if data > 48h old |
| Welcome Email | New user added | Entra ID | Outlook | Onboarding instructions |
| Diagram Parse | Blob upload trigger | Azure Blob | Cosmos (flows) | Auto-extract hops from diagrams |
| Health Alert | Failure detected | Health API | Teams + email | Immediate incident notification |
| Weekly Summary | Schedule (Monday 8am) | Cosmos (all) | Teams + email | Program health digest to stakeholders |
| Token Expiry Warning | Schedule (daily) | Key Vault | Admin email | 14/7/1 day warnings |

---

## 11. Migration Path (Current → Target)

### Step 1: Merge Repos (Pre-requisite)

```
ADA-Ingestion (React frontend)  ─┐
                                  ├──► ADA-Platform (monorepo)
ADA-Artifacts (Python backend)  ─┘
                                        ├── app/          (React SPA)
                                        ├── api/          (Azure Functions)
                                        ├── scripts/      (Python pipeline)
                                        ├── mcp_servers/  (MCP tools)
                                        ├── docs/         (Generated output)
                                        └── infra/        (Bicep/Terraform)
```

### Step 2: Incremental Migration (Not Big Bang)

| Current | Target | Migration Strategy |
|---------|--------|-------------------|
| GitHub Pages (context-index) | Cosmos DB + /api/context | Dual-read: try API first, fall back to GitHub Pages |
| localStorage (user config) | Cosmos (users container) | Sync on login: load from Cosmos, cache in localStorage |
| GitHub Contents API (save) | /api/flows (Cosmos) | Feature flag: `USE_COSMOS_STORAGE=true` per project |
| Direct LLM calls (client) | /api/chat (proxy) | Already have Azure Functions chat-proxy; make default |
| Client-side diagram parse | /api/diagrams/parse | Keep client-side for instant preview; server for persistence |
| Static towerRegistry.ts | /api/projects/{id}/towers | Dynamic load from Cosmos; static as fallback |

### Step 3: Cutover Checklist

- [ ] All secrets in Azure Key Vault (zero client-side keys)
- [ ] Entra ID login working (test with 3+ users)
- [ ] RBAC enforced (Viewer cannot edit)
- [ ] Cosmos DB populated (migrated from GitHub)
- [ ] Health checks all green
- [ ] n8n running (at least Smartsheet + JIRA sync)
- [ ] Admin page accessible (ADA.Admin role)
- [ ] Mermaid render tests passing in CI
- [ ] Error boundaries tested (kill LLM → verify graceful message)
- [ ] Performance baseline established (< 3s page load, < 5s LLM response)

---

## 12. Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Intel Azure policy blocks resources | HIGH | HIGH | Use personal Azure (demo) → request Intel tenant exception with architecture approval |
| Mermaid breaking change | MEDIUM | MEDIUM | Pin version, CI render tests, quarterly review |
| Cosmos DB cost at scale | LOW | MEDIUM | Start with serverless tier (pay-per-request); monitor RU/s |
| n8n maintenance burden | MEDIUM | LOW | Container with auto-restart; consider Azure Logic Apps as alternative |
| Multi-project data isolation | MEDIUM | HIGH | Partition key = projectId in Cosmos; row-level security in API |
| Team adoption resistance | MEDIUM | HIGH | Start with IAO (proven), expand by invitation; demonstrate value first |

---

## 13. Recommended Next Steps (Priority Order)

1. **Pin Mermaid** — `npm install mermaid@11.14.0 --save-exact` + add CI render test (1 day)
2. **Merge repos** — Create ADO monorepo structure, set up Azure SWA (1 week)
3. **Entra ID** — Configure SWA auth + define roles in Entra portal (2 days)
4. **Admin page skeleton** — Health dashboard + user list (1 week)
5. **Cosmos DB** — Provision + create schema + migrate context-index (1 week)
6. **Multi-project model** — Project config API + dynamic tower registry (2 weeks)
7. **n8n deploy** — Azure container + first 3 workflows (1 week)
8. **Connector framework** — Abstract MCP servers into Azure Functions (2 weeks)
9. **Observability** — App Insights + structured logging + circuit breakers (1 week)
10. **Load test** — Verify 50 users / 10 projects / 5000 flows (3 days)

---

## 14. Cost Estimate (Azure — Monthly)

| Resource | Tier | Estimated Cost |
|----------|------|---------------|
| Azure SWA | Standard | $9/mo |
| Azure Functions | Flex Consumption | $0-20/mo (pay-per-execution) |
| Cosmos DB | Serverless | $5-50/mo (depends on RU/s) |
| Azure Key Vault | Standard | $0.03/10K operations |
| Azure OpenAI (gpt-5.4-mini) | Pay-as-you-go | $10-50/mo (depends on usage) |
| n8n (Container Instance) | 1 vCPU / 2 GB | ~$35/mo |
| Application Insights | First 5 GB free | $0-10/mo |
| **Total (estimated)** | | **$60-175/mo** |

---

<details>
<summary>View the Prompt Used</summary>

```markdown
we need to create an inventory of all the functions that get executed within each repo and have a plan to monitor these to ensure that if this has to be production grade, we will need to know all the packages, their status, execution of core functions, graceful failure, where n8n can help with certain workflows, have an admin page - these can happen when the two repos are merged together in Azure static web apps, we also need to package mermaid so that there are no breakages and create an admin page based on entra id login, rbac and system specific roles to manage. We need a plan to make this whole app function at a project specific level and not just for IAO, will need to plan how this can be achieved, meaning, even smaller initiatives should be trackable while they might not have smartsheet or jira, we should give the teams the ability to maintain it manually and then look for MCP or API connections if they do not exist.
```

</details>
