# DarkVector

> AI-powered Security Operations Center (SOC) platform for real-time threat detection, enrichment, validation, and endpoint telemetry containment.

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.138-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.9-F7931E?style=flat-square&logo=scikit-learn&logoColor=white)](https://scikit-learn.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)

---

## What is DarkVector?

DarkVector is a full-stack AI-powered cybersecurity platform that transforms raw security alerts and telemetry into structured, explainable investigations. An analyst submits an alert; a trained **Isolation Forest** model scores its anomaly probability; **SHAP values** explain the top contributing factors; a deterministic **context enrichment** layer maps the alert to MITRE ATT&CK techniques and threat intelligence; and a complete **investigation lifecycle** is persisted with an auditable timeline. 

DarkVector incorporates an **AI Context Engine** which routes analyst inquiries to specialized prompt builders to validate and format security reasoning before submitting it to Gemini, paired with the **Telemetry Foundation** which leverages a lightweight endpoint agent (**DV Sentinel**) to ingest heartbeats and manage endpoint inventory.

---

## Motivation

Commercial SOC platforms are opaque. Analysts see a score but not a reason. DarkVector was built to answer two questions every analyst asks:

1. **Is this real?** — Isolation Forest anomaly score, calibrated to percentile-based risk.
2. **Why?** — SHAP feature attributions, MITRE technique mapping, and threat intelligence enrichment, derived deterministically from the alert's content.

This project demonstrates that a production-quality AI detection, validation, and telemetry workflow can be built with open-source tooling, without requiring opaque AI calls for core security reasoning.

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
| **AI Context Engine** | Context Builder, Knowledge Pack V2 (narrative briefings), Intent Classifier, Prompt Router, Specialized Builders, Evidence Citations, Response Validator V2, and Fallback AI |
| **RAG Foundation** | Filesystem-based markdown document retrieval (MITRE, Playbooks, CIS, OWASP, Procedures) ranked by authority (Official > Internal > Community) |
| **Telemetry agent** | DV Sentinel endpoint telemetry collector (heartbeats, uptime, CPU, RAM, primary IP) |
| **Endpoint Inventory**| Backend database tracking host ID, hostname, OS, IP address, agent version, status, and last seen |
| **Dark/Light Mode** | Persistent theme toggle via localStorage |
| **Command Palette** | ⌘K global search and navigation |

---

## Technology Stack

### Backend
| Component | Technology |
|---|---|
| API Framework | FastAPI 0.138 |
| ORM | SQLAlchemy 2.0 |
| Database | PostgreSQL (via psycopg2-binary) / SQLite (development) |
| Migrations | Alembic |
| ML Engine | scikit-learn 1.9 — Isolation Forest |
| Explainability | SHAP 0.52 — TreeExplainer |
| Feature Processing | pandas 3.0, numpy 2.4 |
| Settings | pydantic-settings |
| Server | Uvicorn |
| AI Pipeline | Gemini 2.5 Flash |

### Frontend
| Component | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build Tool | Vite 6 |
| Styling | Tailwind CSS v4 + custom design system |
| State / Data | TanStack React Query v5 |
| HTTP Client | Axios / Fetch API |
| Animations | Motion (Framer Motion) |
| Icons | Lucide React |
| Charts | Recharts |

### Endpoint Agent
| Component | Technology |
|---|---|
| Runtime | Python 3.11+ |
| HTTP Client | httpx |
| Metrics Collector | psutil |
| Configuration | python-dotenv |

---

## Architecture Overview

```
                          ┌─────────────────────────────────────────────────────────┐
                          │                  Browser (Vite + React 19)               │
                          │   Dashboard → Investigations → Workspace → Report        │
                          │               React Query Cache (TanStack)               │
                          └─────────────────────┬───────────────────────────────────┘
                                                │ HTTP / JSON  (CORS, port 5173 → 8000)
                                                │
       ┌────────────────────────────────────────▼────────────────────────────────────────┐
       │                            FastAPI Backend (port 8000)                          │
       │                                                                                 │
       │  POST /api/v1/analyze               POST /api/v1/telemetry                      │
       │  GET/PATCH /api/v1/investigations   GET /api/v1/investigations/{id}/timeline    │
       └──────┬─────────────┬─────────────┬─────────────┬─────────────┬─────────────┬────┘
              │             │             │             │             │             │
       ┌──────▼──────┐┌─────▼─────┐┌──────▼──────┐┌─────▼─────┐┌──────▼──────┐┌─────▼─────┐
       │ ML Pipeline ││ PostgreSQL ││  AI Context ││  Telemetry ││     RAG     ││ Endpoint  │
       │             ││  Database  ││   Engine   ││    Bus    ││  Foundation ││  Agent    │
       │FeatureMapper││             ││             ││             ││ (Retrieval  ││ (Sentinel │
       │Preprocessor ││   Alerts    ││ ContextBld  ││ Ingests to  ││  category   ││ Heartbeat │
       │IsolateForest││  Timeline   ││ IntentRoute ││ DB & updates││   docs via  ││ POSTing to │
       │Risk / SHAP  ││EndpointAgent││ Gemini/Val  ││  inventory  ││ filesystem) ││ Telemetry)│
       └─────────────┘└────────────┘└─────────────┘└────────────┘└─────────────┘└───────────┘
```

---

## Installation

### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL 14+ (or SQLite fallback)

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

## Running the Endpoint Agent (DV Sentinel)

```bash
cd sentinel

# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate       # Windows
# source .venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure settings (copy and adjust environment variables if needed)
# Default points to http://localhost:8000 with sentinel-api-key auth
python main.py
```

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

### Telemetry

| Method | Path | Description |
|---|---|---|
| `POST` | `/telemetry` | Ingest endpoint telemetry payload (requires `X-API-Key` header). |

---

## Folder Structure

```
DarkVector/
├── backend/
│   ├── app/
│   │   ├── api/v1/           # FastAPI route handlers (including telemetry.py)
│   │   ├── core/config.py    # pydantic-settings configuration
│   │   ├── database/         # SQLAlchemy engine, session, init
│   │   ├── ml/               # Feature mapper, loader, scorer, SHAP
│   │   ├── models/           # SQLAlchemy ORM models (telemetry, endpoint_agent)
│   │   ├── repositories/     # DB query layer
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   └── services/         # Business logic
│   │       ├── llm/          # AI Context Engine
│   │       │   ├── prompt/   # Modular prompts (Base, General, etc.)
│   │       │   ├── routing/  # Intent Classifier & Prompt Router
│   │       │   └── rag/      # RAG Foundation (retriever, loader, registry, parser)
│   │       └── telemetry/    # Telemetry ingestion, bus, and repository
│   ├── main.py               # FastAPI app + CORS
│   └── requirements.txt
│
├── frontend/
│   └── src/
│       ├── api/              # Axios client + typed API functions
│       ├── components/       # Shared UI + workspace sub-components (AiAnalystPanel.tsx)
│       ├── hooks/            # React Query wrappers
│       ├── lib/              # Utilities: alertGenerator, mapper, severity
│       ├── pages/            # Page-level components
│       ├── types.ts          # Shared Alert, Severity, Workspace types
│       ├── mockData.ts       # Static mock alerts, metrics, world attacks
│       └── App.tsx           # Root component + routing state machine
│
├── sentinel/                 # Lightweight endpoint agent
│   ├── collector/            # Telemetry collectors (HeartbeatCollector)
│   ├── transport/            # APITransport layer (retry backoff, httpx client)
│   ├── models/               # Dataclasses (TelemetryEvent)
│   ├── utils/                # Utilities (structured JSON logging setup)
│   ├── config.py             # Sentinel configurations
│   ├── main.py               # Agent daemon entry loop
│   └── requirements.txt
│
├── datasets/                 # KDD Cup 99 source data
└── docs/                     # Additional documentation
```

---

## Investigation Flow

```
┌───────────────┐     ┌─────────────┐     ┌────────────┐     ┌───────────┐
│ Alert Trigger │ ──> │ ML Pipeline │ ──> │ Risk/SHAP  │ ──> │ Context   │
└───────────────┘     │ (KDD Map)   │     │ Scorer     │     │ (MITRE/TI)│
                      └─────────────┘     └────────────┘     └─────┬─────┘
                                                                   │
                                                                   ▼
┌───────────────┐     ┌─────────────┐     ┌────────────┐     ┌───────────┐
│   Workspace   │ <── │ AI Context  │ <── │ Timeline & │ <── │ DB Write  │
│  Interactive  │     │   Engine    │     │ Validation │     │ (Postgres)│
└───────────────┘     └─────────────┘     └────────────┘     └───────────┘
```

---

## Telemetry Ingestion Flow

```
┌───────────────┐     ┌────────────────┐     ┌──────────────┐
│  DV Sentinel  │ ──> │ Telemetry API  │ ──> │  Telemetry   │
│   Heartbeat   │     │ (X-API-Key)    │     │     Bus      │
└───────────────┘     └────────────────┘     └──────┬───────┘
                                                    │
                                                    ▼
┌───────────────┐     ┌────────────────┐     ┌──────────────┐
│   Endpoint    │ <── │ Telemetry DB   │ <── │ Ingest Event │
│   Inventory   │     │ (Agent Status) │     │ (Persist)    │
└───────────────┘     └────────────────┘     └──────────────┘
```

---

## AI Context Engine Pipeline

DarkVector runs every AI interaction through a strict, multi-stage pipeline:

1. **Context Builder**: Gathers investigation, alerts, memory, timeline, SHAP, and threat intelligence.
2. **Knowledge Pack V2**: Transforms the context dictionary into a natural-language briefing optimized for Gemini reasoning.
3. **Intent Classifier**: Maps user queries deterministically via keyword-matching to avoid extra LLM latency.
4. **Prompt Router**: Directs the intent to the correct specialized builder.
5. **Specialized Prompt Builders**: Implements modular prompts (General, Explain Attack, Risk, Remediation, MITRE, Timeline, Evidence) sharing a common template.
6. **Gemini**: Generates the response.
7. **Evidence Citations**: Generates deterministic citations from the actual investigation context (hallucination-free).
8. **Response Validator V2**: Performs semantic and formatting checks, rejecting AI-filler statements and checking context consistency.
9. **Fallback AI**: Executed if the validator flags issues or the primary LLM pipeline fails.

---

## RAG (Retrieval-Augmented Generation) Foundation

The RAG foundation loads markdown-formatted documents from localized directories:
- `mitre/`, `playbooks/`, `cis/`, `owasp/`, `procedures/`

The retrieval system is fully implemented, utilizing a registry of `RetrievalProfile` templates, caching files in-memory to prevent redundant filesystem I/O, parsing YAML metadata, and ranking documents by authority level (`official` > `internal` > `community`). The retriever interface is designed to support the future plug-in of vector databases (ChromaDB) without changes to the rest of the application.

---

## Future Roadmap

### Sprint 15
• Process telemetry collector  
• Endpoint process tree streaming  
• Behavior-based local detection rules  
• Streaming telemetry parser  

### Sprint 16
• Behavioral detection engine  
• Sigma rules parser  
• Live investigation updates (WebSockets)  
• SOC Dashboard telemetry graphs  

### Sprint 17
• ChromaDB / Vector database integration  
• Embeddings generation  
• Autonomous investigation playbooks  
• Native Tool Calling  
• Enterprise threat feeds (VirusTotal, AbuseIPDB, YARA)  
• AWS, Azure, and Kubernetes collector agents  

---

## License

MIT License — see `LICENSE` for details.
