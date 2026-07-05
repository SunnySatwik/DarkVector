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
            "cannot determine"
        ]
        lower_text = text.lower()
        for phrase in forbidden_phrases:
            if phrase in lower_text:
                raise ValueError(f"Response validator failed: Forbidden placeholder phrase detected: '{phrase}'")

    @staticmethod
    def validate_investigation_consistency(text: str, knowledge_doc: str) -> None:
        """
        Rejects responses referencing investigation IDs that are not present in the Knowledge Pack.
        """
        if not knowledge_doc:
            return
        
        response_ids = set(re.findall(r"\bINV-[A-Za-z0-9\-]+", text))
        knowledge_ids = set(re.findall(r"\bINV-[A-Za-z0-9\-]+", knowledge_doc))
        
        for r_id in response_ids:
            if r_id not in knowledge_ids:
                raise ValueError(f"Response validator failed: Hallucinated investigation ID detected: '{r_id}'")

    @staticmethod
    def validate_severity_consistency(text: str, knowledge_doc: str) -> None:
        """
        Rejects responses that assert a severity level contradicting the expected one.
        """
        if not knowledge_doc:
            return
        
        match = re.search(r"severity:\s*(low|medium|high|critical)", knowledge_doc, re.IGNORECASE)
        if not match:
            return
        
        expected_severity = match.group(1).upper()
        severities = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
        
        lower_text = text.lower()
        expected_lower = expected_severity.lower()
        
        other_severities = severities - {expected_severity}
        for sev in other_severities:
            sev_lower = sev.lower()
            if sev_lower in lower_text and expected_lower not in lower_text:
                raise ValueError(f"Response validator failed: Contradicting severity '{sev}' detected. Expected '{expected_severity}'.")

    @staticmethod
    def validate_mitre_consistency(text: str, knowledge_doc: str) -> None:
        """
        Rejects responses referencing MITRE Technique IDs not present in the Knowledge Pack.
        """
        if not knowledge_doc:
            return
        
        knowledge_techs = set(re.findall(r"\bT\d{4}(?:\.\d{3})?\b", knowledge_doc))
        if not knowledge_techs:
            return
        
        response_techs = set(re.findall(r"\bT\d{4}(?:\.\d{3})?\b", text))
        
        for r_tech in response_techs:
            if r_tech not in knowledge_techs:
                raise ValueError(f"Response validator failed: Hallucinated MITRE Technique ID detected: '{r_tech}'")

    @staticmethod
    def validate_evidence_references(text: str) -> None:
        """
        Rejects responses containing key analysis terms if the 'Evidence Used' section is missing.
        """
        trigger_words = ["recommendations", "severity", "malicious", "critical", "attack"]
        lower_text = text.lower()
        
        has_trigger = any(w in lower_text for w in trigger_words)
        if has_trigger:
            if "evidence used" not in lower_text:
                raise ValueError("Response validator failed: Response contains key analysis terms but lacks an 'Evidence Used' section.")

    @classmethod
    def _validate_all(cls, text: str, knowledge_doc: str = None) -> None:
        """
        Runs formatting and semantic checks sequentially.
        """
        # Standard placeholder checks
        if "{{" in text or "}}" in text or ("{" in text and "}" in text and ("investigation" in text or "mitre" in text or "history" in text)):
            raise ValueError("Response validator failed: Prompt placeholders detected in response.")
            
        cls.validate_placeholders(text)
        if knowledge_doc:
            cls.validate_investigation_consistency(text, knowledge_doc)
            cls.validate_severity_consistency(text, knowledge_doc)
            cls.validate_mitre_consistency(text, knowledge_doc)
        cls.validate_evidence_references(text)

    @classmethod
    def validate_chat(cls, text: str, knowledge_doc: str = None) -> str:
        """
        Validates a generated chat response.
        Raises ValueError if empty, contains template placeholders, or fails semantic rules.
        """
        if not text or not text.strip():
            raise ValueError("Response validator failed: Chat response is empty.")
        
        cls._validate_all(text, knowledge_doc)
        return text.strip()

    @classmethod
    def validate_summary(cls, text: str, knowledge_doc: str = None) -> str:
        """
        Validates a generated investigation summary.
        Raises ValueError if empty or fails semantic rules.
        """
        if not text or not text.strip():
            raise ValueError("Response validator failed: Summary response is empty.")
        
        cls._validate_all(text, knowledge_doc)
        return text.strip()

    @classmethod
    def validate_report(cls, text: str, knowledge_doc: str = None) -> str:
        """
        Validates a generated markdown report.
        Raises ValueError if any of the required sections are missing or fails semantic rules.
        """
        if not text or not text.strip():
            raise ValueError("Response validator failed: Report response is empty.")

        required_headers = [
            "Executive Summary",
            "Technical Findings",
            "Business Impact",
            "Recommendations"
        ]
        
        missing = [h for h in required_headers if h.lower() not in text.lower()]
        if missing:
            raise ValueError(f"Response validator failed: Required markdown sections missing: {missing}")

        cls._validate_all(text, knowledge_doc)
        return text.strip()
