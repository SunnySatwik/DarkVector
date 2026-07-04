# DarkVector — Project Walkthrough

> A system-level guide to how DarkVector works, why it was built this way, and how a complete investigation flows through the stack.

---

## 1. The Problem

Security Operations Centers process thousands of alerts per day. Most are noise. A few are real incidents. The analyst's job is to decide which are which — quickly, accurately, and with enough evidence to justify containment actions.

The core problem with most SOC platforms is that they show you **what** (this IP sent traffic to port 443) but not **why it matters** (this process tree, combined with this IP reputation and this MITRE technique, matches a known exfiltration pattern).

DarkVector was designed to collapse the analyst's decision loop. Every alert that enters the system automatically receives:
- A machine learning anomaly score
- An explainability breakdown (which features drove the score)
- A MITRE ATT&CK classification (what kind of attack this matches)
- Threat intelligence (what we know about the source)
- An auditable investigation with a lifecycle

An analyst should be able to open DarkVector, see the prioritised investigation, understand the threat, and act — in under 60 seconds.

---

## 2. System Components at a Glance

| Component | What it does | Live or Mock? |
|---|---|---|
| Isolation Forest model | Scores each alert for anomaly probability | **Live** — scikit-learn model, trained on KDD Cup 99 |
| SHAP explainer | Explains which features drove the score | **Live** — SHAP `TreeExplainer` |
| MITRE mapping | Maps alert type to ATT&CK technique | **Live** — deterministic keyword lookup |
| Threat intelligence | Classifies IP and hostname reputation | **Live** — deterministic prefix + pattern matching |
| Investigation creation | Creates DB record with full lifecycle | **Live** — PostgreSQL via SQLAlchemy |
| Timeline | Audit trail for every investigation | **Live** — auto-created on analysis and status change |
| Alert feed (Dashboard) | Top-priority alerts shown | **Mock** — `MOCK_ALERTS` from `mockData.ts` |
| Dashboard metrics | Global threat level, isolation counts | **Mock** — `MOCK_METRICS` from `mockData.ts` |
| World attack map | SVG arrows between geographic locations | **Mock** — `MOCK_WORLD_ATTACKS` from `mockData.ts` |
| Risk score sparklines | Mini trend charts on Dashboard | **Mock** — static arrays in `MOCK_METRICS` |
| User risk scores | Risky user table on Dashboard | **Mock** — `MOCK_USER_RISKS` from `mockData.ts` |
| Models page | ML model parameters display | **Informational** — static text, no live model queries |

---

## 3. End-to-End: The Investigation Lifecycle

### Step 1 — Alert Ingestion

On the Dashboard, the analyst sees a list of high-priority alerts. These are currently served from `MOCK_ALERTS` in `mockData.ts`. Each alert has:
- An `id` (e.g., `AL-8491`)
- A `source` (hostname or email)
- A `type` (human-readable attack description)
- A `category`: `process` | `network` | `authentication` | `system`
- A `severity` and raw `score`
- `details`: process paths, IPs, command lines, etc.

The "Generate Event" button calls `generateRandomAlert()` from `alertGenerator.ts`, which picks a profile from `EVENT_PROFILES` (a curated list of 10+ realistic attack scenarios) and randomises the variable fields (hostnames, IPs, timestamps).

Either a mock alert or a generated one can be used to open the workspace.

---

### Step 2 — ML Analysis

When an analyst clicks an alert, `InvestigationWorkspace.tsx` mounts and immediately fires `mutation.mutate(activeAlert)` — a `POST /api/v1/analyze` request.

**Inside the backend:**

`InferenceService.analyze(alert)` orchestrates the full pipeline:

**2a. Feature Mapping**

`FeatureMapper.from_alert(alert)` converts the semantic alert into the 41-column KDD Cup 99 network connection schema:

```
Alert category "process" →
  service = "private"
  logged_in = 0
  root_shell = 1  (if "namespace" or "lsass" in type)
  su_attempted = 1
  hot = 3
  num_compromised = 2
```

This translation is necessary because the Isolation Forest was trained on KDD Cup 99 network flow data. The mapping is a hand-crafted heuristic that translates modern security event semantics into the feature language the model understands.

**2b. Preprocessing**

The raw KDD dict is converted to a `pd.DataFrame`, then passed through the `preprocessor` — a `ColumnTransformer` from scikit-learn that handles:
- `OneHotEncoder` for categorical features (`protocol_type`, `service`, `flag`)
- `StandardScaler` for numerical features

The preprocessor was fitted on the same KDD training data as the model, so it applies identical scaling to inference inputs.

