# knowledge_pack.py

class KnowledgePack:
    @staticmethod
    def generate(context: dict) -> str:
        """
        Converts the compiled ContextBuilder dictionary into a structured natural-language
        document optimized for LLM comprehension.
        """
        sections = []

        # === Investigation ===
        inv = context.get("investigation")
        if inv:
            sections.append(
                f"=== Investigation ===\n"
                f"ID: {inv.get('investigation_id', 'N/A')}\n"
                f"Title: {inv.get('title', 'N/A')}\n"
                f"Status: {inv.get('status', 'N/A')}\n"
                f"Severity: {inv.get('severity', 'N/A')}\n"
                f"Risk Score: {inv.get('risk_score', 0.0):.1f}%\n"
                f"Confidence: {inv.get('confidence', 0.0)*100:.0f}%"
            )
        else:
            sections.append("=== Investigation ===\nNo active saved database investigation is open.")

        # === Alert ===
        alert = context.get("alert") or {}
        alert_details = alert.get("details", {})
        
        details_list = []
        for k, v in alert_details.items():
            if isinstance(v, dict):
                v_str = ", ".join(f"{sub_k}={sub_v}" for sub_k, sub_v in v.items())
            elif isinstance(v, list):
                v_str = ", ".join(str(item) for item in v)
            else:
                v_str = str(v)
            details_list.append(f"- {k}: {v_str}")
            
        details_str = "\n".join(details_list)
        sections.append(
            f"=== Alert ===\n"
            f"ID: {alert.get('id', 'N/A')}\n"
            f"Category: {alert.get('category', 'N/A')}\n"
            f"Type: {alert.get('type', 'N/A')}\n"
            f"Source Host: {alert.get('source', 'N/A')}\n"
            f"Details:\n{details_str or 'No alert telemetry details present.'}"
        )

        # === Timeline ===
        timeline = context.get("timeline") or []
        timeline_str = "\n".join(
            f"[{e.get('timestamp')}] {e.get('actor', 'SYSTEM')}: {e.get('title')} - {e.get('description')}"
            for e in timeline
        ) if timeline else "No audit timeline logged."
        sections.append(f"=== Timeline ===\n{timeline_str}")

        # === MITRE ===
        mitre = context.get("mitre") or {}
        sections.append(
            f"=== MITRE ===\n"
            f"Technique ID: {mitre.get('technique_id', 'N/A')}\n"
            f"Technique Name: {mitre.get('technique_name', 'N/A')}\n"
            f"Tactic: {mitre.get('tactic', 'N/A')}\n"
            f"Description: {mitre.get('description', 'N/A')}"
        )

        # === Threat Intelligence ===
        ti = context.get("threat_intelligence") or {}
        sections.append(
            f"=== Threat Intelligence ===\n"
            f"Reputation: {ti.get('reputation', 'N/A')}\n"
            f"Source: {ti.get('source', 'N/A')}\n"
            f"Description: {ti.get('description', 'N/A')}"
        )

        # === Evidence ===
        # SHAP/Risk factors
        shap = context.get("shap_factors") or {}
        factors = shap.get("top_factors", [])
        factors_str = "\n".join(
            f"- Feature '{f.get('feature')}' had anomaly contribution of {f.get('impact', 0.0):.4f}"
            for f in factors
        ) if factors else "No SHAP feature attributions."
        
        # Evidence graph metadata
        graph = context.get("evidence_graph") or {}
        nodes = graph.get("nodes", [])
        links = graph.get("links", [])
        nodes_str = ", ".join(f"{n.get('label')} ({n.get('type')})" for n in nodes)
        links_str = ", ".join(f"{l.get('source')} -> {l.get('target')}" for l in links)
        
        sections.append(
            f"=== Evidence ===\n"
            f"SHAP Attribution Factors:\n{factors_str}\n\n"
            f"Evidence Graph Nodes: {nodes_str or 'N/A'}\n"
            f"Evidence Graph Links: {links_str or 'N/A'}"
        )

        # === Conversation ===
        conv = context.get("conversation") or {}
        recent = conv.get("recent") or []
        recent_str = "\n".join(
            f"{'Analyst' if r.get('sender') == 'user' else 'Vector'}: {r.get('text')}"
            for r in recent
        )
        sections.append(
            f"=== Conversation ===\n"
            f"Summary of older discussions: {conv.get('summary', 'None')}\n\n"
            f"Recent exchanges:\n{recent_str or 'None'}"
        )

        return "\n\n".join(sections)
