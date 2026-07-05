# citations.py

class EvidenceCitationBuilder:
    @staticmethod
    def build(context: dict) -> list[str]:
        """
        Determines what evidence components exist in the active investigation context
        and builds a list of clean citation strings.
        
        Args:
            context: Compiled ContextBuilder dictionary.
            
        Returns:
            A list of source citation strings in a deterministic, sequential order.
        """
        citations = []

        # 1. MITRE ATT&CK
        mitre = context.get("mitre") or {}
        tech_id = mitre.get("technique_id")
        if tech_id and tech_id != "N/A":
            citations.append(f"MITRE ATT&CK {tech_id}")

        # 2. Threat Intelligence
        ti = context.get("threat_intelligence") or {}
        reputation = ti.get("reputation")
        if reputation and reputation != "N/A":
            citations.append("Threat Intelligence")

        # 3. SHAP factors
        shap = context.get("shap_factors") or {}
        if shap and shap.get("top_factors"):
            citations.append("SHAP Feature Attribution")

        # 4. Evidence Graph
        graph = context.get("evidence_graph") or {}
        if graph and graph.get("nodes"):
            citations.append("Evidence Graph")

        # 5. Timeline
        timeline = context.get("timeline") or []
        if timeline:
            citations.append("Investigation Timeline")

        # 6. Conversation History
        conv = context.get("conversation") or {}
        if conv and (conv.get("recent") or conv.get("summary")):
            citations.append("Conversation History")

        return citations
