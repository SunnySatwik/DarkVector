# response_validator.py

import re
from typing import Any



class ResponseValidator:
    @staticmethod
    def validate_placeholders(text: str) -> None:
        """
        Rejects responses containing generic AI template placeholders or standard AI disclaimers.
        """
        forbidden_phrases = [
            "as an ai",
            "as an ai language model",
            "i don't have enough context",
            "please provide",
            "upload",
        ]
        lower_text = text.lower()
        for phrase in forbidden_phrases:
            if phrase in lower_text:
                raise ValueError(
                    f"Response validator failed: Forbidden placeholder phrase detected: '{phrase}'"
                )

    @staticmethod
    def validate_investigation_consistency(
        text: str, knowledge_doc: str
    ) -> None:
        """
        Rejects responses referencing investigation IDs that are not present in the Knowledge Pack.
        """
        if not knowledge_doc:
            return

        response_ids = set(re.findall(r"\bINV-[A-Za-z0-9\-]+", text))
        knowledge_ids = set(re.findall(r"\bINV-[A-Za-z0-9\-]+", knowledge_doc))

        for r_id in response_ids:
            if r_id not in knowledge_ids:
                raise ValueError(
                    f"Response validator failed: Hallucinated investigation ID detected: '{r_id}'"
                )

    @staticmethod
    def _extract_canonical_severity(knowledge_doc: str) -> str | None:
        """
        Extracts the canonical aggregate severity deterministically from the Knowledge Document.
        Prioritizes the explicit severity under the "## Investigation Overview" section,
        falling back to the first line-level severity declaration, and finally any first occurrence.
        This prevents accidentally matching a member detection severity if it appears elsewhere.
        """
        # 1. Look specifically within ## Investigation Overview if it exists
        overview_match = re.search(
            r"## Investigation Overview.*?(?:severity:\s*(low|medium|high|critical))",
            knowledge_doc,
            re.DOTALL | re.IGNORECASE
        )
        if overview_match:
            return overview_match.group(1).upper()

        # 2. Look for severity: at the start of a line/document
        line_match = re.search(
            r"(?:^|\n)(?:investigation\s+)?severity:\s*(low|medium|high|critical)",
            knowledge_doc,
            re.IGNORECASE
        )
        if line_match:
            return line_match.group(1).upper()

        # 3. Fallback to any first occurrence
        general_match = re.search(
            r"severity:\s*(low|medium|high|critical)",
            knowledge_doc,
            re.IGNORECASE
        )
        if general_match:
            return general_match.group(1).upper()

        return None

    @staticmethod
    def validate_severity_consistency(text: str, knowledge_doc: str) -> None:
        """
        Rejects responses that explicitly assert an aggregate investigation severity that
        contradicts the expected one. Only rejects explicit overall-severity assertion
        patterns — not contextual, comparative, or per-detection severity language.
        """
        if not knowledge_doc:
            return

        expected_severity = ResponseValidator._extract_canonical_severity(knowledge_doc)
        if not expected_severity:
            return

        severities = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
        other_severities = severities - {expected_severity}

        # Explicit aggregate severity assertion patterns — only these are checked.
        # Each pattern captures one severity word in the assertion context.
        _AGGREGATE_PATTERNS = [
            # 1. The overall/investigation is/has/carries [a] severity
            r"\bthe\s+(?:overall\s+)?investigation\s+(?:severity\s+)?(?:is|has\s+been|was|has|carries)\s+(?:a\s+)?{sev}(?:\s+severity)?(?:\s+rating)?\b",
            # 2. Overall severity [is/:/...] severity
            r"\boverall\s+severity\s*(?:is|has\s+been|was|has|classified\s+as|assessed\s+as)?\s*(?::\s*)?{sev}\b",
            # 3. This is a severity severity investigation
            r"\bthis\s+is\s+a\s+{sev}\s+(?:severity\s+)?investigation\b",
            # 4. The overall/case [severity] is/has [a] severity
            r"\bthe\s+(?:overall\s+)?case\s+(?:severity\s+)?(?:is|has\s+been|was|has)\s+(?:a\s+)?{sev}(?:\s+severity)?\b",
            # 5. I/we assess the overall/investigation/case as severity
            r"\b(?:i|we)\s+assess\s+the\s+(?:overall\s+)?(?:investigation|case)\s+as\s+{sev}(?:\s+severity)?\b",
            # 6. overall case severity is/was...
            r"\boverall\s+case\s+severity\s+is\s+{sev}\b",
            # 7. case severity : severity
            r"\bcase\s+severity\s*:\s*{sev}\b",
            # 8. investigation is classified as...
            r"\binvestigation\s+is\s+classified\s+as\s+{sev}\b"
        ]

        text_lower = text.lower()
        for sev in other_severities:
            sev_lower = sev.lower()
            for pattern_template in _AGGREGATE_PATTERNS:
                pattern = pattern_template.format(sev=sev_lower)
                if re.search(pattern, text_lower):
                    raise ValueError(
                        f"Response validator failed: Response explicitly asserts aggregate "
                        f"investigation severity as '{sev}' (Contradicting severity '{sev}' "
                        f"detected for the overall investigation). Expected '{expected_severity}'."
                    )

    @staticmethod
    def validate_mitre_consistency(text: str, knowledge_doc: str) -> None:
        """
        Rejects responses referencing MITRE Technique IDs not present in the Knowledge Pack.
        """
        if not knowledge_doc:
            return

        response_techs = set(re.findall(r"\bT\d{4}(?:\.\d{3})?\b", text))
        if not response_techs:
            return

        knowledge_techs = set(
            re.findall(r"\bT\d{4}(?:\.\d{3})?\b", knowledge_doc)
        )

        for r_tech in response_techs:
            if r_tech not in knowledge_techs:
                raise ValueError(
                    f"Response validator failed: Hallucinated MITRE Technique ID detected: '{r_tech}'"
                )

    @staticmethod
    def validate_process_claims(text: str, knowledge_doc: str) -> None:
        """
        Rejects responses introducing executable/file tokens absent from context.
        """
        if not knowledge_doc:
            return

        tokens = re.findall(
            r"\b[\w\.\-]+\.(?:exe|ps1|bat|cmd|dll)\b", text, re.IGNORECASE
        )
        if not tokens:
            return

        doc_lower = knowledge_doc.lower()
        for token in tokens:
            if token.lower() not in doc_lower:
                raise ValueError(
                    f"Response validator failed: Unsupported process/file claim detected: '{token}'"
                )

    @staticmethod
    def validate_confidence_semantics(text: str, knowledge_doc: str = None) -> None:
        """
        Rejects absolute certainty claims and incorrect semantic interpretations of legacy ML confidence.
        """
        forbidden = [
            "100% confirmed compromise",
            "confidence proves compromise",
            "definitely compromised",
        ]
        text_lower = text.lower()
        for phrase in forbidden:
            if phrase in text_lower:
                raise ValueError(
                    f"Response validator failed: Prohibited absolute certainty claim detected: '{phrase}'"
                )

        forbidden_reinterpretations = [
            "my analysis confidence",
            "my confidence is",
            "analysis confidence is",
            "analyst confidence is",
            "analysis confidence rating",
            "analyst confidence rating",
            "probability of compromise",
            "probability of attacker activity",
            "probability of malicious activity",
            "probability of malicious intent",
            "confidence that this is an attack",
            "confident that this is an attack",
            "confident that this is compromise",
        ]

        for phrase in forbidden_reinterpretations:
            if phrase in text_lower:
                raise ValueError(
                    f"Response validator failed: Prohibited aggregate confidence reinterpretation detected: '{phrase}'"
                )

        # Check if legacy ML investigation based on knowledge doc content
        is_legacy = False
        if knowledge_doc:
            is_legacy = "## Alert Analysis" in knowledge_doc or "ML analysis" in knowledge_doc

        if is_legacy:
            legacy_forbidden = [
                "pattern-matching accuracy",
                "pattern matching accuracy",
                "accuracy of the detection",
                "accuracy and strength of the detection",
                "reliability of our pattern-matching",
                "reliability of pattern-matching",
                "reliability of the pattern-matching",
                "reliability of pattern matching",
                "reliability of the pattern matching",
                "accuracy of the pattern",
                "accuracy and strength of the pattern",
                "gauges the accuracy",
                "gauges the strength of the detection",
                "reliability of our detection",
                "reliability of the detection logic",
                "accuracy of the detection logic",
                "ai confidence",
                "analyst confidence",
            ]
            for phrase in legacy_forbidden:
                if phrase in text_lower:
                    raise ValueError(
                        f"Response validator failed: Prohibited legacy confidence reinterpretation detected: '{phrase}'"
                    )


    @staticmethod
    def validate_evidence_references(text: str) -> None:
        """
        Rejects responses containing key analysis terms if the 'Evidence Used' section is missing.
        """
        trigger_words = [
            "recommendations",
            "severity",
            "malicious",
            "critical",
            "attack",
        ]
        lower_text = text.lower()

        has_trigger = any(w in lower_text for w in trigger_words)
        if has_trigger:
            if "evidence used" not in lower_text:
                raise ValueError(
                    "Response validator failed: Response contains key analysis terms but lacks an 'Evidence Used' section."
                )

    @classmethod
    def validate_policy_conformance(cls, text: str, policy: Any = None) -> None:
        """
        Enforces policy restrictions structurally on the output.
        - Checks for forbidden headers (e.g. "### Business Impact").
        - If SHAP is excluded, rejects headers containing SHAP.
        """
        if not policy:
            return

        text_lower = text.lower()
        
        # Check explicit forbidden section headings
        for forbidden in policy.forbidden_sections:
            if forbidden.lower() in text_lower:
                # Match exact section header string
                raise ValueError(
                    f"Response validator failed: Forbidden section header or keyword '{forbidden}' detected in response."
                )

        # If SHAP is excluded, make sure we do not have a SHAP attribution section header
        from app.services.llm.policy import EvidenceCategory
        if EvidenceCategory.SHAP_EVIDENCE in policy.excluded_evidence:
            shap_header_pattern = r"(?:^|\n)\s*#+\s*[^#\n]*\bshap\b"
            if re.search(shap_header_pattern, text_lower):
                raise ValueError(
                    "Response validator failed: Response contains a SHAP section header, but SHAP evidence is excluded."
                )

    @classmethod
    def _validate_all(cls, text: str, knowledge_doc: str = None, policy: Any = None) -> None:
        """
        Runs formatting and semantic checks sequentially.
        """
        if (
            "{{" in text
            or "}}" in text
            or (
                "{" in text
                and "}" in text
                and (
                    "investigation" in text
                    or "mitre" in text
                    or "history" in text
                )
            )
        ):
            raise ValueError(
                "Response validator failed: Prompt placeholders detected in response."
            )

        cls.validate_placeholders(text)
        if knowledge_doc:
            cls.validate_investigation_consistency(text, knowledge_doc)
            cls.validate_severity_consistency(text, knowledge_doc)
            cls.validate_mitre_consistency(text, knowledge_doc)
            cls.validate_process_claims(text, knowledge_doc)
        cls.validate_confidence_semantics(text, knowledge_doc)
        cls.validate_evidence_references(text)
        cls.validate_policy_conformance(text, policy)

    @classmethod
    def validate_chat(cls, text: str, knowledge_doc: str = None, policy: Any = None) -> str:
        """
        Validates a generated chat response.
        """
        if not text or not text.strip():
            raise ValueError("Response validator failed: Chat response is empty.")

        cls._validate_all(text, knowledge_doc, policy)
        return text.strip()

    @classmethod
    def validate_summary(cls, text: str, knowledge_doc: str = None, policy: Any = None) -> str:
        """
        Validates a generated investigation summary.
        """
        if not text or not text.strip():
            raise ValueError(
                "Response validator failed: Summary response is empty."
            )

        cls._validate_all(text, knowledge_doc, policy)
        return text.strip()

    @classmethod
    def validate_report(cls, text: str, knowledge_doc: str = None, policy: Any = None, is_behavioral: bool = None) -> str:
        """
        Validates a generated markdown report.
        """
        if not text or not text.strip():
            raise ValueError(
                "Response validator failed: Report response is empty."
            )

        is_beh_report = is_behavioral
        if is_beh_report is None:
            is_beh_report = False
            if knowledge_doc and "behavioral" in knowledge_doc.lower():
                is_beh_report = True

        if is_beh_report:
            required_headers = [
                "Executive Summary",
                "Detection & Correlation Findings",
                "Process Execution Analysis",
                "MITRE ATT&CK Assessment",
                "Evidence Assessment",
                "Analyst Recommendations",
                "Investigation Limitations",
            ]
        else:
            required_headers = [
                "Executive Summary",
                "Technical Findings",
                "Business Impact",
                "Recommendations",
            ]

        missing = [h for h in required_headers if h.lower() not in text.lower()]
        if missing:
            raise ValueError(
                f"Response validator failed: Required markdown sections missing: {missing}"
            )

        cls._validate_all(text, knowledge_doc, policy)
        return text.strip()

