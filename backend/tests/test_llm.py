import pytest
from main import app
from app.services.llm.llm_service import LLMService
from app.services.llm.fallback import FallbackAI

# Pure unit tests — no database access, no TestClient
# These tests do not request db_session or client and therefore
# do NOT connect to PostgreSQL at all.


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


# API test — uses isolated db_session and client fixtures from conftest.py.
# The chat endpoint queries the DB to look up the investigation; using the
# isolated client ensures the request goes through darkvector_test (empty),
# so the endpoint correctly returns "not found".
def test_chat_endpoint_missing_investigation(client):
    response = client.post("/api/v1/chat/", json={
        "investigation_id": "INV-NONEXISTENT",
        "message": "hello"
    })
    # Since investigation doesn't exist, the endpoint should return a reply
    # that indicates the investigation was not found
    assert response.status_code == 200
    assert "not found" in response.json()["reply"].lower()
