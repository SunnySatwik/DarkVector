# DarkVector — Architecture

> Software engineering reference for contributors and interviewers.

---

## High-Level Architecture

```
                          ┌─────────────────────────────────────────────────────────┐
                          │                        BROWSER CLIENT                   │
                          │                                                         │
                          │  ┌─────────────┐  ┌──────────────────┐  ┌─────────────┐  │
                          │  │  Dashboard  │  │  Investigations  │  │WorkspaceView│  │
                          │  │ (alertGen)  │  │  (useInvest-     │  │ (AiAnalyst  │  │
                          │  └─────────────┘  │   igations hook) │  │  Panel)     │  │
                          │                   └──────────────────┘  └─────────────┘  │
                          │  ┌───────────────────────────────────────────────────┐  │
                          │  │              TanStack React Query Cache           │  │
                          │  └───────────────────────────────────────────────────┘  │
                          └────────────────────────────┬────────────────────────────┘
                                                       │ Axios / Fetch HTTP/JSON
                                                       │
  ┌────────────────────────────────────────────────────▼────────────────────────────────────────────────────┐
  │                                             FASTAPI BACKEND                                             │
  │                                                                                                         │
  │  POST /api/v1/analyze                               POST /api/v1/telemetry                              │
  │  ├── InferenceService.analyze()                     ├── TelemetryIngestionService.ingest()              │
  │  │   ├── FeatureMapper.from_alert()                 │   └── TelemetryBus.publish()                      │
  │  │   ├── preprocessor.transform()                   │       ├── Write to TelemetryEvent table           │
  │  │   ├── IsolationForest.decision_function()        │       └── EndpointRepository.create_or_update()   │
  │  │   ├── RiskScorer & SHAP Explainer                │                                                   │
  │  │   └── ContextService.enrich()                    │  GET /api/v1/investigations                       │
  │  └── AI Context Engine                              │  PATCH /api/v1/investigations/{id}/status         │
  └────────────────────────────┬────────────────────────────────────────────────────────────────────────────┘
                               │
            ┌──────────────────┼──────────────────┐
     ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐
     │ PostgreSQL  │    │ Model Files │    │     RAG     │
     │  Database   │    │  (.joblib)  │    │  Foundation │
     │             │    │             │    │ (Local files│
     │  Alerts &   │    │  isolation_ │    │  retrieval, │
     │  Timeline   │    │  forest     │    │  caching &  │
     │ Telemetry   │    │  preproc    │    │  authority  │
     │ EndpointAg  │    └─────────────┘    │   ranking)  │
     └─────────────┘                       └─────────────┘
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
├── AiAnalystPanel.tsx        (redesigned slide-over with sticky current assessment, modular layout cards, collapsible accordion panels)
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
API Layer (FastAPI routes: analyze.py, telemetry.py)
    ↓
Service Layer (business logic: llm/, telemetry/)
    ↓
Repository Layer (database queries: endpoint_repository.py, etc.)
    ↓
ORM Models (SQLAlchemy: telemetry.py, endpoint_agent.py, etc.)
    ↓
PostgreSQL / SQLite Database
```

**API Layer** (`app/api/v1/`) — FastAPI route handlers. Each route is thin: it validates input via Pydantic, checks auth/API keys, delegates to the service layer, and serialises the response.

**Service Layer** (`app/services/`) — Contains all business logic. No direct DB queries. Services receive `Session` as a dependency.
- `app/services/llm/`: Houses the AI Context Engine pipeline, prompt builders, intent classifier/router, and local RAG retrieval.
- `app/services/telemetry/`: Houses the Telemetry Ingestion Service and Telemetry Bus.

**Repository Layer** (`app/repositories/` & `app/services/telemetry/`) — Isolated DB query functions. `EndpointRepository` and others encapsulate all SQLAlchemy queries.

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

In addition to the core `investigations` and `investigation_timeline` tables, the schema incorporates telemetry collection:

### `telemetry_events` table

Tracks every incoming telemetry event published through the Telemetry Bus.

