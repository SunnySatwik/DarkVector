import pytest
from app.services.llm.response_validator import ResponseValidator
from app.services.context.mitre_mapping import lookup_by_id
from app.services.detection.rules.powershell_encoded import PowerShellEncodedRule

KNOWLEDGE_DOC_HIGH = "Investigation severity: HIGH\nRisk score: 95.0"


class TestSeverityConsistencyValidator:
    def test_accepts_contextual_low_in_high_investigation(self):
        text = (
            "The encoded PowerShell command is highly suspicious.\n\n"
            "There is a low likelihood of persistent access being established "
            "in this execution context.\n\n"
            "Evidence Used\n- Behavioral Detection Evidence"
        )
        ResponseValidator.validate_severity_consistency(text, KNOWLEDGE_DOC_HIGH)

    def test_accepts_medium_mention_in_high_investigation(self):
        text = (
            "The detection confidence is high. One correlated signal had medium "
            "confidence, but the aggregate risk remains elevated.\n\n"
            "Evidence Used\n- Behavioral Detection Evidence"
        )
        ResponseValidator.validate_severity_consistency(text, KNOWLEDGE_DOC_HIGH)

    def test_accepts_correct_severity_assertion(self):
        text = (
            "The investigation severity is HIGH based on correlated evidence.\n\n"
            "Evidence Used\n- Behavioral Detection Evidence"
        )
        ResponseValidator.validate_severity_consistency(text, KNOWLEDGE_DOC_HIGH)

    def test_rejects_explicit_contradiction_overall_severity(self):
        text = (
            "The investigation severity is LOW.\n\n"
            "Evidence Used\n- Behavioral Detection Evidence"
        )
        with pytest.raises(ValueError, match="explicitly asserts aggregate"):
            ResponseValidator.validate_severity_consistency(text, KNOWLEDGE_DOC_HIGH)

    def test_rejects_this_is_a_low_severity_investigation(self):
        text = "This is a low severity investigation.\n\nEvidence Used\n- ev"
        with pytest.raises(ValueError, match="explicitly asserts aggregate"):
            ResponseValidator.validate_severity_consistency(text, KNOWLEDGE_DOC_HIGH)

    def test_rejects_overall_severity_label(self):
        text = "Overall severity: medium\n\nEvidence Used\n- ev"
        with pytest.raises(ValueError, match="explicitly asserts aggregate"):
            ResponseValidator.validate_severity_consistency(text, KNOWLEDGE_DOC_HIGH)

    def test_accepts_no_severity_in_knowledge_doc(self):
        ResponseValidator.validate_severity_consistency("This is low severity.", "No severity here.")

    def test_accepts_empty_knowledge_doc(self):
        ResponseValidator.validate_severity_consistency("This is low severity.", "")


class TestMitreMapping:
    def test_t1059_001_enriches_correctly(self):
        result = lookup_by_id("T1059.001")
        assert result["technique_id"] == "T1059.001"
        assert result["technique_name"] == "PowerShell"
        assert result["tactic"] == "Execution"
        assert result["description"] != "N/A"

    def test_t1059_001_not_na(self):
        result = lookup_by_id("T1059.001")
        assert result["technique_name"] != "N/A"
        assert result["tactic"] != "N/A"

    def test_unknown_technique_degrades_gracefully(self):
        result = lookup_by_id("T9999.999")
        assert result["technique_id"] == "T9999.999"
        assert result["technique_name"] == "N/A"
        assert result["tactic"] == "N/A"

    def test_unknown_technique_with_default_tactic(self):
        result = lookup_by_id("T9999.999", default_tactic="Execution")
        assert result["technique_id"] == "T9999.999"
        assert result["tactic"] == "Execution"
        assert result["technique_name"] == "N/A"

    def test_known_t1611_enriches_correctly(self):
        result = lookup_by_id("T1611")
        assert result["technique_id"] == "T1611"
        assert result["technique_name"] == "Escape to Host"
        assert result["tactic"] == "Privilege Escalation"

    def test_powershell_rule_emits_t1059_001(self):
        rule = PowerShellEncodedRule()
        assert rule.mitre_technique == "T1059.001"

    def test_powershell_rule_tactic_is_execution(self):
        rule = PowerShellEncodedRule()
        assert rule.mitre_tactic == "Execution"

    def test_powershell_rule_technique_lookup_succeeds(self):
        rule = PowerShellEncodedRule()
        result = lookup_by_id(rule.mitre_technique, default_tactic=rule.mitre_tactic)
        assert result["technique_name"] != "N/A"
        assert result["tactic"] != "N/A"


class TestFallbackAIContract:
    def test_fallback_chat_returns_string(self):
        from app.services.llm.fallback import FallbackAI

        class MockInv:
            alert_json = {"source": "test-host", "type": "PowerShell Encoded Command", "details": {}}
            analysis_json = {}
            status = "new"

        reply = FallbackAI.generate_chat(MockInv(), [], "what happened?")
        assert isinstance(reply, str)
        assert len(reply.strip()) > 0

    def test_fallback_chat_behavioral_investigation(self):
        from app.services.llm.fallback import FallbackAI

        class BehavioralMockInv:
            alert_json = {}
            analysis_json = {}
            status = "new"

        reply = FallbackAI.generate_chat(BehavioralMockInv(), [], "tell me about this")
        assert isinstance(reply, str)
        assert len(reply.strip()) > 0


class TestChatRequestHarden:
    def test_chat_request_default_factory(self):
        from app.api.v1.chat import ChatRequest
        req1 = ChatRequest(message="hello")
        req2 = ChatRequest(message="world")
        assert req1.history == []
        assert req2.history == []
        assert req1.history is not req2.history

