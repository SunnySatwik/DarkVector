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

        # 1. Behavioral Detection Evidence
        beh = context.get("behavioral_context")
        if beh and beh.get("detections"):
            citations.append("Behavioral Detection Evidence")

        # 2. Process Execution Evidence
        proc_ev = context.get("process_evidence")
        if proc_ev:
            citations.append("Process Execution Evidence")

        # 3. Detection Correlation
        corr = context.get("correlation_context")
        if corr:
            citations.append("Detection Correlation")

        # 4. MITRE ATT&CK (Deduplicated and sorted technique IDs)
        mitre_mappings = context.get("mitre_mappings") or []
        if mitre_mappings:
            for mapping in mitre_mappings:
                tech_id = mapping.get("technique_id")
                if tech_id and tech_id != "N/A":
                    citations.append(f"MITRE ATT&CK {tech_id}")
        else:
            # Fallback legacy single-mitre mapping
            mitre = context.get("mitre") or {}
            tech_id = mitre.get("technique_id")
            if tech_id and tech_id != "N/A":
                citations.append(f"MITRE ATT&CK {tech_id}")

        # 5. Threat Intelligence
        ti = context.get("threat_intelligence") or {}
        reputation = ti.get("reputation")
        if reputation and reputation != "N/A":
            citations.append("Threat Intelligence")

        # 6. SHAP factors
        shap = context.get("shap_factors") or {}
        if shap and shap.get("top_factors"):
            citations.append("SHAP Feature Attribution")

        # 7. Evidence Graph
        graph = context.get("evidence_graph") or {}
        if graph and graph.get("nodes"):
            citations.append("Evidence Graph")

        # 8. Timeline
        timeline = context.get("timeline") or []
        if timeline:
            citations.append("Investigation Timeline")

        # 9. Conversation History
        conv = context.get("conversation") or {}
        if conv and (conv.get("recent") or conv.get("summary")):
            citations.append("Conversation History")

        # 10. Retrieved RAG Documents
        retrieved_docs = context.get("retrieved_documents") or []
        seen_rag = set()
        for doc in retrieved_docs:
            if doc.id not in seen_rag:
                seen_rag.add(doc.id)
                if doc.source:
                    citations.append(f"Knowledge: {doc.title} ({doc.source})")
                else:
                    citations.append(f"Knowledge: {doc.title}")

        # Deduplicate citations while preserving deterministic order
        unique_citations = []
        seen = set()
        for c in citations:
            if c not in seen:
                seen.add(c)
                unique_citations.append(c)

        return unique_citations
