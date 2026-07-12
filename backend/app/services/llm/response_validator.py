# response_validator.py

import re


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
    def validate_confidence_semantics(text: str) -> None:
        """
        Rejects absolute certainty claims based on confidence metrics.
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
    def _validate_all(cls, text: str, knowledge_doc: str = None) -> None:
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
        cls.validate_confidence_semantics(text)
        cls.validate_evidence_references(text)

    @classmethod
    def validate_chat(cls, text: str, knowledge_doc: str = None) -> str:
        """
        Validates a generated chat response.
        """
        if not text or not text.strip():
            raise ValueError("Response validator failed: Chat response is empty.")

        cls._validate_all(text, knowledge_doc)
        return text.strip()

    @classmethod
    def validate_summary(cls, text: str, knowledge_doc: str = None) -> str:
        """
        Validates a generated investigation summary.
        """
        if not text or not text.strip():
            raise ValueError(
                "Response validator failed: Summary response is empty."
            )

        cls._validate_all(text, knowledge_doc)
        return text.strip()

    @classmethod
    def validate_report(cls, text: str, knowledge_doc: str = None) -> str:
        """
        Validates a generated markdown report.
        """
        if not text or not text.strip():
            raise ValueError(
                "Response validator failed: Report response is empty."
            )

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

        cls._validate_all(text, knowledge_doc)
        return text.strip()
