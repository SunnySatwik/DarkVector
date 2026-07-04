# DarkVector — Architecture

> Software engineering reference for contributors and interviewers.

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        BROWSER CLIENT                                 │
│                                                                        │
│  ┌─────────────┐  ┌──────────────────┐  ┌─────────────────────────┐  │
│  │  Dashboard  │  │  Investigations  │  │   Investigation         │  │
│  │  (mockData  │  │  (useInvest-     │  │   Workspace             │  │
│  │  + live inv)│  │   igations hook) │  │   (useAnalysis +        │  │
│  └─────────────┘  └──────────────────┘  │    useInvestigations)   │  │
│                                          └─────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │              TanStack React Query Cache                          │  │
│  │   Keys: "investigations" | ["investigation", id] | ["timeline", id] │
│  └─────────────────────────────────────────────────────────────────┘  │
│                              │ Axios (baseURL: localhost:8000/api/v1)  │
└──────────────────────────────┼──────────────────────────────────────-─┘
                               │ HTTP/JSON
┌──────────────────────────────▼───────────────────────────────────────┐
│                         FASTAPI BACKEND                               │
│                                                                        │
│  POST /analyze/                                                        │
│  ├── InferenceService.analyze()                                       │
│  │   ├── FeatureMapper.from_alert()     → 41 KDD features             │
│  │   ├── preprocessor.transform()       → scaled + encoded            │
│  │   ├── IsolationForest.decision_function() → raw score              │
│  │   ├── RiskScorer.from_score()        → calibrated risk             │
│  │   ├── SHAP.TreeExplainer.shap_values() → feature attributions      │
│  │   └── ContextService.enrich()        → MITRE + ThreatIntel         │
│  └── InvestigationService.create_from_analysis() → DB write           │
│                                                                        │
│  GET  /investigations/           → InvestigationService.list()        │
│  GET  /investigations/{id}       → InvestigationService.get()         │
│  GET  /investigations/{id}/timeline → TimelineService.get_timeline()  │
│  PATCH /investigations/{id}/status  → InvestigationService.update()   │
└──────────────────────────────┬────────────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
   ┌──────▼──────┐    ┌────────▼──────┐   ┌────────▼────────┐
   │  PostgreSQL  │    │  Model Files  │   │  Context Rules  │
   │  (SQLAlchemy │    │ (joblib artefacts) │  (mitre_mapping │
   │   2.0 ORM)  │    │               │   │  threat_intel)  │
   │             │    │ isolation_    │   │  — no DB, pure  │
   │ investigations│   │  forest.joblib│   │    Python dicts │
   │ investigation│   │ preprocessor. │   └─────────────────┘
   │  _timeline  │    │  joblib       │
   └─────────────┘    │ model_meta-   │
                      │  data.json    │
                      └───────────────┘
```

---

## Frontend Architecture

### Routing

DarkVector uses a **single-page, state-machine router** implemented entirely in `App.tsx`. There is no React Router. Navigation between pages is controlled by the `activeTab` string state variable.

```
activeTab values:
  "dashboard"       → Dashboard.tsx
  "investigations"  → Investigations.tsx
  "graph"           → ThreatGraph.tsx
  "reports"         → Reports.tsx
  "models"          → Models.tsx

Override views (take precedence over activeTab):
  activeWorkspaceAlert !== null  → InvestigationWorkspace.tsx
  activeInvestigationId !== null → SavedInvestigationWorkspace.tsx
  activeReportId !== null        → InvestigationReportView.tsx
