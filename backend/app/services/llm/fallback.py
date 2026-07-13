# fallback.py

class FallbackAI:
    @staticmethod
    def generate_summary(
        alert_data: dict,
        risk_score: float,
        severity: str,
        anomaly_score: float,
    ) -> str:
        category = alert_data.get("category", "unknown")
        source = alert_data.get("source", "an unknown host")
        alert_type = alert_data.get("type", "an anomalous event")
        print("[FALLBACK] Generating summary fallback")
        _category_context = {
            "process": (
                f"I spotted a process on `{source}` that spawned outside the expected "
                f"execution chain — the binary doesn't match anything in this host's "
                f"normal runtime profile."
            ),
            "network": (
                f"I found an outbound connection from `{source}` that doesn't match "
                f"this server's known egress patterns. The destination has no prior "
                f"history from this host."
            ),
            "authentication": (
                f"I noticed unusual authentication activity on `{source}` that doesn't "
                f"fit this account's historical access pattern. The timing and origin "
                f"are both out of character."
            ),
            "system": (
                f"I detected privilege changes on `{source}` that opened escalation "
                f"paths beyond the expected role boundary — a common precursor to "
                f"lateral movement."
            ),
        }

        _base = _category_context.get(
            category,
            f"I detected anomalous activity from `{source}` that deviates significantly "
            f"from the established baseline for this host type.",
        )

        return (
            f"{_base}\n\n"
            f"The alert type is **{alert_type}** and at a risk score of "
            f"**{risk_score:.1f}**, this sits in the {severity.upper()} range. "
            f"I'd recommend reviewing the process tree and recent network connections "
            f"before closing this case."
        )

    @staticmethod
    def generate_chat(
        investigation,
        timeline: list,
        message: str,
        history: list = None,
        policy = None
    ) -> str:
        q = message.lower()
        # Retrieve properties from investigation database model or dictionary
        if hasattr(investigation, "alert_json"):
            alert_json = investigation.alert_json or {}
            analysis_json = investigation.analysis_json or {}
            status_str = str(getattr(investigation, "status", "")).lower()
        else:
            alert_json = investigation.get("alert_json", {})
            analysis_json = investigation.get("analysis_json", {})
            status_str = str(investigation.get("status", "")).lower()

        alert_details = alert_json.get("details", {})
        source = alert_json.get("source", "unknown host")
        context = analysis_json.get("context", {})
        is_contained = "contained" in status_str
        print("[FALLBACK] Generating chat fallback")

        # Check for focused scope severity/risk explanations (Requirement 9)
        from app.services.llm.policy import ResponseScope
        if policy and (policy.scope == ResponseScope.FOCUSED or policy.route.value == "risk_analysis"):
            # Resolve title from investigation title, falling back to alert_json
            title = getattr(investigation, "title", None)
            if not title and alert_json:
                title = alert_json.get("type")
            if not title:
                title = "Anomalous Behavior"
                
            # Safely extract raw string value of severity enum
            sev_attr = getattr(investigation, "severity", "HIGH")
            if hasattr(sev_attr, "value"):
                sev_attr = sev_attr.value
            elif isinstance(sev_attr, dict) and "value" in sev_attr:
                sev_attr = sev_attr["value"]
            sev = str(sev_attr).upper()
            if "SEVERITY." in sev:
                sev = sev.split("SEVERITY.")[-1]

            risk = getattr(investigation, "risk_score", 90.0) if hasattr(investigation, "risk_score") else investigation.get("risk_score", 90.0)
            
            # Safely fetch detection confidence
            det_conf = None
            if hasattr(investigation, "confidence") and getattr(investigation, "confidence") is not None:
                det_conf = getattr(investigation, "confidence")
            elif "confidence" in alert_json:
                det_conf = alert_json["confidence"]
            elif "confidence" in alert_details:
                det_conf = alert_details["confidence"]
            
            conf_str = ""
            if det_conf is not None:
                val = float(det_conf)
                if val <= 1.0:
                    val = val * 100
                conf_str = f" with {val:.0f}% detection confidence"

            mitre = context.get("mitre") or {}
            tech_id = mitre.get("technique_id")
            tech_name = mitre.get("technique_name")
            mitre_str = f" mapped to MITRE ATT&CK {tech_id} ({tech_name})" if tech_id else ""
            
            return (
                f"This investigation was classified as {sev} severity with a risk score of {risk:.1f}% "
                f"because the detected activity matched the behavioral pattern for '{title}'{mitre_str}.\n\n"
                f"The underlying detection was identified{conf_str}. "
                f"The classification reflects the risk of the observed behavioral pattern. "
                f"The available evidence confirms the execution, but does not by itself establish malicious intent or host compromise."
            )



        if "isolate" in q or "quarantine" in q:
            return (
                f"I'd recommend isolating **`{source}`** now. Use the **Isolate host** action "
                f"in the panel above — it'll cut the host's outbound connections and update the "
                f"investigation status to Contained. Once isolated, review the process tree "
                f"before deciding on a full image rebuild."
            )
        elif "shap" in q:
            # Case B: SHAP question but data is absent
            explanation = analysis_json.get("explanation", {})
            factors = explanation.get("top_factors", [])
            if factors:
                factor_strs = []
                for f in factors:
                    feat = f.get("feature", "unknown feature")
                    impact = f.get("impact", 0)
                    factor_strs.append(f"- **{feat}** — {int(impact * 100)}% of the risk score")
                return (
                    "Here's what stood out to me:\n\n"
                    + "\n".join(factor_strs)
                    + "\n\nNone of these alone would be alarming, but together they're a clear outlier from this source's normal pattern."
                )
            else:
                return "SHAP feature attribution data is currently unavailable for this investigation."
        elif "explain" in q or "why" in q:
            explanation = analysis_json.get("explanation", {})
            factors = explanation.get("top_factors", [])
            if factors:
                factor_strs = []
                for f in factors:
                    feat = f.get("feature", "unknown feature")
                    impact = f.get("impact", 0)
                    factor_strs.append(f"- **{feat}** — {int(impact * 100)}% of the risk score")
                return (
                    "Here's what stood out to me:\n\n"
                    + "\n".join(factor_strs)
                    + "\n\nNone of these alone would be alarming, but together they're a clear outlier from this source's normal pattern."
                )
            else:
                return "I flagged this based on the overall deviation from baseline — there isn't detailed attribution data for this specific alert."
        elif "cve" in q or "mitre" in q or "threat" in q:
            mitre = context.get("mitre")
            ti = context.get("threat_intelligence")
            if mitre:
                tech_id = mitre.get("technique_id", "T1611")
                tech_name = mitre.get("technique_name", "Escape to Host")
                tactic = mitre.get("tactic", "Privilege Escalation")
                desc = mitre.get("description", "")
                ti_rep = ti.get("reputation", "unknown") if ti else "unknown"
                return (
                    f"One thing that caught my attention is that this maps to **MITRE ATT&CK {tech_id} – {tech_name}** "
                    f"(Tactic: **{tactic}**).\n\n{desc}\n\nThe source reputation is marked as **{ti_rep}**. "
                    f"I'd review recent kernel and container patch levels before closing this case."
                )
            else:
                return (
                    "I don't have MITRE context loaded for this alert yet — try re-running the analysis. "
                    "In general, the pattern here is consistent with container escape or privilege escalation techniques."
                )
        else:
            status_suffix = "isolated — no further egress is possible from this node" if is_contained else "still active, so the threat window is open"
            return (
                f"Right now, **`{source}`** is {status_suffix}. What would you like to focus on next?"
            )


    @staticmethod
    def generate_report(investigation, timeline: list) -> str:
        # Retrieve properties from database model or dictionary
        if hasattr(investigation, "alert_json"):
            alert_json = investigation.alert_json or {}
            analysis_json = investigation.analysis_json or {}
            risk_score = investigation.risk_score
            severity = str(investigation.severity)
        else:
            alert_json = investigation.get("alert_json", {})
            analysis_json = investigation.get("analysis_json", {})
            risk_score = investigation.get("risk_score", 0.0)
            severity = str(investigation.get("severity", "LOW"))

        source = alert_json.get("source", "unknown host")
        alert_type = alert_json.get("type", "anomalous event")
        
        context = analysis_json.get("context", {})
        mitre = context.get("mitre", {})
        ti = context.get("threat_intelligence", {})
        
        tech_id = mitre.get("technique_id", "N/A")
        tech_name = mitre.get("technique_name", "N/A")
        ti_rep = ti.get("reputation", "unknown")
        print("[FALLBACK] Generating report fallback")
        return (
            f"### Executive Summary\n"
            f"I reviewed the security incident involving **{source}** and identified high-risk anomalous activity. "
            f"The system detected event type **{alert_type}** with a risk score of **{risk_score:.1f}** ({severity} severity).\n\n"
            f"### Technical Findings\n"
            f"- **Host Affected:** {source}\n"
            f"- **MITRE Technique:** {tech_id} ({tech_name})\n"
            f"- **Threat Reputation:** {ti_rep}\n"
            f"- **Audit Trail:** {len(timeline)} logged timeline events analyze the progression from detection to review.\n\n"
            f"### Business Impact\n"
            f"Unauthorized activity on {source} presents a potential compromise path. "
            f"If uncontained, this could lead to privilege escalation, lateral movement, or data exfiltration within the production cluster.\n\n"
            f"### Recommendations\n"
            f"1. Isolate the affected host immediately to cut off potential command-and-control communication.\n"
            f"2. Inspect active processes and shell histories on the host to determine the intrusion vector.\n"
            f"3. Verify and update Kubernetes service account permissions to prevent token theft."
        )
