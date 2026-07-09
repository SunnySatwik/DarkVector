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
    def validate_severity_consistency(text: str, knowledge_doc: str) -> None:
        """
        Rejects responses that assert a severity level contradicting the expected aggregate one.
        Allows other severity levels if they are explicitly qualified as belonging to individual detections.
        """
        if not knowledge_doc:
            return

        match = re.search(
            r"severity:\s*(low|medium|high|critical)",
            knowledge_doc,
            re.IGNORECASE,
        )
        if not match:
            return

        expected_severity = match.group(1).upper()
        expected_lower = expected_severity.lower()
        severities = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
        other_severities = severities - {expected_severity}

        # Split text into sentences for context analysis
        sentences = re.split(r"[.!?\n]+", text)

        for sev in other_severities:
            sev_lower = sev.lower()
            for sentence in sentences:
                sentence_lower = sentence.lower()
                if sev_lower in sentence_lower:
                    # Check if the sentence explicitly discusses individual local objects
                    local_keywords = [
                        "detection",
                        "rule",
                        "alert",
                        "member",
                        "under",
                        "for",
                        "process",
                        "activity",
                    ]
                    is_local = any(
                        kw in sentence_lower for kw in local_keywords
                    ) or re.search(r"\bt\d{4}\b", sentence_lower)

                    # If it doesn't refer to a local object, it's an overall investigation assertion
                    if not is_local:
                        # Reject if the expected aggregate severity is not in the sentence
                        if expected_lower not in sentence_lower:
                            raise ValueError(
                                f"Response validator failed: Contradicting severity '{sev}' detected for the overall investigation. "
                                f"Expected '{expected_severity}'."
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
