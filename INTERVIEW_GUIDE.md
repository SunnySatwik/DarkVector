# DarkVector — Software Engineering Interview Guide

This guide is designed to prepare you for technical interviews. It structures the project's architecture, design decisions, and core code paths into clear, interview-ready talking points.

---

## 1. 5-Minute Project Pitch (Architecture Walkthrough)

*Use this structure when an interviewer says, "Walk me through a project you've built."*

### 1. Problem Statement
Security Operations Centers (SOCs) are overwhelmed by alerts. Standard security dashboards show analysts *what* happened (e.g. an anomalous network packet) but fail to explain *why* it is suspicious, leading to alert fatigue or delayed containment.

### 2. Project Goal
I built **DarkVector**, an AI-assisted SOC investigation platform. It consumes raw endpoint telemetry, detects threats using a combination of machine learning (Isolation Forest) and deterministic behavioral rule engines, automatically creates structured investigations, and uses a validated LLM pipeline to explain security context to analysts so they can isolate hosts immediately.

### 3. Overall Architecture
The platform is built as a three-tier system:
* **Frontend**: Single-page application built on React 19, TypeScript, Vite, and TanStack React Query. It is designed to act as an analyst's decision workspace.
* **Backend**: REST API built with FastAPI, SQLAlchemy 2.0, and PostgreSQL. It manages telemetry ingestion, runs the ML/explainability classifiers, and hosts the AI reasoning pipeline.
* **Endpoint Agent (DV Sentinel)**: A lightweight Python-based daemon running on client hosts, collecting system vitals and shipping them via HTTP back to the API.

### 4. Detection & Analytics Pipeline
When telemetry arrives, it is processed in two ways:
* **Anomaly Detection**: Network parameters are mapped to a 41-column KDD connection schema, scaled, and passed to a local **Isolation Forest** model. We calculate exact feature contributions at runtime using **SHAP** (`TreeExplainer`) to show analysts the top-5 indicators driving the score.
* **Behavioral Rules**: The `DetectionScheduler` runs regularly, constructing process hierarchies (parent-child trees) from endpoint logs and evaluating them against rules like `office_spawn` and `powershell_encoded`.

### 5. AI Integration
We integrate Gemini as an investigation partner using a strict pipeline:
* **Knowledge Pack**: Formats raw telemetry, timeline data, and RAG context into a structured briefing.
* **Intent Routing**: Classifies analyst questions using fast keyword matching to bypass LLM routing latency.
* **Validation & Citations**: Ensures AI replies are grounded by generating deterministic citations directly from the database and validating responses with a semantic validator to filter out hallucinations or placeholder text.

### 6. Investigation Workflow
Telemetry Ingest → Rule Evaluation/ML Scoring → Investigation Creation (with automated timeline events) → Analyst Alert Display → AI Workspace Panel → Simulated Containment Command → Host Isolation.

### 7. Current Limitations & Future Work
* **Limitations**: Containment is currently simulated via a background job queue rather than real network route changes; document retrieval is directory-based rather than vector-indexed (no ChromaDB/embeddings yet).
* **Future Work**: Implementing WebSocket connections for live log feeds and shifting telemetry storage to a distributed message broker (e.g., RabbitMQ or Kafka) to scale transaction processing.

---

## 2. Technical Q&A Cheat Sheet

### Q: Why did you choose Isolation Forest over other anomaly detection models (like Autoencoders or SVMs)?
> **A:** "I chose Isolation Forest because of its local efficiency and explainability. Unlike deep-learning Autoencoders, an Isolation Forest can run fast CPU-based training and inference without requiring dedicated GPUs. Compared to One-Class SVMs, it scales better to high-dimensional datasets and is less sensitive to feature scaling. Most importantly, it integrates directly with Tree-based SHAP (SHapley Additive exPlanations) via `TreeExplainer`, allowing us to compute exact, mathematical feature attribution scores in milliseconds during live API requests."

### Q: How do you handle LLM hallucinations in security reports?
> **A:** "We mitigate hallucinations by enforcing three layers of isolation:
> 1. **Data Grounding**: The LLM is never allowed to search the internet or query raw databases directly. The prompt builder compiles a narrative 'Knowledge Pack' containing only the specific facts (alert JSON, host vitals, execution timeline, and related documentation) relevant to the case.
> 2. **Deterministic Citations**: We parse the context parameters and attach verifiable source tags (e.g. `[Evidence: Rule Triggered]`) programmatically, bypassing the LLM's own attribution logic.
> 3. **Semantic Post-Validation**: Every LLM response is processed by a validator that checks for forbidden generic text (like 'As an AI language model...') and cross-references returned severity levels and technique IDs against the original database attributes. If validation fails, we automatically swap the output for a deterministic fallback script."

### Q: Explain the database setup. How does telemetry ingestion scale?
> **A:** "The schema is managed with SQLAlchemy and runs on PostgreSQL. We store raw events in a `telemetry_events` table and maintain endpoint metadata in an `endpoint_agents` inventory table. Heartbeats update a host's `last_seen` timestamp and status (`connected`). To make the background scheduler loop thread-safe and avoid session detachment errors (`DetachedInstanceError`), we convert SQLAlchemy objects into immutable, lightweight Python DTOs (Data Transfer Objects) before passing them to the tree-builder and rule engines."

### Q: How does the containment architecture simulate agent isolation?
> **A:** "Containment is orchestrated through a dedicated `ContainmentJob` model. When an analyst clicks 'Isolate', the service registers a job state of `QUEUED` and returns a receipt immediately, preventing API timeouts. A FastAPI `BackgroundTasks` runner picks up the job asynchronously, transitions it to `EXECUTING`, executes the containment logic (a simulated 3-second network routing block implemented via `time.sleep`), updates the target host status to `contained`, writes a `STATUS_CHANGED` event to the investigation timeline, and marks the job `COMPLETED`."
