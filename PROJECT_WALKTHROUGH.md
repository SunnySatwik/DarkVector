# DarkVector — Project Walkthrough

> A system-level guide to how DarkVector works, why it was built this way, and how investigations and telemetry flow through the stack.

---

## 1. The Problem

Security Operations Centers process thousands of alerts per day. Most are noise. A few are real incidents. The analyst's job is to decide which are which — quickly, accurately, and with enough evidence to justify containment actions.

The core problem with most SOC platforms is that they show you **what** (this IP sent traffic to port 443) but not **why it matters** (this process tree, combined with this IP reputation and this MITRE technique, matches a known exfiltration pattern).

DarkVector was designed to collapse the analyst's decision loop. Every alert that enters the system automatically receives:
- A machine learning anomaly score
- An explainability breakdown (which features drove the score)
- A MITRE ATT&CK classification (what kind of attack this matches)
- Threat intelligence (what we know about the source)
- An AI-validated context analysis from our AI Context Engine
- An auditable investigation with a lifecycle

An analyst should be able to open DarkVector, see the prioritised investigation, understand the threat, review the AI analyst's context, and act — in under 60 seconds.

---

## 2. System Components at a Glance

| Component | What it does | Live or Mock? |
|---|---|---|
| Isolation Forest model | Scores each alert for anomaly probability | **Live** — scikit-learn model, trained on KDD Cup 99 |
| SHAP explainer | Explains which features drove the score | **Live** — SHAP `TreeExplainer` |
| MITRE mapping | Maps alert type to ATT&CK technique | **Live** — deterministic keyword lookup |
| Threat intelligence | Classifies IP and hostname reputation | **Live** — deterministic prefix + pattern matching |
| Investigation creation | Creates DB record with full lifecycle | **Live** — PostgreSQL/SQLite via SQLAlchemy |
| Timeline | Audit trail for every investigation | **Live** — auto-created on analysis and status change |
| AI Context Engine | Multi-stage prompt construction, validation, and citation pipeline | **Live** — Context Builder, Prompt Router, Citations, Validator, Gemini 2.5 |
| RAG Foundation | File retrieval and metadata sorting | **Live** — loads local MD files, metadata caching, and authority-based sorting |
| Telemetry Ingestion | Ingests host vitals, updates agent status | **Live** — DV Sentinel background daemon and API endpoints |
| Alert feed (Dashboard) | Top-priority alerts shown | **Mock** — `MOCK_ALERTS` from `mockData.ts` |
| Dashboard metrics | Global threat level, isolation counts | **Mock** — `MOCK_METRICS` from `mockData.ts` |
| World attack map | SVG arrows between geographic locations | **Mock** — `MOCK_WORLD_ATTACKS` from `mockData.ts` |
| Risk score sparklines | Mini trend charts on Dashboard | **Mock** — static arrays in `MOCK_METRICS` |
| User risk scores | Risky user table on Dashboard | **Mock** — `MOCK_USER_RISKS` from `mockData.ts` |
| Models page | ML model parameters display | **Informational** — static text, no live model queries |

---

## 3. End-to-End Walkthroughs

### Walkthrough A — The Investigation Lifecycle

#### Step 1 — Alert Ingestion

On the Dashboard, the analyst sees a list of high-priority alerts. These are currently served from `MOCK_ALERTS` in `mockData.ts`. Each alert has:
- An `id` (e.g., `AL-8491`)
- A `source` (hostname or email)
- A `type` (human-readable attack description)
- A `category`: `process` | `network` | `authentication` | `system`
- A `severity` and raw `score`
- `details`: process paths, IPs, command lines, etc.

The "Generate Event" button calls `generateRandomAlert()` from `alertGenerator.ts`, which picks a profile from `EVENT_PROFILES` (a curated list of realistic attack scenarios) and randomises the variable fields.

Either a mock alert or a generated one can be used to open the workspace.

#### Step 2 — ML Analysis

When an analyst clicks an alert, `InvestigationWorkspace.tsx` mounts and immediately fires `mutation.mutate(activeAlert)` — a `POST /api/v1/analyze` request.

**Inside the backend:**
`InferenceService.analyze(alert)` orchestrates the ML pipeline:

