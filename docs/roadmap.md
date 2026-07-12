# DarkVector Roadmap

## Vision

DarkVector is an AI-powered SOC platform that helps analysts investigate, understand, and respond to cybersecurity incidents through explainable machine learning and intelligent investigation workflows.

---

# Sprint 1–6 ✅

## Backend
- ML inference pipeline
- Investigation persistence
- PostgreSQL
- Repository pattern
- REST API

## Frontend
- Dashboard
- Threat Feed
- Investigation Workspace
- Saved Investigations
- AI Analyst Panel
- AlertContext
- Developer Event Generator

---

# Sprint 7 🚧

Feature 1 ⭐⭐⭐⭐⭐
Investigation Timeline

Shows everything that happened.

Simple.

Useful.

Easy to demo.

Feature 2 ⭐⭐⭐⭐⭐
Investigation Notes

Markdown notes.

Saved.

Editable.

That's all.

No collaborative editing.

No version history.

Feature 3 ⭐⭐⭐⭐⭐
MITRE ATT&CK + Evidence

Merge these.

Instead of building five panels...

Have one section.

Evidence

Processes

IPs

Users

MITRE

Commands

Simple.

Professional.

---

# Sprint 8

Backend Alert Service

Alert CRUD

Live Dashboard

Alert Assignment

Alert Lifecycle

---

# Sprint 9

Threat Intelligence

IOC Extraction

IOC Enrichment

Related Investigations

Threat Graph Expansion

---

# Sprint 10

AI Copilot

Report Generation

Attack Chain Explanation

Case Collaboration

Executive Reports

Dashboard
    │
    ├── Live Alert Feed
    ├── Priority Investigation
    ├── Active Investigations
    └── Metrics

↓

Investigation Workspace
    │
    ├── AI Summary
    ├── SHAP Explanation
    ├── Threat Intelligence
    ├── MITRE ATT&CK
    ├── Timeline
    ├── Evidence
    └── Containment Actions

↓

Investigation Report

Capability	Current State
Real endpoint agent	✅ Working
Heartbeat telemetry	✅ Working
Process telemetry	✅ Working
Telemetry API	✅ Working
Database persistence	✅ Working
Behavioral rules	✅ Working
PowerShell detection	✅ Runtime verified
Detection correlation	✅ Working
Automatic investigations	✅ Working
Investigation workspace	✅ Working
MITRE enrichment	✅ Implemented
AI Context Engine	✅ Implemented
Grounded Vector chat	🟡 Needs final runtime verification
Evidence Graph	🟡 Needs final runtime verification
Network collection	❌ Not implemented
File monitoring	❌ Not implemented
Registry monitoring	❌ Not implemented
Windows Event Logs	❌ Not implemented
Advanced process-tree detection	🟡 Early architecture
Multi-host correlation	❌ Not mature
Unknown threat detection	🟡 Legacy ML foundation exists
Automated containment	🟡 Mostly platform/UI architecture
Production endpoint deployment	❌ Not yet