```

### Component Hierarchy

```
App.tsx
├── AppLayout.tsx
│   ├── Sidebar.tsx           (navigation + static workspace label)
│   └── TopNav.tsx            (search bar + theme toggle)
│
├── [activeReportId]
│   └── InvestigationReportView.tsx
│       ├── useInvestigation(id)
│       └── useTimeline(id)
│
├── [activeInvestigationId]
│   └── SavedInvestigationWorkspace.tsx
│       └── WorkspaceView.tsx (same as live workspace, data from API)
│
├── [activeWorkspaceAlert]
│   └── InvestigationWorkspace.tsx
│       ├── useAnalysis()              (mutation: POST /analyze)
│       ├── useInvestigations()        (to find matching investigation_id)
│       ├── useUpdateInvestigationStatus()
│       └── WorkspaceView.tsx
│           ├── VectorPanel.tsx        (AI reasoning, isolation)
│           ├── TimelinePanel.tsx      (useTimeline hook)
│           ├── ProcessTree.tsx        (static from alert details)
│           └── EventTimeline.tsx      (static from alert details)
│
├── Dashboard.tsx             (useAlerts + useInvestigations)
├── Investigations.tsx        (useInvestigations + investigationMapper)
├── ThreatGraph.tsx           (useInvestigations + useInvestigation)
├── Reports.tsx               (useInvestigations)
├── Models.tsx                (static informational content)
│
├── AiAnalystPanel.tsx        (slide-over, managed by App.tsx state)
└── CommandPalette.tsx        (⌘K overlay, managed by App.tsx state)
```

### Design System

The design system lives in `components/ui/DesignSystem.tsx` and exports:
- `Card` — rounded dark surface container
- `Badge` — severity/status label with variants: `critical`, `high`, `medium`, `low`, `success`, `default`
- `Button` — primary/ghost/destructive variants
- `Skeleton` — loading placeholder
- `PageHeader` — standardised page title + subtitle
- `PanelHeader` — section header with icon

**Design tokens** are defined in `index.css` using CSS custom properties:
```css
:root {
  --bg-color: #090b11;
  --surface-color: #11141b;
  --elevated-color: #171c26;
  --border-custom-color: #232833;
}

:root.light {
  --bg-color: #f8fafc;
  --surface-color: #ffffff;
  ...
}
```

These are exposed to Tailwind v4 via `@theme { --color-bg: var(--bg-color); }`.

---

## Backend Architecture

### Layered Architecture

```
API Layer (FastAPI routes)
    ↓
Service Layer (business logic)
    ↓
Repository Layer (database queries)
    ↓
ORM Models (SQLAlchemy)
    ↓
PostgreSQL
```

**API Layer** (`app/api/v1/`) — FastAPI route handlers. Each route is thin: it validates input via Pydantic, delegates to the service layer, and serialises the response.

**Service Layer** (`app/services/`) — Contains all business logic. No direct DB queries. Services receive `Session` as a dependency.

**Repository Layer** (`app/repositories/`) — Isolated DB query functions. `InvestigationRepository` and `TimelineRepository` encapsulate all SQLAlchemy queries.

**ORM Models** (`app/models/`) — SQLAlchemy `DeclarativeBase` models with typed `Mapped` columns.

### Dependency Injection

The database session is provided via `Depends(get_db)` in every route:

```python
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

---

## Database Schema

### `investigations` table

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER | Internal auto-increment primary key |
| `investigation_id` | VARCHAR(50) | Public ID, format: `INV-YYMMDD-XXXXXX` |
| `alert_id` | VARCHAR(64) | Source alert ID (idempotency key) |
| `title` | VARCHAR(255) | Alert type string |
| `status` | ENUM | `NEW`, `INVESTIGATING`, `CONTAINED`, `RESOLVED`, `FALSE_POSITIVE` |
| `severity` | ENUM | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `risk_score` | FLOAT | Calibrated risk score 0–100 |
| `confidence` | FLOAT | Nullable; `min(risk_score/100 + 0.20, 0.99)` |
| `summary` | TEXT | Plain-text AI summary |
| `alert_json` | JSON | Full original alert payload |
| `analysis_json` | JSON | Full analysis response including context |
| `created_at` | TIMESTAMP TZ | Auto-set |
| `updated_at` | TIMESTAMP TZ | Auto-updated on status change |

