# DarkVector

> An AI-assisted Security Operations Center (SOC) platform that analyzes endpoint telemetry, detects suspicious behavior using machine learning and rule-based logic, generates investigations, and assists analysts with contextual explanations.

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.138-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.9-F7931E?style=flat-square&logo=scikit-learn&logoColor=white)](https://scikit-learn.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)

---

## What is DarkVector?

DarkVector is an AI-assisted security investigation and telemetry monitoring platform. It is designed to assist SOC analysts in making fast, informed containment decisions by transforming raw endpoint logs into explainable, structured investigations.

Unlike automated response tools or fully autonomous threat-hunting systems, DarkVector functions as a **decision support system**. It processes telemetry through classical rule engines and machine learning classifiers, generates a structured investigation timeline, maps indicators to the MITRE ATT&CK framework, and leverages a validated Large Language Model (LLM) assistant to explain the context of security events.

---

## Core System Architecture

DarkVector is split into three main tiers: a **FastAPI backend** managing database models, telemetry parsing, detection, and AI routing; a **React 19 single-page frontend** optimizing analyst workspace interaction; and **DV Sentinel**, a lightweight Python-based endpoint collection daemon.

```
                           ┌─────────────────────────────────────────────────────────┐
                           │               Browser Client (Vite + React 19)          │
                           │   Dashboard → Investigations → Workspace → Report        │
                           │               React Query Cache (TanStack)               │
                           └─────────────────────┬───────────────────────────────────┘
                                                 │ HTTP / JSON (CORS, port 5173 → 8000)
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
        │             ││  Database  ││   Engine   ││    Bus     ││  Foundation ││  Agent    │
        │FeatureMapper││             ││             ││             ││ (Retrieval  ││ (Sentinel │
        │Preprocessor ││   Alerts    ││ ContextBld  ││ Ingests to  ││  category   ││ Heartbeat │
        │IsolateForest││  Timeline   ││ IntentRoute ││ DB & updates││   docs via  ││ POSTing to │
        │Risk / SHAP  ││EndpointAgent││ Gemini/Val  ││  inventory  ││ filesystem) ││ Telemetry)│
        └─────────────┘└────────────┘└─────────────┘└────────────┘└─────────────┘└───────────┘
```

---

## Key Features

### 1. Detection & Anomaly Classification
* **Deterministic Keyword Mappings**: Telemetry is mapped to MITRE ATT&CK tactics and techniques through precise keyword extraction rules.
* **Isolation Forest Classifier**: Endpoint network metrics are evaluated using a trained Isolation Forest model (utilizing a 41-column network parameter mapper) to output an anomaly score.
* **SHAP Explainability**: Top contributing anomalous features are extracted using SHAP (`TreeExplainer`) to present analysts with exact, mathematical indicators of why the model flagged the telemetry.
* **Percentile-based Calibration**: Raw Isolation Forest anomaly scores are mapped to a 0–100 risk scale based on training set distributions.

### 2. Behavioral Rule Engine
* **Detection Scheduler**: Evaluates process trees incrementally to construct parent-child relationships and detect known threat patterns.
* **Active Behavioral Rules**:
  * `certutil_download`: Identifies certutil execution containing command-line HTTP downloads.
  * `office_spawn`: Monitors Microsoft Office applications spawning system shells (`cmd.exe`, `powershell.exe`).
  * `powershell_cmd`: Detects cross-spawn logic between command prompt and PowerShell.
  * `powershell_encoded`: Flags PowerShell running with Base64 encoded command arguments.
  * `suspicious_lolbins`: Highlights Living-off-the-Land Binaries (`regsvr32.exe`, `mshta.exe`, etc.) running in suspicious contexts.
  * `lolbin_chain`: Tracks chains of nested system executables demonstrating multi-stage execution.

### 3. Telemetry & Host Inventory
* **DV Sentinel Endpoint Daemon**: Cross-platform python agent collecting hostname, OS version, architecture, IP address, CPU usage, RAM consumption, and uptime.
* **API transport**: Ingests telemetry via a FastAPI endpoint secured with static API Key headers (`X-API-Key`) with client-side exponential backoff retries.
* **Endpoint Inventory**: Ingested events update host heartbeat records, tracking active, inactive, and offline agents in the database.

### 4. AI Context Engine (Vector AI)
* **Context Builder**: Gathers investigation state, alert parameters, execution timelines, SHAP values, and threat intelligence.
* **Knowledge Pack V2**: Aggregates gathered context into structured natural-language briefings optimized for LLM reasoning.
* **Intent Classifier**: Maps user chat queries to specific prompt categories using keyword classifiers, avoiding extra latency.
* **Specialized Prompt Builders**: Modular prompt builders compile dedicated instructions (General, Attack, Risk, Remediation, MITRE, Timeline, Evidence) sharing a base template.
* **Evidence Citation Mapping**: Automatically pulls verifiable metadata (such as technique IDs or severity metrics) directly from the telemetry dataset, preventing LLM hallucination.
* **Response Validator V2**: Validates LLM responses to block filler phrases ("As an AI...") and verify consistency with the database. Fallback AI is executed if the validation checks fail.

### 5. Analyst Workspace & Reports
* **Premium Glassmorphic Design**: Modern React interface featuring dynamic light/dark modes, ambient motion, and Linear-style card hovers.
* **Interactive Evidence Graph**: Interactive SVG layout mapped directly from investigation process nodes.
* **Audit Timeline**: Tracks case transitions (`NEW` → `INVESTIGATING` → `CONTAINED` → `RESOLVED`) and containment logs.
* **Reproduction Reports**: Printable investigation summaries queried directly from database JSON columns.

---

## Honest Assessment: Implemented vs. Simulated Features

To provide interview-level honesty, the table below defines which subsystems are fully operational versus those that rely on mocks or simulations.

| Component | Status | Implementation Details |
|---|---|---|
| **ML Engine (Isolation Forest)** | **Real** | Inference is executed locally via pre-trained `joblib` artifacts on alert ingestion. |
| **SHAP Explainability** | **Real** | Shapley values are calculated at runtime using `TreeExplainer` on features. |
| **RAG (Knowledge Docs)** | **Partial** | Loads markdown files from local folders and matches them. Semantic vector indexing and vector databases (e.g. ChromaDB) are not implemented. |
| **Containment Action** | **Simulated** | Host isolation spawns a background `ContainmentJob` that simulates network blocking via time delays and database status updates. There is no real host configuration change. |
| **Dashboard Feeds** | **Mocked** | The global world map, user risk tables, and historical metric sparklines are driven by mock telemetry objects (`mockData.ts`). |
| **Telemetry Ingestion** | **Real** | Sentinel daemon actively posts heartbeats over HTTP to database tables, registering host metrics and status in real-time. |

---

## Technical Stack

### Backend
* **API Layer**: FastAPI 0.138
* **Database & ORM**: PostgreSQL (via `psycopg2-binary`) / SQLite, SQLAlchemy 2.0, Alembic migrations
* **ML Stack**: scikit-learn 1.9, SHAP 0.52, pandas, numpy
* **Settings & Config**: Pydantic-settings v2
* **LLM Engine**: Gemini API (`google-generativeai`)

### Frontend
* **Core**: React 19 (TypeScript), Vite 6
* **Data Fetching**: TanStack React Query v5, Axios
* **Styling**: Tailwind CSS v4, Motion (Framer Motion), Lucide React
* **Data Visuals**: Recharts

### Endpoint Agent
* **Runtime**: Python 3.11+
* **Dependencies**: `httpx`, `psutil`, `python-dotenv`

---

## Getting Started

### Prerequisites
* Python 3.11+
* Node.js 20+
* PostgreSQL 14+ (or fallback SQLite connection)

### 1. Clone the Repository
```bash
git clone https://github.com/SunnySatwik/DarkVector.git
cd DarkVector
```

### 2. Configure Backend
```bash
cd backend
python -m venv .venv
# Activate virtual environment
.venv\Scripts\activate      # Windows
# source .venv/bin/activate # macOS/Linux

pip install -r requirements.txt
cp .env.example .env
```

Edit your `.env` configuration:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/darkvector
GEMINI_API_KEY=your_gemini_api_key_here
USE_LLM=True
```

### 3. Initialize Database & Models
```bash
# Initialize DB schemas
python -c "from app.database.init_db import init_db; init_db()"

# Train the local Isolation Forest model to write binary artifacts
python ml/training/train_isolation_forest.py
```

### 4. Run Services
```bash
# Start backend API (port 8000)
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Start frontend development client (port 5173)
cd ../frontend
npm install
npm run dev

# Run the telemetry daemon (optional)
cd ../sentinel
python -m venv .venv
.venv\Scripts\activate      # Windows
# source .venv/bin/activate # macOS/Linux
pip install -r requirements.txt
python main.py
```

---

## Future Roadmap
* **Vector Databases**: Transition local document lookup to ChromaDB or PGVector for semantic embedding-based RAG.
* **Sigma Engine**: Integrate a parser to execute generic Sigma threat detection rules.
* **WebSocket Feeds**: Swap client polling for persistent WebSocket connections on the dashboard and timeline.
* **Distributed Telemetry Bus**: Replace SQL-based event logging with dedicated message queues (e.g., RabbitMQ or Kafka) for scale.
