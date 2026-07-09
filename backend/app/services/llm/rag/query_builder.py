from __future__ import annotations

from app.services.llm.behavioral_context import BehavioralReasoningContext


class RetrievalQueryBuilder:
    """
    Constructs a deterministic query for RAG retrieval from behavioral context.
    """

    @staticmethod
    def build(
        analyst_question: str | None,
        behavioral_context: BehavioralReasoningContext | None,
    ) -> str:
        """
        Build a deterministic retrieval query from the analyst question and behavioral context fields.
        Deduplicates terms, ignores empty values, limits output to 2000 characters.
        """
        if not behavioral_context or not behavioral_context.is_behavioral:
            return analyst_question or ""

        parts: list[str] = []

        # 1. Analyst Question
        if analyst_question:
            parts.append(analyst_question.strip())

        # 2. Detections titles & rule IDs
        for det in behavioral_context.detections:
            title = det.get("title")
            rule_id = det.get("rule_id")
            if title:
                parts.append(title)
            if rule_id:
                parts.append(rule_id)

        # 3. Process names & command lines
        for proc in behavioral_context.process_evidence:
            process_name = proc.get("process_name")
            cmdline = proc.get("cmdline")
            if process_name:
                parts.append(process_name)
            if cmdline:
                parts.append(cmdline)

        # 4. MITRE technique IDs, names, tactics
        for mitre in behavioral_context.mitre_mappings:
            tech_id = mitre.get("technique_id")
            tech_name = mitre.get("technique_name")
            tactic = mitre.get("tactic")
            if tech_id:
                parts.append(tech_id)
            if tech_name:
                parts.append(tech_name)
            if tactic:
                parts.append(tactic)

        # Deduplicate terms while preserving deterministic order
        seen = set()
        unique_parts = []
        for p in parts:
            clean_part = str(p).strip()
            if clean_part and clean_part not in seen:
                seen.add(clean_part)
                unique_parts.append(clean_part)

        query = " ".join(unique_parts)

        # Cap length at 2000 characters
        if len(query) > 2000:
            query = query[:2000]

        return query