| Column | Type | Notes |
|---|---|---|
| `id` | VARCHAR | Primary key (UUID4 string) |
| `host_id` | VARCHAR | Stable, deterministic host identifier (indexed) |
| `hostname` | VARCHAR | Hostname of the target endpoint |
| `timestamp` | DATETIME | ISO-8601 creation timestamp |
| `event_type` | VARCHAR | Event classification (e.g. `heartbeat`) |
| `severity` | VARCHAR | Severity rating |
| `source` | VARCHAR | Component origin |
| `payload` | JSON | Arbitrary raw event payload |
| `created_at` | DATETIME | Ingestion timestamp |

### `endpoint_agents` table

Maintains the active inventory and status of all registered endpoint agents.

| Column | Type | Notes |
|---|---|---|
| `id` | VARCHAR | Primary key (UUID4 string) |
| `host_id` | VARCHAR | Unique, indexed stable host identifier |
| `hostname` | VARCHAR | Current reported hostname |
| `agent_version`| VARCHAR | Sent version of the agent |
| `os` | VARCHAR | Operating system family |
| `architecture` | VARCHAR | CPU architecture |
| `ip_address` | VARCHAR | Last reported primary IP |
| `status` | VARCHAR | Agent status (e.g., `connected`, `offline`) |
| `last_seen` | DATETIME | Ingestion time of the last received heartbeat |
| `created_at` | DATETIME | Registration timestamp |
| `updated_at` | DATETIME | Auto-updated on every heartbeat ingestion |

---

## AI Context Engine Pipeline

All AI context building, prompt routing, and output validation are modularized underneath a multi-stage architecture:

```
Context Builder ──> Knowledge Pack V2 ──> Intent Classifier ──> Prompt Router
                                                                    │
                                                                    ▼
Fallback AI <── Response Validator V2 <── Citations <── Gemini <── Builders
```

### Pipeline Components

1. **Context Builder**: Gathers raw alert details, memory parameters, history logs, SHAP factors, threat intel, and timeline lists into a unified dictionary.
2. **Knowledge Pack V2**: Transforms the context dump into a coherent natural-language briefing optimized for Gemini reasoning. Sections include:
   - *Investigation Overview*
   - *Alert Analysis*
   - *Attack Assessment*
   - *Evidence Summary*
   - *Timeline*
   - *Conversation History*
3. **Intent Classifier**: Inspects query keywords to classify user intent (General, Explain Attack, Risk Analysis, Remediation, MITRE, Timeline, Evidence) avoiding unnecessary LLM calls.
4. **Prompt Router**: Dispatches requests to the appropriate Specialized Prompt Builder based on the intent.
5. **Specialized Prompt Builders**: Classes implementing a modular inheritance tree (`BasePromptBuilder` -> `GeneralPromptBuilder`, `ExplainAttackPromptBuilder`, `RiskAnalysisPromptBuilder`, `RemediationPromptBuilder`, `MitrePromptBuilder`, `TimelinePromptBuilder`, `EvidencePromptBuilder`). Every child builder only overrides its specific `system_instruction` property, keeping the prompt template and core formatting code shared in `BasePromptBuilder`.
6. **Gemini**: Submits the generated system instructions and user message to the Gemini API.
7. **Evidence Citations**: Generates deterministic citations from the raw context elements (MITRE, Threat Intel, SHAP, Timeline, Memory) to ensure every citation represents a real fact, preventing AI hallucinations.
8. **Response Validator V2**: Inspects response structure and semantic correctness. It:
   - Rejects responses with generic fallback filler (e.g., "As an AI language model", "I don't have enough context").
   - Validates context consistency (severity values, technique IDs, and investigation ID references must match the Knowledge Pack).
9. **Fallback AI**: A deterministic fallback layer that answers the user if the primary model fails or validation fails, preventing service outages.

---

## RAG (Retrieval-Augmented Generation) Foundation

The retrieval system is designed for clean, decoupled extensibility. Markdown knowledge documents are stored locally in category directories:
- `mitre/`
- `playbooks/`
- `cis/`
- `owasp/`
- `procedures/`