**2c. Isolation Forest Scoring**

`model.decision_function(features)` returns a raw score. Values below 0 indicate anomalous points (they were isolated with fewer tree splits on average).

**2d. Risk Calibration**

`RiskScorer.from_score(raw_score)` maps the raw score to a discrete risk level using percentile thresholds stored in `model_metadata.json`:

```json
{
  "score_distribution": {
    "p1": -0.182,
    "p5": -0.134,
    "p10": -0.098,
    "p25": -0.043,
    "median": 0.021,
    "p75": 0.067
  }
}
```

A score at or below the 1st percentile of the training set gets risk=100 (Critical). A score above the 75th percentile gets risk=10 (Informational). This calibration ensures the risk scale has consistent meaning relative to the training distribution.

**2e. SHAP Explainability**

`SHAP.TreeExplainer.shap_values(features)` computes exact Shapley values for every feature. The top 5 by absolute magnitude are returned as `FeatureContribution` objects:

```json
[
  { "feature": "root_shell", "impact": 0.42, "direction": "increase" },
  { "feature": "su_attempted", "impact": 0.29, "direction": "increase" },
  ...
]
```

"Increase" means this feature pushed the anomaly score higher (made it seem more anomalous). "Decrease" means it pulled it toward normal.

**2f. Context Enrichment**

`ContextService.enrich(alert)` runs two lookups:

1. `mitre_mapping.lookup(alert)` — matches `alert.type.lower()` against priority-ordered keyword rules. The first match wins. "Unusual Namespace Creation & Exec" → contains "namespace" → T1611 Escape to Host.

2. `threat_intelligence.lookup(alert)` — checks `details.ipAddress` first (highest priority). `194.26.135.84` starts with `194.26.` → malicious (confidence 92). If no IP match or IP is clean, falls through to hostname patterns on `alert.source`.

The full enrichment is stored alongside the analysis in the `analysis_json` column so it is available in reports and the evidence graph without re-computation.

---

### Step 3 — Investigation Persistence

Still within the same `POST /analyze` request, `InvestigationService.create_from_analysis(db, alert, analysis)` runs:

1. Checks if an investigation already exists for this `alert_id` (idempotency guard)
2. Creates an `Investigation` record with:
   - Public ID: `INV-YYMMDD-XXXXXX` (date + 6-char UUID hex)
   - Status: `NEW`
   - Severity mapped from the ML severity string
   - `alert_json` = the full alert payload
   - `analysis_json` = the full analysis response
3. Creates two timeline events automatically:
   - `alert_created` (actor: system) — "Security alert '{type}' triggered an investigation."
   - `analysis_completed` (actor: ai) — "Risk Score: {score} Severity: {severity}"

The frontend receives the `AnalysisResponse` immediately. The investigation is created as a side effect without blocking the response.

---

### Step 4 — Workspace Renders

`InvestigationWorkspace.tsx` receives the `AnalysisResponse` and constructs a `displayAlert`:

```typescript
const displayAlert = analysisData
  ? { ...activeAlert, score: analysisData.analysis.risk_score, severity: analysisData.analysis.severity }
  : activeAlert;
```

This means the workspace shows the **ML-evaluated severity**, not the raw mock alert severity. If ML says this is "Critical" but the mock alert was tagged "High", the workspace updates.

`WorkspaceView.tsx` is the layout component that orchestrates the workspace tabs:

- **Overview** — `VectorPanel.tsx`: shows risk score, anomaly score, confidence, MITRE, threat intel, SHAP factors, and the isolation/containment panel.
- **Timeline** — `TimelinePanel.tsx`: calls `useTimeline(investigationId)` to load live events from the backend.
- **Process Tree** — `ProcessTree.tsx`: renders a hierarchical view of the process chain from `alert.details`.

`useInvestigations()` runs in parallel to find the `investigation_id` that matches the active alert's `alert_id`. This is used to pre-populate the status selector and to wire up the status mutation.

---

### Step 5 — Status Management

The analyst can manually update the investigation status via the dropdown in `WorkspaceView.tsx`. Each change calls:

```
PATCH /api/v1/investigations/{investigation_id}/status
Body: { "status": "INVESTIGATING" }
```

`InvestigationService.update_status()` checks if the status actually changed before writing. If it did:
1. Updates `investigation.status`
2. Calls `InvestigationRepository.update(db, investigation)`
3. Creates a `status_changed` timeline event: "Investigation marked as Investigating."

On the frontend, `useUpdateInvestigationStatus().onSuccess` invalidates all three query keys (`investigations`, `investigation/{id}`, `timeline/{id}`), causing immediate refetches.

