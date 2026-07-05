# knowledge_pack.py

class KnowledgePack:
    @staticmethod
    def generate(context: dict) -> str:
        """
        Converts the compiled ContextBuilder dictionary into a structured natural-language
        document optimized for LLM comprehension.
        """
        sections = []

        # 1. ## Investigation Overview
        inv = context.get("investigation")
        if inv:
            inv_id = inv.get("investigation_id", "N/A")
            title = inv.get("title", "N/A")
            status = inv.get("status", "N/A")
            severity = inv.get("severity", "N/A")
            risk_score = inv.get("risk_score", 0.0)
            confidence = inv.get("confidence", 0.0) * 100
            
            overview_text = (
                f"The active investigation {inv_id} ('{title}') is currently in the {status} stage. "
                f"It was flagged with a {severity} severity, carrying a calculated risk score of {risk_score:.1f}% "
                f"and an analysis confidence level of {confidence:.0f}%."
            )
        else:
            overview_text = "There is currently no active database investigation record associated with this context."
            
        sections.append(f"## Investigation Overview\n{overview_text}")

        # 2. ## Alert Analysis
        alert = context.get("alert") or {}
        alert_type = alert.get("type", "N/A")
        alert_category = alert.get("category", "N/A")
        source = alert.get("source", "N/A")
        
        details = alert.get("details", {})
        user = details.get("user") or details.get("username") or "an unknown user"
        src_ip = details.get("srcIp") or details.get("sourceIp") or details.get("ipAddress") or "N/A"
        dst_ip = details.get("dstIp") or details.get("destinationIp") or "N/A"
        process = details.get("processPath") or details.get("process") or "N/A"
        cmdline = details.get("commandLine") or details.get("command") or "N/A"
        
        alert_desc = (
            f"This case involves a security alert of type '{alert_type}' in the '{alert_category}' category, "
            f"originating from source host '{source}'."
        )
        
        details_sentences = []
        if user != "an unknown user":
            details_sentences.append(f"The activity was executed by user '{user}'.")
        else:
            details_sentences.append("The executing user could not be determined.")
            
        if src_ip != "N/A" or dst_ip != "N/A":
            ip_str = ""
            if src_ip != "N/A":
                ip_str += f"source IP '{src_ip}'"
            if dst_ip != "N/A":
                if ip_str:
                    ip_str += " and "
                ip_str += f"destination IP '{dst_ip}'"
            details_sentences.append(f"Network parameters associated with the alert include {ip_str}.")
            
        if process != "N/A":
            details_sentences.append(f"The trigger process was '{process}'.")
        if cmdline != "N/A":
            details_sentences.append(f"The associated command execution was: {cmdline}.")
            
        other_details = []
        known_keys = {"user", "username", "srcIp", "sourceIp", "ipAddress", "dstIp", "destinationIp", "processPath", "process", "commandLine", "command"}
        for k, v in details.items():
            if k not in known_keys:
                other_details.append(f"{k} is '{v}'")
        if other_details:
            details_sentences.append(f"Additional telemetry metrics show: {', '.join(other_details)}.")
            
        alert_analysis_text = f"{alert_desc} {' '.join(details_sentences)}"
        sections.append(f"## Alert Analysis\n{alert_analysis_text}")

        # 3. ## Attack Assessment
        mitre = context.get("mitre") or {}
        tech_id = mitre.get("technique_id", "N/A")
        tech_name = mitre.get("technique_name", "N/A")
        tactic = mitre.get("tactic", "N/A")
        mitre_desc = mitre.get("description", "N/A")
        
        ti = context.get("threat_intelligence") or {}
        reputation = ti.get("reputation", "N/A")
        ti_source = ti.get("source", "N/A")
        ti_desc = ti.get("description", "N/A")
        
        assessment_parts = []
        if tech_id != "N/A":
            assessment_parts.append(
                f"From a threat framework perspective, the activity aligns with the MITRE ATT&CK technique "
                f"'{tech_name}' ({tech_id}) under the '{tactic}' tactic. The mapping occurred because the activity "
                f"resembles {mitre_desc.lower() if mitre_desc != 'N/A' else 'the described technique behavior'}."
            )
        else:
            assessment_parts.append("No official MITRE ATT&CK technique mapping has been matched to this alert activity.")
            
        if reputation != "N/A":
            assessment_parts.append(
                f"Threat intelligence queries from '{ti_source}' flag the reputation as '{reputation}'. "
                f"The infrastructure assessment indicates: {ti_desc}."
            )
        else:
            assessment_parts.append("Threat intelligence queries did not return reputation mappings for the associated indicators.")
            
        attack_assessment_text = " ".join(assessment_parts)
        sections.append(f"## Attack Assessment\n{attack_assessment_text}")

        # 4. ## Evidence Summary
        shap = context.get("shap_factors") or {}
        factors = shap.get("top_factors", [])
        
        graph = context.get("evidence_graph") or {}
        nodes = graph.get("nodes", [])
        links = graph.get("links", [])
        
        evidence_parts = []
        user_info = user if (user and user != "an unknown user") else "unidentified"
        evidence_parts.append(
            f"The primary scope of evidence centers on host '{source}' and user '{user_info}'."
        )
        
        if factors:
            factor_sentences = []
            for f in factors:
                factor_sentences.append(f"feature '{f.get('feature')}' contributing an anomaly impact of {f.get('impact', 0.0):.4f}")
            evidence_parts.append(
                f"The anomaly score is heavily influenced by SHAP feature attributions, specifically: {', '.join(factor_sentences)}."
            )
        else:
            evidence_parts.append("No specific SHAP anomaly score feature attributions were calculated.")
            
        if nodes or links:
            nodes_str = ", ".join(f"{n.get('label')} ({n.get('type')})" for n in nodes)
            links_str = ", ".join(f"{l.get('source')} -> {l.get('target')}" for l in links)
            evidence_parts.append(
                f"The evidence relationship graph links the following entities: {nodes_str}. "
                f"Observed behavioral paths show connection transitions: {links_str}."
            )
        else:
            evidence_parts.append("The evidence relationship graph has no recorded entity linkages.")
            
        evidence_summary_text = " ".join(evidence_parts)
        sections.append(f"## Evidence Summary\n{evidence_summary_text}")

        # 5. ## Investigation Timeline
        timeline = context.get("timeline") or []

        if timeline:

            first = timeline[0]
            last = timeline[-1]

            summary = []

            summary.append(
                f"The investigation began when {first.get('actor','SYSTEM')} recorded '{first.get('title','an event')}'."
            )

            if len(timeline) > 2:
                summary.append(
                    f"During the investigation, {len(timeline)-2} additional events were recorded documenting the progression of the case."
                )

            summary.append(
                f"The most recent activity was '{last.get('title','an event')}', recorded by {last.get('actor','SYSTEM')}."
            )

            timeline_text = " ".join(summary)

        else:

            timeline_text = (
                "No investigation timeline has been recorded."
            )
            
        sections.append(f"## Investigation Timeline\n{timeline_text}")

        # 6. ## Previous Conversation
        conv = context.get("conversation") or {}
        recent = conv.get("recent") or []
        recent_str = "\n".join(
            f"{'Analyst' if r.get('sender') == 'user' else 'Vector'}: {r.get('text')}"
            for r in recent
        )
        
        conversation_text = (
            f"Summary of older discussions: {conv.get('summary', 'None')}\n\n"
            f"Recent exchanges:\n{recent_str or 'None'}"
        )
        sections.append(f"## Previous Conversation\n{conversation_text}")

        return "\n\n".join(sections)
