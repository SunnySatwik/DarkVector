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


def test_confidence_scorer_metrics_and_calibration():
    from app.services.confidence_scorer import ConfidenceScorer
    from app.schemas.analyze import FeatureContribution

    # Score distribution dictionary
    dist = {
        "min": -0.11,
        "max": 0.13,
        "mean": 0.08,
        "std": 0.03,
        "p1": -0.005,
        "p5": 0.018,
        "p10": 0.034,
        "p25": 0.065,
        "median": 0.095,
        "p75": 0.11,
    }

    # Case 1: Complete data, strong features, high anomaly, threat intel match
    alert_strong = {
        "source": "srv-host-1",
        "category": "process",
        "type": "LSASS Credential Harvesting",
        "details": {
            "processPath": "mimikatz.exe",
            "commandLine": "sekurlsa::logonpasswords"
        }
    }
    top_factors_strong = [
        FeatureContribution(feature="process", impact=0.25, direction="increase"),
        FeatureContribution(feature="command", impact=0.30, direction="increase")
    ]
    ti_strong = {"reputation": "malicious", "category": "credential harvesting"}
    mitre_strong = {"technique_id": "T1003.001"}

    res_strong = ConfidenceScorer.calculate(
        anomaly_score=-0.01, # <= p1
        score_distribution=dist,
        top_factors=top_factors_strong,
        mitre_mapping=mitre_strong,
        threat_intelligence=ti_strong,
        alert_data=alert_strong
    )

    # Case 2: Sparse data, missing details, weak model anomaly, no threat intel
    alert_weak = {
        "source": "unknown",
        # missing category & type
        "details": {} # missing processPath & commandLine
    }
    top_factors_weak = []
    ti_weak = {}
    mitre_weak = {"technique_id": "T1190"} # fallback technique

    res_weak = ConfidenceScorer.calculate(
        anomaly_score=0.12, # > median
        score_distribution=dist,
        top_factors=top_factors_weak,
        mitre_mapping=mitre_weak,
        threat_intelligence=ti_weak,
        alert_data=alert_weak
    )

    # Assertions:
    # 1. Strong evidence has high confidence, sparse evidence has low/moderate confidence
    assert res_strong.score > res_weak.score
    assert res_strong.score >= 80.0
    assert res_weak.score <= 45.0

    # 2. Confidence always remains within [0.0, 100.0]
    assert 0.0 <= res_strong.score <= 100.0
    assert 0.0 <= res_weak.score <= 100.0

    # 3. Missing important input fields reduces the input completeness score
    assert res_strong.input_completeness == 100.0
    assert res_weak.input_completeness < 100.0

    # 4. Contextual corroboration (MITRE technique match & TI) increases contextual evidence
    assert res_strong.contextual_evidence > res_weak.contextual_evidence

    # 5. MITRE mapping alone does not automatically produce maximum confidence
    res_mitre_only = ConfidenceScorer.calculate(
        anomaly_score=0.12, # typical normal score
        score_distribution=dist,
        top_factors=[],
        mitre_mapping=mitre_strong, # has MITRE but nothing else
        threat_intelligence={},
        alert_data=alert_weak # sparse alert
    )
    assert res_mitre_only.score < 100.0

    # 6. SHAP factors absence is handled safely (tested with top_factors_weak = [])
    assert res_weak.explanation_evidence == 0.0
    assert "No feature attribution (SHAP) factors are available." in res_weak.reasons


def test_inference_service_confidence_breakdown(db_session):
    from app.services.inference_service import InferenceService
    
    alert = {
        "id": "alert-inf-test",
        "timestamp": "2026-07-06T12:00:00Z",
        "source": "srv-host-1",
        "type": "Local Credential Harvesting",
        "severity": "HIGH",
        "category": "process",
        "description": "LSASS memory read",
        "details": {
            "username": "attacker",
            "processPath": "C:\\Windows\\cmd.exe",
            "commandLine": "mimikatz.exe"
        }
    }
    
    service = InferenceService()
    res = service.analyze(alert)
    
    # Verify that confidence is normalized and breakdown is populated
    assert 0.0 <= res.analysis.confidence <= 100.0
    assert res.explanation.confidence_breakdown is not None
    assert "model_evidence" in res.explanation.confidence_breakdown
    assert len(res.explanation.confidence_reasons) > 0
