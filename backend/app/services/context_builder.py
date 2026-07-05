# context_builder.py

from sqlalchemy.orm import Session
from app.services.investigation_service import InvestigationService
from app.repositories.investigation_repository import InvestigationRepository
from app.repositories.timeline_repository import TimelineRepository
from app.services.llm.memory import ConversationMemory

class ContextBuilder:
    @staticmethod
    def build(
        db: Session = None,
        investigation_id: str = None,
        alert_id: str = None,
        alert_data: dict = None,
        analysis_json: dict = None,
        risk_score: float = None,
        severity: str = None,
        anomaly_score: float = None,
        mitre_mapping: dict = None,
        threat_intelligence: dict = None,
        timeline_events: list = None,
        recent_message: str = None,
        history: list = None,
        current_page: str = None,
    ) -> dict:
        """
        Gathers ALL investigation context in one single dictionary.
        This acts as the single source of truth for the AI Context Engine.
        """
        investigation = None
        if db:
            if investigation_id:
                investigation = InvestigationService.get_investigation(db, investigation_id)
            if not investigation and alert_id:
                investigation = InvestigationRepository.get_by_alert_id(db, alert_id)

        # Resolve properties from database investigation if loaded
        if investigation:
            alert_data = alert_data or investigation.alert_json
            analysis_json = analysis_json or investigation.analysis_json
            risk_score = risk_score or investigation.risk_score
            severity = severity or str(investigation.severity)
            if db and not timeline_events:
                timeline_repo = TimelineRepository(db)
                timeline_events = timeline_repo.list_for_investigation(investigation.investigation_id)

        # Structure timeline events as lists of dictionaries
        timeline = []
        if timeline_events:
            for e in timeline_events:
                if hasattr(e, "timestamp"):
                    timeline.append({
                        "timestamp": str(e.timestamp),
                        "actor": str(e.actor),
                        "title": e.title,
                        "description": e.description,
                    })
                elif isinstance(e, dict):
                    timeline.append(e)

        # Structure MITRE, Threat Intel, and SHAP factors
        analysis_context = {}
        mitre = mitre_mapping or {}
        threat_intelligence = threat_intelligence or {}
        shap_factors = {}

        if analysis_json:
            analysis_context = analysis_json.get("context", {})
            mitre = mitre or analysis_context.get("mitre", {})
            threat_intelligence = threat_intelligence or analysis_context.get("threat_intelligence", {})
            shap_factors = analysis_json.get("explanation", {})
            if not risk_score:
                risk_score = analysis_json.get("analysis", {}).get("risk_score")
            if not severity:
                severity = analysis_json.get("analysis", {}).get("severity")

        # Ingest conversation memory
        conversation = ConversationMemory.build(history, recent_message)

        # Build evidence graph metadata
        evidence_graph = {}
        if alert_data:
            evidence_graph = ContextBuilder._build_graph_metadata(alert_data, analysis_context)

        return {
            "investigation": {
                "investigation_id": investigation.investigation_id if investigation else "N/A",
                "title": investigation.title if investigation else (alert_data.get("type") if alert_data else "N/A"),
                "status": str(investigation.status) if investigation else "N/A",
                "severity": severity or "N/A",
                "risk_score": risk_score or 0.0,
                "confidence": investigation.confidence if investigation else (analysis_json.get("analysis", {}).get("confidence", 0.0) if analysis_json else 0.0),
            } if (investigation or alert_data) else None,
            "alert": alert_data,
            "timeline": timeline,
            "mitre": mitre,
            "threat_intelligence": threat_intelligence,
            "analysis_context": analysis_context,
            "shap_factors": shap_factors,
            "conversation": conversation,
            "current_page": current_page,
            "evidence_graph": evidence_graph,
        }

    @staticmethod
    def _build_graph_metadata(alert: dict, context: dict) -> dict:
        """
        Derives evidence graph metadata representing nodes and edges.
        """
        nodes = []
        links = []

        source = alert.get("source", "unknown")
        nodes.append({
            "id": "source",
            "label": source,
            "type": "database" if "db-" in source else "pod"
        })

        last_node = "source"

        details = alert.get("details", {})
        if details.get("username"):
            nodes.append({
                "id": "user",
                "label": details.get("username"),
                "type": "user"
            })
            links.append({"source": "user", "target": "source"})

        if details.get("processPath"):
            nodes.append({
                "id": "process",
                "label": details.get("processPath"),
                "type": "process"
            })
            links.append({"source": "source", "target": "process"})
            last_node = "process"

        if details.get("ipAddress"):
            nodes.append({
                "id": "destination",
                "label": details.get("ipAddress"),
                "type": "external-ip"
            })
            links.append({"source": last_node, "target": "destination"})

        return {"nodes": nodes, "links": links}