### Retrieval Mechanism
- **MarkdownLoader & Parser**: Parses YAML front matter metadata from documents (`id`, `title`, `category`, `tags`, `summary`, `authority`) to hydrate a structured `KnowledgeDocument` object.
- **In-Memory Cache**: The loader caches parsed documents in-memory to prevent repeated filesystem reads.
- **KnowledgeRegistry**: Maps every `PromptRoute` to a `RetrievalProfile` specifying category mappings, document limit caps, and routing priorities.
- **KnowledgeRetriever**: Loads documents, ranks them by authority level (`official` > `internal` > `community`), enforces document limit caps, and returns them to the prompt builders.
- **ChromaDB / Vector Search Compatibility**: Vector databases and embeddings are **not** implemented in this stage. However, the retrieval layer is structurally isolated; the `KnowledgeRetriever` receives an optional `query` parameter so that when semantic retrieval is integrated, only the retriever implementation needs to change.

---

## Telemetry Foundation

To enable EDR functionality, DarkVector introduces a scalable telemetry ingestion pipeline.

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   DV Sentinel   │ ───>  │  FastAPI Router │ ───>  │  Telemetry Bus  │
│  Endpoint Agent │       │  /api/v1/telem  │       │   (Publisher)   │
└─────────────────┘       └─────────────────┘       └────────┬────────┘
                                                             │
                                     ┌───────────────────────┴───────────────────────┐
                                     ▼                                               ▼
                           ┌───────────────────┐                           ┌───────────────────┐
                           │ Telemetry Event   │                           │    Endpoint       │
                           │  Database Table   │                           │  Agent Inventory  │
                           └───────────────────┘                           └───────────────────┘
```

### Components

- **DV Sentinel**: A cross-platform Python endpoint agent. It runs a background heartbeat daemon that gathers system vitals (hostname, OS, architecture, CPU%, memory%, uptime, IP address) and uploads them.
- **APITransport**: The HTTP client within the agent utilizing `httpx` with Bearer API Key auth and exponential back-off retries.
- **FastAPI Telemetry API**: Handled in `api/v1/telemetry.py`. Ingests events and validates requests using the configured API Key.
- **Telemetry Bus**: The internal event bus that routes events to their targets. Currently writes the event to database storage and updates the endpoint inventory.
- **Endpoint Inventory**: The `EndpointRepository` manages the `endpoint_agents` records. Every heartbeat ingestion updates the host metadata, last-seen time, and status (`connected`).

---

## Honest Assessment: What Is Real vs. Mock

| Aspect | Honest Status |
|---|---|
| ML model (Isolation Forest) | **Real** — trained on KDD Cup 99, inference on every alert |
| SHAP explainability | **Real** — exact Shapley values from TreeExplainer |
| AI Context Engine | **Real** — multi-stage pipeline, narrative Knowledge Pack V2, specialized prompt builders, evidence citations, semantic validator checks, fallback AI |
| Telemetry Ingestion | **Real** — DV Sentinel agent daemon, API keys, HTTP retry transport, telemetry database table |
| Endpoint Inventory | **Real** — live agent updates, hostname, OS, IP address, architecture, and last-seen tracking |
| RAG Retrieval | **Real** filesystem parser, metadata YAML mapping, and authority ranking. **Mock** vector search/semantic embeddings. |
| Dashboard alert list | **Mock** — `MOCK_ALERTS` hardcoded in `mockData.ts` |
| Dashboard metrics (threat level, isolation count) | **Mock** — static numbers in `MOCK_METRICS` |
| World attack map | **Mock** — `MOCK_WORLD_ATTACKS` with hardcoded coordinates |
| User risk table | **Mock** — `MOCK_USER_RISKS` with hardcoded scores |

---

## Future Scalability

| Concern | Current State | Recommended Approach |
|---|---|---|
| Real-time alerts | Poll or manual trigger | WebSocket / SSE event stream |
| Multi-user | Single analyst | JWT auth + investigation assignment |
| Telemetry Volume | SQLite / Postgres write | Message Queue (RabbitMQ/Kafka) + async task workers |
| Stream Telemetry | Heartbeat only | Process, registry, file, and socket hooks |
| Detection Engine | Static ML | Sigma rules engines + YARA scanner |
| Threat Intelligence | Hardcoded lists | Live API queries (VirusTotal, AbuseIPDB) |