---

### Step 6 — Host Isolation

The "Isolate Host" button in `VectorPanel.tsx` calls `handleIsolate()` in `InvestigationWorkspace.tsx`:

```typescript
const handleIsolate = () => {
  setQuarantineStatus("quarantining");
  const interval = setInterval(() => {
    setQuarantineProgress(prev => {
      if (prev >= 100) {
        clearInterval(interval);
        setQuarantineStatus("quarantined");
        updateStatusMutation.mutate("CONTAINED");  // ← real API call
        return 100;
      }
      return prev + 20;
    });
  }, 220);
};
```

The progress bar takes ~1.1 seconds (5 × 220ms steps). On completion, the status mutation fires, which:
- Sets the investigation status to `CONTAINED` in the DB
- Creates a "Status changed" timeline event
- Invalidates all React Query caches → timeline panel refreshes

**Why simulate the progress bar?** Actual host isolation in a real SOC would involve sending a containment command to an EDR (Endpoint Detection & Response) platform and waiting for confirmation. The progress bar represents that real-world async operation pattern without requiring external integrations.

---

### Step 7 — Report Generation

When the analyst is ready to close a case, they open the Investigation Report:

```
onOpenReport(investigationId)
   → App.tsx sets activeReportId
   → InvestigationReportView.tsx mounts
```

The report page fires two queries:
1. `useInvestigation(investigationId)` → loads `{ investigation, alert, analysis }` from `GET /investigations/{id}`
2. `useTimeline(investigationId)` → loads the complete event history

Everything needed for the report is already in the database:
- The investigation record (ID, status, severity, summary, risk_score, confidence)
- The original alert (stored in `alert_json`)
- The full analysis including MITRE and threat intel (stored in `analysis_json`)
- The complete timeline of events

**No ML models are re-run.** No enrichment is re-computed. The report is a faithful historical record of what happened at the time of analysis.

The report renders an HTML page with dedicated `@media print` CSS overrides (white background, hidden sidebar/nav) so `window.print()` produces a clean PDF-quality printout.

---

### Step 8 — Evidence Graph

The Evidence Graph (`ThreatGraph.tsx`) visualises the attack chain as a directed SVG node graph.

If an investigation is already selected (via `activeAlert` passed as a prop), the graph builds directly from that alert. If no alert is active (the analyst navigated to the Evidence Graph page directly), the page calls `useInvestigations()`, picks `investigations[0]`, and loads the full detail for that investigation.

`buildGraphData(alert, context)` constructs nodes and edges based on what fields are present in the alert `details`:

```
alert.source          → Source node (always)
details.username      → User node (if present)
details.parentProcess → Parent process node (if present)
details.processPath   → Binary node (always critical severity)
details.ipAddress     → Remote IP node
  + context.threat_intelligence.reputation
    → colours the IP node (malicious=red, suspicious=orange)
```

This means the graph is always investigation-specific — it shows exactly what was happening in **this** alert, not a generic network diagram.

---

## 4. Design Philosophy

### The Alert Is the Hero

Every UI layout decision in DarkVector is made to keep the analyst focused on the current incident. The sidebar is compact and collapsible. The TopNav is minimal (search + theme toggle only). The workspace fills the entire viewport. There are no vanity dashboards — every metric shown on Mission Control links directly to an actionable investigation.

### No LLM Dependency for Core Security Logic

DarkVector makes a deliberate architectural choice: ML and context enrichment run entirely on the local backend. The MITRE mapping, threat intelligence, risk calibration, and SHAP explainability are all deterministic. This means:

- **No API cost** — analysis is free regardless of volume
- **No latency** — median analysis time is under 10ms
- **No non-determinism** — the same alert always produces the same MITRE technique and the same risk classification

This is appropriate for a demo system where predictability matters. In production, LLM integration would add value for narrative summaries and dynamic context — but should not replace deterministic classification logic.

### Idempotent Analysis

`InvestigationService.create_from_analysis()` is idempotent on `alert_id`. Submitting the same alert twice does not create a second investigation or duplicate timeline events. This protects against frontend retry logic, network failures, and double-clicks.

### Append-Only Timeline

The `investigation_timeline` table is append-only by design. Status updates create a new row; they do not modify existing rows. This gives a complete audit trail: an analyst reviewing an investigation after the fact can see every state transition and its exact timestamp.

### Data Co-location for Reports

The `alert_json` and `analysis_json` JSON columns are a deliberate denormalisation. They trade a small amount of storage for a significant reduction in system complexity: the report and workspace can reconstruct the full investigation context from a single database row, without re-running any ML models or calling any external services.

