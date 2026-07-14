import pytest
from fastapi.testclient import TestClient
from main import app
from app.models.investigation import Investigation, InvestigationStatus, InvestigationSeverity
from app.schemas.investigation import normalize_confidence_scale
from app.services.investigation_service import InvestigationService
from app.schemas.analyze import AnalysisResponse

client = TestClient(app)

def test_normalize_confidence_scale_boundaries():
    # A legacy confidence value of 0.7 becomes 70.0
    assert normalize_confidence_scale(0.7) == 70.0
    # A behavioral confidence value of 95.0 remains 95.0
    assert normalize_confidence_scale(95.0) == 95.0
    # Confidence never exceeds 100.0
    assert normalize_confidence_scale(105.0) == 100.0
    # Confidence never falls below 0.0
    assert normalize_confidence_scale(-5.0) == 0.0
    # None remains None
    assert normalize_confidence_scale(None) is None


def test_metric_independence_and_summary_contract(db_session):
    # Setup mock input
    alert_payload = {
        "id": "alert-1059-encoded",
        "timestamp": "2026-07-06T12:00:00Z",
        "source": "srv-host-1",
        "type": "PowerShell Encoded Command",
        "severity": "HIGH",
        "category": "process",
        "description": "Powershell executing base64 payload",
        "details": {
            "username": "admin",
            "processPath": "powershell.exe",
            "commandLine": "powershell.exe -EncodedCommand base64payload"
        }
    }
    
    analysis_payload = {
        "analysis": {
            "risk_score": 85.0,
            "anomaly_score": 0.9,
            "severity": "HIGH",
            "confidence": 95.0,  # unified 0-100 scale value
            "is_anomaly": True
        },
        "explanation": {
            "summary": "# Executive Anomaly Explanation\n\nThis is a long essay explaining things.\n\n## Recommendations\n- Do X\n- Do Y\n\nEvidence Used\n- powershell.exe execution",
            "top_factors": [
                {"feature": "process", "impact": 0.5, "direction": "positive"}
            ]
        },
        "metadata": {
            "model_version": "1.0",
            "analysis_time_ms": 12.5
        },
        "context": {
            "mitre": {
                "technique_id": "T1059.001",
                "technique_name": "PowerShell",
                "tactic": "Execution",
                "description": "Desc"
            },
            "threat_intelligence": {
                "reputation": "malicious",
                "confidence": 90,
                "category": "botnet",
                "summary": "malicious bot"
            }
        }
    }

    # Verify AnalysisResponse parsing
    analysis_obj = AnalysisResponse(**analysis_payload)
    
    # Create the investigation via the service
    created = InvestigationService.create_from_analysis(
        db=db_session,
        alert=alert_payload,
        analysis=analysis_obj
    )

    # 1. Changing risk_score does not automatically change confidence
    assert created.risk_score == 85.0
    assert created.confidence == 95.0

    # Verify they are persisted independently in the database
    db_record = db_session.query(Investigation).filter_by(investigation_id=created.investigation_id).first()
    assert db_record.risk_score == 85.0
    assert db_record.confidence == 95.0

    # 2. Legacy ML investigation creation no longer persists a long-form AI essay as Investigation.summary.
    # 3. Investigation.summary satisfies the concise summary contract
    summary = db_record.summary
    assert summary is not None
    assert len(summary.split("\n")) <= 3  # Tightly constrained sentences, no multi-paragraph essays
    
    # 4. Summary contains no markdown headings
    assert "#" not in summary
    assert "##" not in summary

    # 5. Summary contains no "Evidence Used" section
    assert "Evidence Used" not in summary

    # 6. Summary contains no recommendation/playbook block
    assert "Recommendations" not in summary
    assert "remediation" not in summary.lower()

    # Verify it is evidence-grounded
    assert "powershell.exe" in summary.lower()
    assert "srv-host-1" in summary

    # 7. analysis_json remains available and populated for ML investigations
    assert db_record.analysis_json is not None
    assert db_record.analysis_json["explanation"]["summary"].startswith("# Executive Anomaly")

    # 8. Risk score and severity are preserved correctly
    assert db_record.risk_score == 85.0
    assert db_record.severity == InvestigationSeverity.HIGH

    # 9. Verify the API response matches the normalized scale
    res = client.get(f"/api/v1/investigations/{created.investigation_id}")
    assert res.status_code == 200
    api_data = res.json()
    assert api_data["investigation"]["confidence"] == 95.0
    assert api_data["analysis"]["analysis"]["confidence"] == 95.0
    assert api_data["investigation"]["summary"] == summary
