# DarkVector

> AI-powered Security Operations Center (SOC) platform for real-time threat detection, investigation, and containment.

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.138-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.9-F7931E?style=flat-square&logo=scikit-learn&logoColor=white)](https://scikit-learn.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)

---

## What is DarkVector?

DarkVector is a full-stack AI cybersecurity platform that transforms raw security alerts into structured, explainable investigations. An analyst submits an alert; a trained **Isolation Forest** model scores its anomaly probability; **SHAP values** explain the top contributing factors; a deterministic **context enrichment** layer maps the alert to MITRE ATT&CK techniques and threat intelligence; and a complete **investigation lifecycle** is persisted with an auditable timeline.

The result is a single workspace where an analyst can detect, investigate, contain, and document an incident without leaving the application.

---

## Motivation

Commercial SOC platforms are opaque. Analysts see a score but not a reason. DarkVector was built to answer two questions every analyst asks:

1. **Is this real?** — Isolation Forest anomaly score, calibrated to percentile-based risk.
2. **Why?** — SHAP feature attributions, MITRE technique mapping, and threat intelligence enrichment, derived deterministically from the alert's content.

This project demonstrates that a production-quality AI detection and investigation workflow can be built with open-source tooling, without requiring external AI API calls for core security reasoning.

---

## Features

| Category | Feature |
|---|---|
| **Detection** | Isolation Forest anomaly scoring on 41 KDD-derived network features |
| **Explainability** | SHAP (SHapley Additive exPlanations) top-5 feature attributions |
| **Risk Scoring** | Percentile-based calibration against training set score distribution |
| **MITRE ATT&CK** | Deterministic keyword-based technique mapping (T1558, T1003, T1110, T1611, etc.) |
| **Threat Intel** | IP reputation + hostname heuristics with confidence scoring |
| **Investigations** | Full lifecycle: NEW → INVESTIGATING → CONTAINED → RESOLVED |
| **Timeline** | Auto-generated audit trail (alert created, analysis done, status changed) |
| **Evidence Graph** | Interactive SVG graph built from live investigation data |
| **Reports** | Printable investigation report rendered from persisted backend data |
| **AI Panel** | Conversational analyst assistant contextualised to the active alert |
| **Dark/Light Mode** | Persistent theme toggle via localStorage |
| **Command Palette** | ⌘K global search and navigation |

---

## Technology Stack

### Backend
| Component | Technology |
|---|---|
| API Framework | FastAPI 0.138 |
| ORM | SQLAlchemy 2.0 |
| Database | PostgreSQL (via psycopg2-binary) |
| Migrations | Alembic |
| ML Engine | scikit-learn 1.9 — Isolation Forest |
| Explainability | SHAP 0.52 — TreeExplainer |
| Feature Processing | pandas 3.0, numpy 2.4 |
| Settings | pydantic-settings |
| Server | Uvicorn |

### Frontend
| Component | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build Tool | Vite 6 |
| Styling | Tailwind CSS v4 + custom design system |
| State / Data | TanStack React Query v5 |
| HTTP Client | Axios |
| Animations | Motion (Framer Motion) |
| Icons | Lucide React |
| Charts | Recharts |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                  Browser (Vite + React 19)               │
│   Dashboard → Investigations → Workspace → Report        │
│               React Query Cache (TanStack)               │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTP / JSON  (CORS, port 5173 → 8000)
┌─────────────────────▼───────────────────────────────────┐
│                  FastAPI Backend (port 8000)              │
│  POST /api/v1/analyze                                    │
│  GET/PATCH /api/v1/investigations/{id}                   │
│  GET /api/v1/investigations/{id}/timeline                │
└──────┬────────────────────┬────────────────────┬────────┘
       │                    │                    │
┌──────▼──────┐  ┌──────────▼────────┐  ┌───────▼───────┐
│  ML Pipeline │  │   PostgreSQL DB   │  │Context Service│
│              │  │                   │  │               │
│FeatureMapper │  │  investigations   │  │ MITRE Mapping │
│ Preprocessor │  │  investigation_   │  │ Threat Intel  │
│IsolationForest│  │   timeline       │  │               │
│ RiskScorer   │  └───────────────────┘  └───────────────┘
│ SHAP Explainer│
└──────────────┘
```

---

## Installation

### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL 14+

### Clone

```bash
git clone https://github.com/yourusername/DarkVector.git
cd DarkVector
```

---

## Running the Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate       # Windows
# source .venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt
```

### Database Setup

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/darkvector
```

Create the database tables:

```bash
python -c "from app.database.init_db import init_db; init_db()"
```

### ML Model Setup

The trained model artefacts must exist before the backend can start:

```
backend/models/
  isolation_forest.joblib
  preprocessor.joblib
  model_metadata.json
```

To train the model from scratch:

```bash
# From the ml/ directory
python ml/training/train.py
```

### Start the Backend

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

API: `http://localhost:8000` | Docs: `http://localhost:8000/docs`

---

## Running the Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173`

---

## API Overview

All endpoints use the `/api/v1` prefix.

### Analysis

| Method | Path | Description |
|---|---|---|
| `POST` | `/analyze/` | Submit an alert for ML analysis. Creates an investigation automatically. |

### Investigations

| Method | Path | Description |
|---|---|---|
| `GET` | `/investigations/` | List all investigations, newest first. |
| `GET` | `/investigations/{id}` | Get full investigation detail with alert and analysis JSON. |
| `GET` | `/investigations/{id}/timeline` | Get ordered timeline events for an investigation. |
| `PATCH` | `/investigations/{id}/status` | Update status and auto-create a timeline event. |

Valid statuses: `NEW`, `INVESTIGATING`, `CONTAINED`, `RESOLVED`, `FALSE_POSITIVE`

---

## Folder Structure

```
DarkVector/
├── backend/
│   ├── app/
│   │   ├── api/v1/           # FastAPI route handlers
│   │   ├── core/config.py    # pydantic-settings configuration
│   │   ├── database/         # SQLAlchemy engine, session, init
│   │   ├── ml/               # Feature mapper, loader, scorer, SHAP
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── repositories/     # DB query layer
│   │   ├── schemas/          # Pydantic request/response models
│   │   └── services/         # Business logic + context enrichment
│   ├── models/               # Trained model artefacts (git-ignored)
│   ├── main.py               # FastAPI app + CORS
│   └── requirements.txt
│
├── frontend/
│   └── src/
│       ├── api/              # Axios client + typed API functions
│       ├── components/       # Shared UI + workspace sub-components
│       ├── hooks/            # React Query wrappers
│       ├── lib/              # Utilities: alertGenerator, mapper, severity
│       ├── pages/            # Page-level components (12 pages)
│       ├── types.ts          # Shared Alert, Severity, Workspace types
│       ├── mockData.ts       # Static mock alerts, metrics, world attacks
│       └── App.tsx           # Root component + routing state machine
│
├── ml/                       # Training notebooks and scripts
├── datasets/                 # KDD Cup 99 source data
└── docs/                     # Additional documentation
```

---

## Investigation Workflow

```
1. Alert Generated
   User clicks "Generate Event" on Dashboard
   alertGenerator.ts builds an Alert from EVENT_PROFILES
   Alert is sent to POST /api/v1/analyze

2. ML Analysis (Backend)
   FeatureMapper → 41 KDD features
   Preprocessor (ColumnTransformer) → scaled + encoded
   IsolationForest.decision_function() → raw anomaly score
   RiskScorer → percentile-calibrated risk score (0–100)
   SHAP TreeExplainer → top-5 feature attributions
   ContextService → MITRE ATT&CK + Threat Intel enrichment

3. Investigation Created (Backend, same request)
   InvestigationService.create_from_analysis()
   Investigation row written to PostgreSQL
   Two timeline events auto-created

4. Workspace Opens (Frontend)
   WorkspaceView renders enriched alert
   VectorPanel shows risk, SHAP, MITRE, threat intel
   TimelinePanel loads from GET /investigations/{id}/timeline

5. Status Updates
   PATCH /investigations/{id}/status
   New "Status changed" timeline event auto-created

6. Host Isolation
   Analyst clicks "Isolate Host" → progress bar runs
   On completion, status → CONTAINED via mutation
   Timeline event recorded

7. Report
   InvestigationReportView loads full data + timeline
   Rendered as printable document via window.print()
```

---

## AI Workflow

DarkVector's AI reasoning is **deterministic, not generative**. No LLM API calls are made. All intelligence comes from:

1. **Isolation Forest** — Trained on KDD Cup 99 data with a custom feature mapping layer.
2. **SHAP** — `TreeExplainer` computes exact Shapley values for the top 5 features.
3. **MITRE Mapping** — Keyword lookup: alert `type` → MITRE technique.
4. **Threat Intelligence** — IP prefix lists + hostname patterns → reputation score.
5. **AI Chat Panel** — Context-aware response templates adapting to the active alert.

---

## MITRE ATT&CK Mapping

| Alert Type Keywords | Technique ID | Technique | Tactic |
|---|---|---|---|
| kerberoast | T1558.003 | Kerberoasting | Credential Access |
| lsass, credential dump | T1003.001 | LSASS Memory | Credential Access |
| brute force, failed login, impossible travel | T1110 | Brute Force | Credential Access |
| dns tunnel | T1071.004 | DNS | Command and Control |
| namespace, container escape | T1611 | Escape to Host | Privilege Escalation |
| iam, assumerole | T1078.004 | Cloud Accounts | Privilege Escalation |
| database dump, exfil | T1030 | Data Transfer Size Limits | Exfiltration |
| api burst, api rate | T1498 | Network Denial of Service | Impact |
| scan, port scan | T1046 | Network Service Discovery | Discovery |
| *(fallback)* | T1190 | Exploit Public-Facing Application | Initial Access |

---

## Threat Intelligence

All threat intelligence is derived locally — no external API calls.

**IP Classification:**
- Malicious prefixes: `194.26.*`, `185.190.*`, `91.92.*`, `45.33.*`, `104.21.*`
- Suspicious prefixes: `80.241.*`, `5.188.*`, `23.19.*`
- RFC-1918 addresses → clean

**Hostname Classification:**
- `srv-k8s*` → "Container / Kubernetes Node"
- `db-*`, `postgres*` → "Database Server"
- `corp-ad*` → "Active Directory Infrastructure"
- `aws-*`, `gcp-*` → "Cloud Infrastructure"

---

## Timeline System

Every investigation has an append-only `investigation_timeline` table.

**Event actors:** `system` | `ai` | `analyst`

**Automatic events:**
- Alert submitted → `alert_created` (system)
- Analysis complete → `analysis_completed` (ai)
- Status updated → `status_changed` (analyst)
- Host isolated → `CONTAINED` status → `status_changed` event

---

## Investigation Reports

The report renders from persisted backend data only:
1. Investigation header (ID, creation time, status)
2. Executive summary (AI summary string)
3. Risk overview (risk score, severity, confidence, anomaly score)
4. MITRE ATT&CK (technique, ID, tactic, description)
5. Threat Intelligence (reputation, category, confidence, summary)
6. Timeline (all events in chronological order)

Exported via `window.print()` with `@media print` CSS overrides.

---

## Evidence Graph

The Evidence Graph builds a directed SVG node graph from live investigation data:
- **Source host** — always rendered
- **Associated user** — if `details.username` exists
- **Parent process** — if `details.parentProcess` exists
- **Spawned binary** — if `details.processPath` exists
- **Remote IP** — if `details.ipAddress` exists; colour from threat intel

If no investigation is selected, the graph loads the most recent one automatically.

---

## Future Improvements

- Real-time alert ingestion via WebSocket or SSE
- Analyst assignment and multi-user case management
- LLM-generated executive summaries (optional integration)
- External MITRE ATT&CK API for live technique updates
- VirusTotal / AbuseIPDB integration for live IP reputation
- Role-based access control (RBAC)
- Automated containment playbooks
- PDF export with server-side rendering

---

## Credits

- **KDD Cup 99 dataset** — UCI Machine Learning Repository
- **MITRE ATT&CK** — MITRE Corporation
- **Isolation Forest** — Liu, Fei Tony, Kai Ming Ting, and Zhi-Hua Zhou (2008)
- **SHAP** — Lundberg & Lee (2017)

---

## License

MIT License — see `LICENSE` for details.