---

## 5. Why Each Technology Was Chosen

### FastAPI over Flask or Django

FastAPI gives automatic OpenAPI schema generation (accessible at `/docs`), native async support, and Pydantic model validation at the boundary — all with near-zero boilerplate. The interactive docs page (`/docs`) is useful for testing the API during development without a separate REST client.

### SQLAlchemy 2.0 with Mapped Columns

SQLAlchemy 2.0's `Mapped` column syntax brings Python type-checking to the ORM layer. The `investigation_id` FK relationship between `investigations` and `investigation_timeline` is expressed in plain Python and enforced at the database level.

### Isolation Forest over a Deep Learning Approach

Isolation Forest was chosen for three reasons:
1. **No labels required** — it's an unsupervised algorithm. Cybersecurity data rarely has clean "attack" / "benign" labels.
2. **Fast inference** — ensemble tree models score in microseconds, not seconds.
3. **SHAP compatibility** — `shap.TreeExplainer` supports Isolation Forest directly, giving exact (not approximate) Shapley values.

A neural network approach would require labelled training data and would produce less interpretable outputs.

### KDD Cup 99 Dataset

KDD Cup 99 is a standard intrusion detection benchmark dataset containing network connection records with 41 features. It provides both normal traffic and labelled attacks (DoS, Probe, R2L, U2R). The Isolation Forest is trained on the KDD Cup 99 data to learn the statistical distribution of normal network connections. Alerts that deviate from this distribution receive high anomaly scores.

The `FeatureMapper` bridges the gap between modern security alert schemas and KDD's 1999-era feature set — this is the most important hand-crafted layer in the system.

### TanStack React Query over Redux or Zustand

React Query is purpose-built for server state. It handles the entire caching, staleness, background refetching, and invalidation lifecycle out of the box. For an application that is mostly "fetch data, display it, update it via API", React Query is the right tool. Redux/Zustand would add complexity without adding value for this use case.

### Vite over Create React App

Vite uses native ES modules in development (no bundling step on save), making hot module reload nearly instantaneous. For a TypeScript + React codebase of this size, the development experience difference is significant.

---

## 6. Honest Assessment: What Is Real vs. Mock

| Aspect | Honest Status |
|---|---|
| ML model (Isolation Forest) | **Real** — trained on KDD Cup 99, inference on every alert |
| SHAP explainability | **Real** — exact Shapley values from TreeExplainer |
| MITRE ATT&CK mapping | **Real** but deterministic — closed vocabulary lookup, not semantic search |
| Threat intelligence | **Real** logic, **demo** data — prefix lists calibrated to match mock alerts |
| Investigation database | **Real** — live PostgreSQL, live CRUD operations |
| Timeline | **Real** — auto-generated, append-only, stored in PostgreSQL |
| Dashboard alert list | **Mock** — `MOCK_ALERTS` hardcoded in `mockData.ts` |
| Dashboard metrics (threat level, isolation count) | **Mock** — static numbers in `MOCK_METRICS` |
| World attack map | **Mock** — `MOCK_WORLD_ATTACKS` with hardcoded coordinates |
| User risk table | **Mock** — `MOCK_USER_RISKS` with hardcoded scores |
| Models page (Chroma KB stats) | **Mock** — static informational text, no live KB queries |
| AI chat responses | **Context-aware** but **pre-composed** — not LLM-generated |

---

## 7. Lessons Learned

**SHAP + Isolation Forest is genuinely useful.** SHAP values for Isolation Forest don't have perfect theoretical grounding (unlike SHAP for gradient boosting), but they produce consistently meaningful feature attributions in practice. The features that SHAP flags as high-impact (e.g., `root_shell`, `num_failed_logins`, `diff_srv_rate`) are legitimately the features that make an event look anomalous to the model.

**Denormalised JSON columns are the right call for investigation snapshots.** The alternative — normalising every alert field into database columns — would require a rigid schema that breaks whenever the alert format evolves. JSON columns let the investigation record be a faithful snapshot of the data at the time of analysis, while still being queryable for reporting.

**Deterministic enrichment scales better than external APIs.** During development, using external APIs (MITRE, VirusTotal) introduced flakiness, rate limits, and latency spikes. The deterministic lookup tables never fail, respond in microseconds, and produce the same result in every demo environment. For a controlled demo with a known alert vocabulary, this is the correct trade-off.

**The investigation lifecycle drives every design decision.** Once the data model was defined (Investigation → Timeline → Report), every frontend and backend component fell naturally into place. The status state machine, the timeline auto-events, the report read-only view — all emerge naturally from the lifecycle model.