- **Feature Mapping**: `FeatureMapper.from_alert(alert)` converts the semantic alert into the 41-column KDD Cup 99 connection schema.
- **Preprocessing**: The raw KDD dict is passed through the `preprocessor` ColumnTransformer (OneHotEncoder + StandardScaler).
- **Isolation Forest Scoring**: `model.decision_function(features)` returns a raw score. Negative values indicate anomalous points.
- **Risk Calibration**: `RiskScorer.from_score(raw_score)` maps the raw score to a discrete risk level (0–100) using training set percentiles.
- **SHAP Explainability**: `SHAP.TreeExplainer.shap_values(features)` computes Shapley values to identify the top 5 contributing features.
- **Context Enrichment**: `ContextService.enrich(alert)` runs deterministic keyword lookups to associate a MITRE ATT&CK technique and threat reputation score.

#### Step 3 — Investigation Persistence

Still within the `POST /analyze` request, `InvestigationService.create_from_analysis(db, alert, analysis)` runs:
1. Checks for an existing investigation for this `alert_id` (idempotency guard).
2. Creates an `Investigation` record with status `NEW`, severity, raw alert, and analysis JSON.
3. Creates two timeline events automatically: `alert_created` (system) and `analysis_completed` (ai).

#### Step 4 — Workspace Renders

`InvestigationWorkspace.tsx` receives the `AnalysisResponse` and updates the workspace view. The analyst reviews:
- **Overview** (`VectorPanel.tsx`): Shows risk score, anomaly metrics, SHAP factors, and the containment panel.
- **Timeline** (`TimelinePanel.tsx`): Loads live timeline events.
- **Process Tree** (`ProcessTree.tsx`): Renders process chains from `alert.details`.

#### Step 5 — Status Management

Dropdown changes on the frontend trigger:
```
PATCH /api/v1/investigations/{investigation_id}/status
Body: { "status": "INVESTIGATING" }
```
`InvestigationService.update_status()` validates the transition, writes it to the database, and adds a `status_changed` event. React Query cache invalidation triggers immediate view refreshes.

#### Step 6 — Host Isolation

The "Isolate Host" button triggers `handleIsolate()`. A progress bar simulates the asynchronous endpoint command. On completion, the status mutation sets the investigation status to `CONTAINED`, writes a status change event, and triggers cache invalidation.

#### Step 7 — Report Generation

Navigating to reports page fires:
- `GET /investigations/{id}` -> returns `{ investigation, alert, analysis }`
- `GET /investigations/{id}/timeline`

All metrics and findings are loaded directly from the database columns `alert_json` and `analysis_json` — no ML models or LLMs are re-run, guaranteeing print reproducibility.

---

### Walkthrough B — AI Context Engine Pipeline

When the analyst opens the AI Panel or types a chat message, the request follows a strict 9-stage pipeline:

```
[User Message] ──> [Context Builder] ──> [Knowledge Pack V2] ──> [Intent Classifier] 
                                                                         │
                                                                         ▼
[Citations] <── [Gemini 2.5] <── [Specialized Prompt Builder] <── [Prompt Router]
     │
     ▼
[Response Validator V2] ──> [Final Answer] (or Fallback AI if failed)
```

1. **Context Builder**: Gathers alert context, memory, timeline, SHAP, and threat intelligence.
2. **Knowledge Pack V2**: Assembles the context into a natural-language briefing optimized for LLM reasoning:
   - *Investigation Overview*: Summarizes the incident context.
   - *Alert Analysis*: Raw metrics and ML parameters.
   - *Attack Assessment*: MITRE mapping and threat intel.
   - *Evidence Summary*: Feature attributions and graph details.
   - *Timeline*: Order of incident progression.
   - *Conversation History*: Relevant dialogue context.
3. **Intent Classifier**: Inspects query keywords to classify user intent (General, Explain Attack, Risk Analysis, Remediation, MITRE, Timeline, Evidence) to avoid redundant LLM latency.
4. **Prompt Router**: Resolves which prompt builder should build the system prompt.
5. **Specialized Prompt Builders**: A modular hierarchy (`BasePromptBuilder` -> specialized child builders) where child builders override the specific `system_instruction` (e.g. `ExplainAttackPromptBuilder` focuses on flow and execution, `RemediationPromptBuilder` focuses on isolation/remediation) while sharing template compilation code.
6. **Gemini 2.5**: Primary model generates response text.
7. **Evidence Citations**: Generates deterministic citations from the actual investigation context (hallucination-free).
8. **Response Validator V2**: Inspects response structure and semantic correctness. It:
   - Rejects responses with generic fallback filler (e.g., "As an AI language model").
   - Validates context consistency (severity values, technique IDs, and investigation ID references must match the Knowledge Pack).
