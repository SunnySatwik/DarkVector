import pytest
from fastapi.testclient import TestClient
from main import app
from app.services.llm.llm_service import LLMService
from app.services.llm.fallback import FallbackAI

client = TestClient(app)

def test_fallback_ai_summary():
    alert_data = {
        "id": "AL-9999",
        "category": "process",
        "source": "srv-test-host",
        "type": "Test Alert Action"
    }
    summary = FallbackAI.generate_summary(
        alert_data=alert_data,
        risk_score=75.5,
        severity="high",
        anomaly_score=0.88
    )
    assert "I spotted a process on `srv-test-host`" in summary
    assert "Test Alert Action" in summary
    assert "75.5" in summary

def test_fallback_ai_chat():
    class DummyInvestigation:
        status = "new"
        severity = "high"
        risk_score = 75.5
        alert_json = {
            "source": "srv-test-host",
            "type": "Test Alert Action",
            "details": {}
        }
        analysis_json = {
            "context": {
                "mitre": {
                    "technique_id": "T1611",
                    "technique_name": "Escape to Host",
                    "tactic": "Privilege Escalation",
                    "description": "Virtualization break out"
                }
            }
        }
    
    inv = DummyInvestigation()
    reply = FallbackAI.generate_chat(inv, [], "tell me about mitre")
    assert "T1611" in reply
    assert "Escape to Host" in reply

    reply_isolate = FallbackAI.generate_chat(inv, [], "quarantine the host")
    assert "isolating" in reply_isolate

def test_fallback_ai_report():
    class DummyInvestigation:
        severity = "high"
        risk_score = 75.5
        alert_json = {
            "source": "srv-test-host",
            "type": "Test Alert Action"
        }
        analysis_json = {
            "context": {
                "mitre": {
                    "technique_id": "T1611",
                    "technique_name": "Escape to Host"
                }
            }
        }

    inv = DummyInvestigation()
    report = FallbackAI.generate_report(inv, [])
    assert "### Executive Summary" in report
    assert "### Technical Findings" in report
    assert "T1611" in report

def test_chat_endpoint_missing_investigation():
    response = client.post("/api/v1/chat/", json={
        "investigation_id": "INV-NONEXISTENT",
        "message": "hello"
    })
    # Since investigation doesn't exist, it should return a message indicating that or fallback
    assert response.status_code == 200
    assert "Error" in response.json()["reply"]
