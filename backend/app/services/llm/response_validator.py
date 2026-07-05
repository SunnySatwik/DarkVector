# response_validator.py

class ResponseValidator:
    @staticmethod
    def validate_chat(text: str) -> str:
        """
        Validates a generated chat response.
        Raises ValueError if empty or contains template placeholders.
        """
        if not text or not text.strip():
            raise ValueError("Response validator failed: Chat response is empty.")
        
        # Guard against LLM returning prompt placeholder indicators
        if "{{" in text or "}}" in text or "{" in text and "}" in text and ("investigation" in text or "mitre" in text or "history" in text):
            raise ValueError("Response validator failed: Prompt placeholders detected in chat response.")
        
        return text.strip()

    @staticmethod
    def validate_summary(text: str) -> str:
        """
        Validates a generated investigation summary.
        Raises ValueError if empty.
        """
        if not text or not text.strip():
            raise ValueError("Response validator failed: Summary response is empty.")
        
        return text.strip()

    @staticmethod
    def validate_report(text: str) -> str:
        """
        Validates a generated markdown report.
        Raises ValueError if any of the required sections are missing.
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

        return text.strip()
