# context_builder.py

from sqlalchemy.orm import Session
from app.services.investigation_service import InvestigationService
from app.repositories.investigation_repository import InvestigationRepository
from app.repositories.timeline_repository import TimelineRepository
from app.services.llm.memory import ConversationMemory
from app.services.context.mitre_mapping import lookup_by_id


class ContextBuilder:
    @staticmethod
    def _enum_value(value) -> str:
        if value is None:
            return "N/A"
        return value.value if hasattr(value, "value") else str(value)

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
                investigation = InvestigationService.get_investigation(
                    db, investigation_id
                )
            if not investigation and alert_id:
                investigation = InvestigationRepository.get_by_alert_id(
                    db, alert_id
                )

        # Retrieve detection_json if investigation is loaded
        detection_json = None
        if investigation:
            detection_json = getattr(investigation, "detection_json", None)
            alert_data = alert_data or investigation.alert_json
            analysis_json = analysis_json or investigation.analysis_json
            if risk_score is None:
                risk_score = investigation.risk_score
            if severity is None:
                severity = investigation.severity
            if db and not timeline_events:
                timeline_repo = TimelineRepository(db)
                timeline_events = timeline_repo.list_for_investigation(
                    investigation.investigation_id
                )

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
            threat_intelligence = (
                threat_intelligence
                or analysis_context.get("threat_intelligence", {})
            )
            shap_factors = analysis_json.get("explanation", {})
            if risk_score is None:
                risk_score = (
                    analysis_json.get("analysis", {})
                    .get("risk_score")
                )
            if severity is None:
                severity = (
                    analysis_json.get("analysis", {}).get("severity")
                )

        # Ingest conversation memory
        conversation = ConversationMemory.build(history, recent_message)

        # Build evidence graph metadata
        evidence_graph = {}
        if alert_data:
            evidence_graph = ContextBuilder._build_graph_metadata(
                alert_data, analysis_context
            )

        # Resolve behavioral context from detection_json
        behavioral_context = None
        correlation_context = None
        process_evidence = []
        mitre_mappings = []
        recommendations = []

        if detection_json:
            behavioral_context = (
                ContextBuilder._normalize_behavioral_context(detection_json)
            )
            if behavioral_context:
                dets = behavioral_context["detections"]
                primary_det = behavioral_context["primary_detection"]

                correlation_context = (
                    ContextBuilder._build_correlation_context(
                        behavioral_context
                    )
                )
                process_evidence = ContextBuilder._extract_process_evidence(
                    dets
                )
                mitre_mappings = ContextBuilder._aggregate_mitre_context(dets)

                # Aggregate recommendations (deduplicate deterministically)
                seen_recs = set()
                for d in dets:
                    for rec in d.get("recommendations") or []:
                        if rec not in seen_recs:
                            seen_recs.add(rec)
                            recommendations.append(rec)

                # Fallback for mitre mapping if legacy mitre mapping is missing
                if primary_det and not mitre:
                    tech_id = primary_det.get("mitre_technique")
                    if tech_id:
                        mitre = lookup_by_id(
                            tech_id,
                            default_tactic=primary_det.get("mitre_tactic"),
                        )

                # Fallbacks for aggregate severity/risk score if not loaded
                if severity is None and correlation_context:
                    severity = correlation_context["aggregate_severity"]
                if risk_score is None and correlation_context:
                    risk_score = float(
                        correlation_context["aggregate_confidence"]
                    )

        return {
            "investigation": (
                {
                    "investigation_id": (
                        investigation.investigation_id
                        if investigation
                        else "N/A"
                    ),
                    "title": (
                        investigation.title
                        if investigation
                        else (
                            alert_data.get("type") if alert_data else "N/A"
                        )
                    ),
                    "status": (
                        ContextBuilder._enum_value(investigation.status)
                        if investigation
                        else "N/A"
                    ),
                    "severity": (
                        ContextBuilder._enum_value(severity)
                        if severity is not None
                        else "N/A"
                    ),
                    "risk_score": (
                        risk_score if risk_score is not None else 0.0
                    ),
                    "confidence": (
                        investigation.confidence
                        if investigation
                        else (
                            analysis_json.get("analysis", {})
                            .get("confidence", 0.0)
                            if analysis_json
                            else 0.0
                        )
                    ),
                }
                if (investigation or alert_data or detection_json)
                else None
            ),
            "alert": alert_data,
            "timeline": timeline,
            "mitre": mitre,
            "threat_intelligence": threat_intelligence,
            "analysis_context": analysis_context,
            "shap_factors": shap_factors,
            "conversation": conversation,
            "current_page": current_page,
            "evidence_graph": evidence_graph,
            "behavioral_context": behavioral_context,
            "correlation_context": correlation_context,
            "process_evidence": process_evidence,
            "mitre_mappings": mitre_mappings,
            "recommendations": recommendations,
        }

    @staticmethod
    def _normalize_behavioral_context(detection_json: dict) -> dict | None:
        if not detection_json:
            return None

        if "detections" in detection_json:
            correlation_id = detection_json.get("correlation_id") or "N/A"
            group_size = detection_json.get("group_size") or len(
                detection_json.get("detections", [])
            )
            primary_detection = detection_json.get("primary_detection")
            detections = detection_json.get("detections") or []
        else:
            correlation_id = detection_json.get("id") or "N/A"
            group_size = 1
            primary_detection = detection_json
            detections = [detection_json]

        normalized_dets = []
        for d in detections:
            normalized_dets.append({
                "id": d.get("id") or "N/A",
                "rule_id": d.get("rule_id") or "N/A",
                "title": d.get("title") or "N/A",
                "description": d.get("description") or "N/A",
                "severity": d.get("severity") or "N/A",
                "confidence": d.get("confidence") or 0,
                "host_id": d.get("host_id") or "N/A",
                "process_guid": d.get("process_guid") or "N/A",
                "timestamp": d.get("timestamp") or 0.0,
                "mitre_technique": d.get("mitre_technique"),
                "mitre_tactic": d.get("mitre_tactic"),
                "recommendations": d.get("recommendations") or [],
                "evidence": d.get("evidence") or [],
                "metadata": d.get("metadata") or {},
            })

        normalized_primary = None
        if primary_detection:
            normalized_primary = {
                "id": primary_detection.get("id") or "N/A",
                "rule_id": primary_detection.get("rule_id") or "N/A",
                "title": primary_detection.get("title") or "N/A",
                "description": primary_detection.get("description") or "N/A",
                "severity": primary_detection.get("severity") or "N/A",
                "confidence": primary_detection.get("confidence") or 0,
                "host_id": primary_detection.get("host_id") or "N/A",
                "process_guid": primary_detection.get("process_guid") or "N/A",
                "timestamp": primary_detection.get("timestamp") or 0.0,
                "mitre_technique": primary_detection.get("mitre_technique"),
                "mitre_tactic": primary_detection.get("mitre_tactic"),
                "recommendations": primary_detection.get("recommendations") or [],
                "evidence": primary_detection.get("evidence") or [],
                "metadata": primary_detection.get("metadata") or {},
            }
        elif normalized_dets:
            normalized_primary = normalized_dets[0]

        return {
            "correlation_id": correlation_id,
            "group_size": group_size,
            "primary_detection": normalized_primary,
            "detections": normalized_dets,
        }

    @staticmethod
    def _build_correlation_context(behavioral_context: dict) -> dict | None:
        dets = behavioral_context.get("detections") or []
        if not dets:
            return None

        timestamps = [d["timestamp"] for d in dets if d.get("timestamp")]
        first_seen = min(timestamps) if timestamps else 0.0
        last_seen = max(timestamps) if timestamps else 0.0
        duration = last_seen - first_seen

        process_guids = sorted(
            list(
                set(
                    d["process_guid"]
                    for d in dets
                    if d.get("process_guid")
                )
            )
        )
        mitre_techniques = sorted(
            list(
                set(
                    d["mitre_technique"]
                    for d in dets
                    if d.get("mitre_technique")
                )
            )
        )
        mitre_tactics = sorted(
            list(
                set(d["mitre_tactic"] for d in dets if d.get("mitre_tactic"))
            )
        )

        severity_order = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}
        agg_sev = max(
            dets,
            key=lambda d: severity_order.get(d["severity"].upper(), 0),
        )["severity"]
        agg_conf = max(d["confidence"] for d in dets)

        return {
            "correlation_id": behavioral_context.get("correlation_id"),
            "number_of_detections": len(dets),
            "first_seen": first_seen,
            "last_seen": last_seen,
            "duration": duration,
            "primary_detection": behavioral_context.get("primary_detection"),
            "involved_process_guids": process_guids,
            "mitre_techniques": mitre_techniques,
            "mitre_tactics": mitre_tactics,
            "aggregate_severity": agg_sev,
            "aggregate_confidence": agg_conf,
        }

    @staticmethod
    def _extract_process_evidence(detections: list[dict]) -> list[dict]:
        processes_by_guid = {}
        for d in detections:
            guid = d.get("process_guid")
            if not guid:
                continue

            evidence_list = d.get("evidence") or []
            if isinstance(evidence_list, dict):
                evidence_list = [evidence_list]
            elif not isinstance(evidence_list, list):
                evidence_list = []

            main_node = evidence_list[0] if evidence_list else {}

            # Map attributes exactly from the persisted evidence keys.
            # Treat process_guid strictly as an opaque identifier:
            # DO NOT parse PID, create time, host ID from it. Leave them absent if unavailable.
            proc_info = {
                "process_guid": guid,
            }

            if "PID" in main_node and main_node["PID"] is not None:
                proc_info["pid"] = main_node["PID"]
            if (
                "Parent PID" in main_node
                and main_node["Parent PID"] is not None
            ):
                proc_info["ppid"] = main_node["Parent PID"]
            if (
                "Process Name" in main_node
                and main_node["Process Name"] is not None
            ):
                proc_info["process_name"] = main_node["Process Name"]
            if (
                "Executable" in main_node
                and main_node["Executable"] is not None
            ):
                proc_info["executable"] = main_node["Executable"]
            if (
                "Command Line" in main_node
                and main_node["Command Line"] is not None
            ):
                proc_info["cmdline"] = main_node["Command Line"]
            if (
                "Username" in main_node
                and main_node["Username"] is not None
            ):
                proc_info["username"] = main_node["Username"]
            if (
                "Parent Process" in main_node
                and main_node["Parent Process"] is not None
            ):
                proc_info["parent_info"] = main_node["Parent Process"]

            if guid not in processes_by_guid:
                processes_by_guid[guid] = proc_info
            else:
                for k, v in proc_info.items():
                    if (
                        k not in processes_by_guid[guid]
                        or processes_by_guid[guid][k] is None
                    ):
                        processes_by_guid[guid][k] = v

        return [processes_by_guid[g] for g in sorted(processes_by_guid.keys())]

    @staticmethod
    def _aggregate_mitre_context(detections: list[dict]) -> list[dict]:
        mitre_mappings = []
        seen_ids = set()
        for d in detections:
            tech_id = d.get("mitre_technique")
            if tech_id and tech_id not in seen_ids:
                seen_ids.add(tech_id)
                mapping = lookup_by_id(
                    tech_id, default_tactic=d.get("mitre_tactic")
                )
                mitre_mappings.append(mapping)
        return sorted(mitre_mappings, key=lambda m: m["technique_id"])

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
            "type": "database" if "db-" in source else "pod",
        })

        last_node = "source"

        details = alert.get("details", {})
        if details.get("username"):
            nodes.append({
                "id": "user",
                "label": details.get("username"),
                "type": "user",
            })
            links.append({"source": "user", "target": "source"})

        if details.get("processPath"):
            nodes.append({
                "id": "process",
                "label": details.get("processPath"),
                "type": "process",
            })
            links.append({"source": "source", "target": "process"})
            last_node = "process"

        if details.get("ipAddress"):
            nodes.append({
                "id": "destination",
                "label": details.get("ipAddress"),
                "type": "external-ip",
            })
            links.append({"source": last_node, "target": "destination"})

        return {"nodes": nodes, "links": links}