9. **Fallback AI**: If validation fails or Gemini experiences an error, a deterministic fallback system answers the query, ensuring the analyst has uninterrupted assistance.

---

### Walkthrough C — Telemetry Heartbeat Ingestion

To provide continuous monitoring of client endpoints, the Telemetry Foundation executes the following ingestion lifecycle:

```
┌──────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   DV Sentinel    │ ───>  │  FastAPI API    │ ───>  │  Telemetry Bus  │
│ Heartbeat Daemon │       │  POST /telemetry│       │   (Ingest)      │
└──────────────────┘       └─────────────────┘       └────────┬────────┘
                                                              │
                                     ┌────────────────────────┴───────────────────────┐
                                     ▼                                               ▼
                           ┌───────────────────┐                           ┌───────────────────┐
                           │   telemetry_      │                           │  endpoint_agents  │
                           │   events DB       │                           │  Inventory table  │
                           └───────────────────┘                           └───────────────────┘
```

1. **Vitals Collection**: On the monitored host, the `DV Sentinel` daemon runs a `HeartbeatCollector`. It retrieves system statistics: CPU utilisation%, RAM total/used/%, OS details, system architecture, uptime, and primary IP address.
2. **APITransport HTTP POST**: The collector packages the vitals into a normalized `TelemetryEvent` dataclass. The `APITransport` client POSTs the JSON payload to the FastAPI endpoint `/api/v1/telemetry`. If the network fails, it retries with exponential back-off up to 5 times.
3. **API Key Authentication**: The FastAPI route handler verifies the request header `X-API-Key`. If invalid, it returns `401 Unauthorized` immediately; otherwise, it passes the payload to `TelemetryIngestionService`.
4. **Telemetry Ingestion Service**: Forwards the parsed event to the `TelemetryBus` for routing.
5. **Telemetry Bus Processing**:
   - Persists a new record in the `telemetry_events` table containing the host ID, hostname, event type, severity, source, and raw JSON payload.
   - Queries `EndpointRepository` for an existing agent matching `host_id`.
   - **If new host**: Enters a new row in the `endpoint_agents` table setting status to `connected` and saving host vitals.
   - **If existing host**: Updates the hostname, IP, agent version, OS, status (`connected`), and `last_seen` timestamp.

---

## 4. Honest Assessment: What Is Real vs. Mock

| Aspect | Honest Status |
|---|---|
| ML model (Isolation Forest) | **Real** — trained on KDD Cup 99, inference on every alert |
| SHAP explainability | **Real** — exact Shapley values from TreeExplainer |
| AI Context Engine | **Real** — multi-stage pipeline, specialized prompt builders, evidence citations, semantic validator checks, fallback AI |
| Telemetry Ingestion | **Real** — DV Sentinel agent daemon, API keys, HTTP retry transport, telemetry database table |
| Endpoint Inventory | **Real** — live agent updates, hostname, OS, IP address, architecture, and last-seen tracking |
| RAG Retrieval | **Real** filesystem parser, metadata YAML mapping, and authority ranking. **Mock** vector search/semantic embeddings. |
| Dashboard alert list | **Mock** — `MOCK_ALERTS` hardcoded in `mockData.ts` |
| Dashboard metrics | **Mock** — static numbers in `MOCK_METRICS` |
| World attack map | **Mock** — `MOCK_WORLD_ATTACKS` with hardcoded coordinates |
| User risk table | **Mock** — `MOCK_USER_RISKS` with hardcoded scores |

---

## 5. Lessons Learned

**SHAP + Isolation Forest is genuinely useful.** SHAP values for Isolation Forest don't have perfect theoretical grounding (unlike SHAP for gradient boosting), but they produce consistently meaningful feature attributions in practice. The features that SHAP flags as high-impact (e.g., `root_shell`, `num_failed_logins`) are legitimately the features that make an event look anomalous to the model.

**Denormalised JSON columns are the right call for investigation snapshots.** The alternative — normalising every alert field into database columns — would require a rigid schema that breaks whenever the alert format evolves. JSON columns let the investigation record be a faithful snapshot of the data at the time of analysis.

**Structured, validated AI responses improve reliability.** Standard LLM chat interfaces suffer from formatting drift and hallucinated references. Transitioning to a modular architecture with specialized builders, deterministic citations, and post-generation response validation significantly reduces analyst review overhead.
