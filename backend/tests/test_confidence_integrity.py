import pytest
from fastapi.testclient import TestClient
from main import app
from app.models.investigation import Investigation, InvestigationStatus, InvestigationSeverity
from app.schemas.investigation import normalize_confidence_scale
from app.services.investigation_service import InvestigationService
from app.schemas.analyze import AnalysisResponse
from app.services.context_builder import ContextBuilder
from app.services.llm.policy import PolicyResolver, EvidenceCategory, ResponseScope, RetrievalDecision
from app.services.llm.scoping import ContextScoper
from app.services.llm.knowledge_pack import KnowledgePack
from app.services.llm.response_validator import ResponseValidator
from app.services.llm.fallback import FallbackAI
from app.services.llm.citations import EvidenceCitationBuilder
from app.services.llm.routing.route import PromptRoute

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
            "confidence": 95.0,
            "is_anomaly": True
        },
        "explanation": {
            "summary": "# Executive Anomaly Explanation\n\nThis is a long essay.\n\n## Recommendations\n- Do X\n\nEvidence Used\n- powershell.exe",
            "top_factors": [
                {"feature": "process", "impact": 0.5, "direction": "positive"}
            ],
            "confidence_breakdown": {
                "model_evidence": 85.0,
                "explanation_evidence": 90.0,
                "contextual_evidence": 80.0,
                "input_completeness": 100.0
            },
            "confidence_reasons": [
                "Strong model anomaly matched.",
                "Process details are complete."
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

    analysis_obj = AnalysisResponse(**analysis_payload)
    created = InvestigationService.create_from_analysis(
        db=db_session,
        alert=alert_payload,
        analysis=analysis_obj
    )

    db_record = db_session.query(Investigation).filter_by(investigation_id=created.investigation_id).first()
    assert db_record.risk_score == 85.0
    assert db_record.confidence == 95.0

    # Verify that confidence_breakdown and confidence_reasons persist in analysis_json
    assert db_record.analysis_json["explanation"]["confidence_breakdown"]["model_evidence"] == 85.0
    assert "Process details are complete." in db_record.analysis_json["explanation"]["confidence_reasons"]

    # Verify that summary satisfies the concise summary contract
    summary = db_record.summary
    assert summary is not None
    assert "#" not in summary
    assert "Evidence Used" not in summary
    assert "Recommendations" not in summary

    # Verify context building extracts confidence metadata
    ctx = ContextBuilder.build(
        db=db_session,
        investigation_id=created.investigation_id
    )
    assert ctx["confidence"] is not None
    assert ctx["confidence"]["score"] == 95.0
    assert ctx["confidence"]["breakdown"]["model_evidence"] == 85.0
    assert "Strong model anomaly matched." in ctx["confidence"]["reasons"]

    # Verify PolicyResolver routes confidence questions
    q_breakdown = "What evidence contributed to the confidence score?"
    policy_breakdown = PolicyResolver.resolve(PromptRoute.GENERAL, q_breakdown, ctx)
    assert policy_breakdown.scope == ResponseScope.FOCUSED
    assert policy_breakdown.retrieval_decision == RetrievalDecision.SKIP
    assert EvidenceCategory.CONFIDENCE_EVIDENCE in policy_breakdown.required_evidence
    assert EvidenceCategory.KNOWLEDGE_BASE_EVIDENCE in policy_breakdown.excluded_evidence

    q_diff = "Why is risk different from confidence?"
    policy_diff = PolicyResolver.resolve(PromptRoute.GENERAL, q_diff, ctx)
    assert policy_diff.scope == ResponseScope.FOCUSED
    assert policy_diff.retrieval_decision == RetrievalDecision.SKIP
    assert EvidenceCategory.CONFIDENCE_EVIDENCE in policy_diff.required_evidence

    # Verify ContextScoper preserves confidence metadata for confidence questions
    scoped = ContextScoper.project(ctx, policy_breakdown)
    assert scoped["confidence"] is not None
    assert scoped["confidence"]["score"] == 95.0

    # Verify KnowledgePack contains actual component values and not through shap_factors
    kp_out = KnowledgePack.generate(scoped)
    assert "## Evidence Confidence Assessment" in kp_out
    assert "Model Evidence Strength: 85.0%" in kp_out
    assert "Explanation Attribution Quality: 90.0%" in kp_out
    assert "Contextual Corroboration: 80.0%" in kp_out
    assert "Input Telemetry Completeness: 100.0%" in kp_out
    assert "Strong model anomaly matched." in kp_out

    # Verify EvidenceCitationBuilder builds correct citation
    citations = EvidenceCitationBuilder.build(scoped, policy=policy_breakdown, route=PromptRoute.GENERAL)
    assert "Confidence Scoring Evidence" in citations

    # Verify FallbackAI handles confidence questions
    fallback_res = FallbackAI.generate_chat(created, [], q_breakdown)
    assert "Model Evidence: 85.0%" in fallback_res
    assert "Explanation Evidence: 90.0%" in fallback_res
    assert "confidence score of 95%" in fallback_res
    assert "distinct from the risk score" in fallback_res


def test_confidence_scorer_metrics_and_calibration():
    from app.services.confidence_scorer import ConfidenceScorer
    from app.schemas.analyze import FeatureContribution

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
        anomaly_score=-0.01,
        score_distribution=dist,
        top_factors=top_factors_strong,
        mitre_mapping=mitre_strong,
        threat_intelligence=ti_strong,
        alert_data=alert_strong
    )

    # Case 2: Sparse data, missing details, weak model anomaly, no threat intel
    alert_weak = {
        "source": "unknown",
        "details": {}
    }
    top_factors_weak = []
    ti_weak = {}
    mitre_weak = {"technique_id": "T1190"}

    res_weak = ConfidenceScorer.calculate(
        anomaly_score=0.12,
        score_distribution=dist,
        top_factors=top_factors_weak,
        mitre_mapping=mitre_weak,
        threat_intelligence=ti_weak,
        alert_data=alert_weak
    )

    # Assertions
    assert res_strong.score > res_weak.score
    assert res_strong.score >= 80.0
    assert res_weak.score <= 45.0
    assert 0.0 <= res_strong.score <= 100.0
    assert 0.0 <= res_weak.score <= 100.0
    assert res_strong.input_completeness == 100.0
    assert res_weak.input_completeness < 100.0
    assert res_strong.contextual_evidence > res_weak.contextual_evidence

    res_mitre_only = ConfidenceScorer.calculate(
        anomaly_score=0.12,
        score_distribution=dist,
        top_factors=[],
        mitre_mapping=mitre_strong,
        threat_intelligence={},
        alert_data=alert_weak
    )
    assert res_mitre_only.score < 100.0
    assert res_weak.explanation_evidence == 0.0
    assert "No feature attribution (SHAP) factors are available." in res_weak.reasons


def test_validator_rejects_reinterpretation():
    # Behavioral detection checks are unchanged
    ResponseValidator.validate_confidence_semantics("Detection confidence represents pattern-matching logic.", "## Behavioral Detection Assessment")

    # Rejects pattern-matching reinterpretation for legacy ML confidence
    with pytest.raises(ValueError) as excinfo:
        ResponseValidator.validate_confidence_semantics(
            "Legacy ML confidence represents the pattern-matching accuracy of the model.",
            "## Alert Analysis"
        )
    assert "Prohibited legacy confidence reinterpretation detected" in str(excinfo.value)

    # Rejects probability of compromise
    with pytest.raises(ValueError) as excinfo2:
        ResponseValidator.validate_confidence_semantics(
            "The confidence is the probability of compromise.",
            "## Alert Analysis"
        )
    assert "Prohibited aggregate confidence reinterpretation detected" in str(excinfo2.value)


def test_fallback_predates_metadata():
    # Old investigations without breakdown report score but do not fabricate breakdown
    old_inv = {
        "confidence": 75.0,
        "alert_json": {},
        "analysis_json": {}
    }
    fallback_res = FallbackAI.generate_chat(old_inv, [], "What is the confidence score?")
    assert "predates structured confidence breakdown metadata" in fallback_res
    assert "75%" in fallback_res
    assert "Model Evidence:" not in fallback_res