### `investigation_timeline` table

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Auto-generated primary key |
| `investigation_id` | VARCHAR | FK → `investigations.investigation_id` |
| `timestamp` | TIMESTAMP TZ | Auto-set on creation |
| `actor` | ENUM | `system`, `ai`, `analyst` |
| `event_type` | ENUM | `alert_created`, `analysis_completed`, `status_changed`, etc. |
| `title` | VARCHAR(150) | Short event title |
| `description` | TEXT | Human-readable event description |

**Relationship:** `Investigation.timeline` → ordered `TimelineEvent` list (cascade delete-orphan).

---

## React Query Data Flow

React Query is the only client-side state management layer for server data. The `QueryClient` is configured in `lib/queryClient.ts`.

### Query Keys

| Key | Data | Staletime |
|---|---|---|
| `["investigations"]` | List of all investigations | 30 seconds |
| `["investigation", id]` | Full detail (alert + analysis + investigation) | `Infinity` (never re-fetches unless invalidated) |
| `["timeline", id]` | Timeline events for investigation | 10 seconds |

### Mutation Flow: Alert Analysis

```
useAnalysis hook
   → mutation.mutate(alert)
   → POST /api/v1/analyze
   → Returns AnalysisResponse
   → InvestigationWorkspace updates displayAlert
   → Calls onAnalysisReady(alert, analysisData) → feeds AiAnalystPanel
```

### Mutation Flow: Status Update

```
useUpdateInvestigationStatus hook
   → mutation.mutate(status)
   → PATCH /api/v1/investigations/{id}/status
   → onSuccess:
       queryClient.invalidateQueries(["investigation", id])
       queryClient.invalidateQueries(["timeline", id])
       queryClient.invalidateQueries(["investigations"])
```

Invalidating all three keys causes React Query to immediately refetch the investigation detail, the timeline, and the investigations list — ensuring all views reflect the updated status and new timeline event simultaneously.

---

## Investigation Lifecycle

```
[NEW]
  ↓  (manual: PATCH /status {"status": "INVESTIGATING"})
  ↓  — OR —  (automatic: on Workspace open, analyst updates)
[INVESTIGATING]
  ↓  (automatic: handleIsolate() completes in InvestigationWorkspace.tsx)
[CONTAINED]
  ↓  (manual: PATCH /status {"status": "RESOLVED"})
[RESOLVED]

Alternative path:
[INVESTIGATING] → [FALSE_POSITIVE] (manual)
```

**Status transition rules:**
- `InvestigationService.update_status()` checks `if investigation.status != status` to prevent duplicate timeline events when the same status is set twice.
- Host isolation in the frontend triggers `updateStatusMutation.mutate("CONTAINED")` when the 5-step progress bar completes.

---

## Timeline Generation

Timeline events are always created through `TimelineService.add_event()`, which delegates to `TimelineRepository.create()`.

**Automatic events created by the backend:**

| When | Event Type | Actor | Title |
|---|---|---|---|
| POST /analyze succeeds | `alert_created` | system | "Alert received" |
| POST /analyze succeeds | `analysis_completed` | ai | "AI analysis completed" |
| PATCH /status called with new value | `status_changed` | analyst | "Status changed" |

**Note:** The `InvestigationService.create_from_analysis()` checks for an existing investigation by `alert_id` before creating a new one. If the same alert is re-analyzed, the existing investigation is returned and no duplicate timeline events are created.

---

## Context Enrichment

`ContextService.enrich(alert)` is called inside `InferenceService.analyze()` immediately after the ML analysis completes. It calls both lookup functions and combines the results:

```python
def enrich(alert: dict) -> dict:
    return {
        "mitre": mitre_mapping.lookup(alert),
        "threat_intelligence": threat_intelligence.lookup(alert),
    }
```

The result is serialised into `analysis_json` on the Investigation model, so it is available from `GET /investigations/{id}` without re-computing.

### MITRE Mapping — Why Deterministic?

Each alert type string (e.g., `"Unusual Namespace Creation & Exec"`) is controlled by the frontend's `EVENT_PROFILES` list. The backend MITRE rules are written to cover every alert type in that list. This creates a closed, predictable mapping:

- Alert type `"Unusual Namespace Creation & Exec"` → contains "namespace" → T1611 Escape to Host
- Alert type `"Active Directory Kerberoasting Query"` → contains "kerberoast" → T1558.003

This approach is intentional: it guarantees every investigation has actionable MITRE context without requiring an external API or LLM.

### Threat Intelligence — IP Classification

The IP classification uses hardcoded prefix lists calibrated to match the mock alert data:

- Alert AL-8491 uses IP `194.26.135.84` → matches `194.26.*` → **malicious**
- Alert AL-7982 uses IP `80.241.128.9` → matches `80.241.*` → **suspicious** (VPN)
- Alert AL-8310 uses IP `10.240.4.19` → RFC-1918 → **clean** → falls through to hostname

This means every demo alert produces the expected, realistic threat intel classification.

---

## ML Inference Pipeline

### Overview

```
Alert (dict)
   ↓
FeatureMapper.from_alert()
   → 41-feature KDD dict (category-specific field overrides)
   ↓
pd.DataFrame([kdd_event])
   ↓
preprocessor.transform()        (ColumnTransformer: OHE + StandardScaler)
   ↓
pd.DataFrame(processed, columns=feature_names_out)
   ↓
IsolationForest.decision_function()
   → raw_score (float, negative = more anomalous)
   ↓
RiskScorer.from_score(raw_score)
   → RiskAssessment(risk_score, severity, is_anomaly)
   ↓
SHAP.TreeExplainer.shap_values(features)
   → top-5 FeatureContribution objects
```

### Feature Mapper

`FeatureMapper.from_alert()` bridges the semantic gap between a security domain alert and the 41-column KDD Cup 99 network connection schema expected by the Isolation Forest model.

It starts from a baseline of "normal" KDD values and overrides specific fields based on the alert's `category`:

| Alert Category | Key Overrides |
|---|---|
| `process` | `service=private`, `logged_in=0`, for privilege escalation: `root_shell=1`, `su_attempted=1`, `hot=3` |
| `network` | `src_bytes=bytesTransferred`, `count=250`, `diff_srv_rate=0.95` |
| `authentication` | `service=login`, `logged_in=0`, for brute force: `num_failed_logins=5` |
| `system` | `root_shell=1`, `num_compromised=1` |

### Risk Scorer

`RiskScorer` uses percentile thresholds from `model_metadata.json` (computed during training) to convert raw Isolation Forest scores into a discrete risk scale:

| Raw Score Range | Calibrated Risk | Severity |
|---|---|---|
| ≤ p1 (1st percentile) | 100 | Critical |
| ≤ p5 | 95 | Critical |
| ≤ p10 | 90 | Critical |
| ≤ p25 | 75 | High |
| ≤ median | 50 | Medium |
| ≤ p75 | 25 | Low |
| > p75 | 10 | Informational |

**Anomaly threshold:** `risk_score >= 75` → `is_anomaly = True`

### SHAP Explainer

`Explainer` uses `shap.TreeExplainer(model)` which supports Isolation Forest directly. For each incoming feature vector:

1. Compute SHAP values for all 41 features
2. Sort by absolute SHAP magnitude (descending)
3. Return the top 5 as `FeatureContribution` objects with `direction` ("increase"/"decrease")

**Important:** SHAP values here explain why the Isolation Forest considered this point anomalous — large positive SHAP values for a feature mean that feature strongly pushed toward anomalous classification.

### Confidence Score

Confidence is a heuristic (not calibrated probabilistic output):

```python
confidence = min(risk_score / 100 + 0.20, 0.99)
```

This means a risk score of 75 → confidence 0.95, risk score 100 → confidence 0.99. The comment in the source code notes this is "temporary until calibrated confidence".

---

## Isolation Forest — How It Works

Isolation Forest is an anomaly detection algorithm that works by:

1. Building an ensemble of random binary trees (isolation trees)
2. For each data point, measuring the average path length needed to isolate it
3. Points that are isolated with fewer splits are more anomalous (they are "different" in many feature dimensions simultaneously)

`decision_function()` returns a score where:
- **Negative values** = anomalous (takes fewer splits to isolate)
- **Positive values** = normal (requires many splits)

DarkVector's `RiskScorer` inverts and calibrates this into a 0–100 scale using training set percentile thresholds.

---

## Evidence Graph Generation

`ThreatGraph.tsx`'s `buildGraphData(alert, context)` function constructs the SVG graph entirely from live investigation data:

```
alert.source                   → Source node (type: database if "db-", else pod)
alert.details.username         → User node (if present)
alert.details.parentProcess    → Parent process node (if present)
alert.details.processPath      → Process/binary node (if present, severity: critical)
alert.details.ipAddress        → Remote IP node
  context.threat_intelligence.reputation
    → "malicious" → severity: critical
    → "suspicious" → severity: high
    → other → severity: none
```

Edges are:
- `source → user` (non-threat)
- `source → parent-process` (non-threat)
- `parent-process → process` (threat — red edge)
- `process → remote-ip` (threat — red edge)

**Fallback:** If `activeInvestigationId` is not passed (e.g., navigating directly to Evidence Graph without an open investigation), the page calls `useInvestigations()`, takes `investigations[0]`, and loads that investigation's detail.

---

## Report Generation

`InvestigationReportView.tsx` is a purely read-only page. It calls:
1. `useInvestigation(investigationId)` → `GET /investigations/{id}` → returns `{ investigation, alert, analysis }`
2. `useTimeline(investigationId)` → `GET /investigations/{id}/timeline`

The entire alert payload and analysis response are stored as JSON columns in the `investigations` table. This means the report does not require re-running any ML models — all data is served from the database exactly as it was at the time of the original analysis.

---

## Design Decisions

### Why deterministic MITRE mapping instead of an LLM?

LLM API calls introduce latency, cost, non-determinism, and external dependencies. The alert types are a controlled vocabulary — the `EVENT_PROFILES` list defines every possible alert type. Keyword-based lookup is:
- **Instant** (microseconds vs. seconds)
- **100% consistent** (same alert always produces same mapping)
- **No API key required** (important for an offline SOC demo)

### Why store `alert_json` and `analysis_json` as JSON columns?

This is a deliberate denormalisation for two reasons:
1. The alert schema can evolve without database migrations
2. `GET /investigations/{id}` can reconstruct the full workspace and report view from a single query — no joins, no re-analysis

### Why TanStack React Query instead of Zustand or Redux?

Server state and client state have different management requirements. React Query handles caching, invalidation, background refetching, and loading/error states for server data. App.tsx manages all UI state (open tabs, active alert, etc.) with plain `useState`. This avoids the complexity of a global store for what is fundamentally a server-centric application.

### Why inline SVG for the Evidence Graph instead of a library like D3 or Cytoscape?

The graph has at most 5 nodes and 4 edges in any investigation. A full graph library would add 200–500 KB to the bundle for functionality that a purpose-built SVG renderer handles in ~100 lines. Node positions are manually assigned per role (source at x:100, process at x:430, remote-ip at x:610), which is sufficient for a fixed-topology graph.

---

## Future Scalability

| Concern | Current State | Recommended Approach |
|---|---|---|
| Real-time alerts | Poll or manual trigger | WebSocket / SSE event stream |
| Multi-user | Single analyst | JWT auth + investigation assignment |
| Alert volume | In-memory analysis | Message queue (Redis/Kafka) + async workers |
| DB migrations | Manual `init_db()` | Alembic with version-controlled migration scripts |
| Model updates | Replace `.joblib` files | MLflow model registry + A/B deployment |
| Context enrichment | Static lookup tables | MITRE ATT&CK STIX API + VirusTotal integration |
| Reporting | Browser print | Server-side PDF via WeasyPrint or Puppeteer |
| Frontend routing | State machine in App.tsx | React Router v7 for shareable URLs |
