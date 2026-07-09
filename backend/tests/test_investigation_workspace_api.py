import time
import pytest
from datetime import datetime, UTC
from fastapi.testclient import TestClient

from main import app
from app.database.session import SessionLocal
from app.models.investigation import Investigation, InvestigationSeverity, InvestigationStatus
from app.models.timeline import TimelineEvent, TimelineEventType, TimelineActor
from app.services.investigation_service import InvestigationService
from app.services.context_builder import ContextBuilder

client = TestClient(app)


@pytest.fixture
def db_session():
    """Provides a transactional database session that rolls back after each test."""
    db = SessionLocal()
    try:
        db.query(TimelineEvent).delete()
        db.query(Investigation).delete()
        db.commit()
        yield db
    finally:
        db.rollback()
        db.close()


def get_valid_alert_data():
    return {
        "id": "alert-123",
        "timestamp": "2026-07-06T12:00:00Z",
        "source": "srv-host-1",
        "type": "Local Credential Harvesting",
        "severity": "HIGH",
        "category": "process",
        "description": "LSASS memory read",
        "details": {
            "username": "attacker",
            "processPath": "C:\\Windows\\cmd.exe"
        }
    }


def get_valid_analysis_data():
    return {
        "analysis": {
            "risk_score": 85.0,
            "anomaly_score": 0.9,
            "severity": "HIGH",
            "confidence": 0.8,
            "is_anomaly": True
        },
        "explanation": {
            "summary": "A legacy detection occurred",
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
                "technique_id": "T1059",
                "technique_name": "Command Line",
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


def create_mock_investigation(
    db,
    inv_id,
    alert_json=None,
    analysis_json=None,
    detection_json=None,
    risk_score=90.0,
    confidence=0.9,
    status=InvestigationStatus.NEW,
    severity=InvestigationSeverity.HIGH,
):
    investigation = Investigation(
        investigation_id=inv_id,
        alert_id=f"alert-{inv_id}",
        title=f"Test Inv {inv_id}",
        status=status,
        severity=severity,
        risk_score=risk_score,
        confidence=confidence,
        summary="Test Summary",
        alert_json=alert_json,
        analysis_json=analysis_json,
        detection_json=detection_json,
    )
    db.add(investigation)
    db.commit()

    # Add a mock timeline event
    event = TimelineEvent(
        investigation_id=inv_id,
        event_type=TimelineEventType.ALERT_CREATED,
        actor=TimelineActor.SYSTEM,
        title="Created",
        description="Created event",
        timestamp=datetime.now(UTC),
    )
    db.add(event)
    db.commit()
    return investigation


# 1. Legacy investigation detail endpoint still works
def test_legacy_investigation_detail(db_session):
    alert_data = get_valid_alert_data()
    analysis_data = get_valid_analysis_data()
    create_mock_investigation(
        db_session,
        "INV-LEGACY",
        alert_json=alert_data,
        analysis_json=analysis_data,
    )

    res = client.get("/api/v1/investigations/INV-LEGACY")
    assert res.status_code == 200
    data = res.json()
    assert data["investigation"]["investigation_id"] == "INV-LEGACY"
    assert data["alert"]["type"] == "Local Credential Harvesting"
    assert data["analysis"]["analysis"]["risk_score"] == 85.0


# 2. Behavioral investigation detail endpoint works when alert_json is None
def test_behavioral_detail_no_alert(db_session):
    create_mock_investigation(
        db_session,
        "INV-BEH-NO-ALERT",
        alert_json=None,
        analysis_json=get_valid_analysis_data(),
    )
    res = client.get("/api/v1/investigations/INV-BEH-NO-ALERT")
    assert res.status_code == 200
    data = res.json()
    assert data["alert"] is None


# 3. Behavioral investigation detail endpoint works when analysis_json is None
def test_behavioral_detail_no_analysis(db_session):
    create_mock_investigation(
        db_session,
        "INV-BEH-NO-ANALYSIS",
        alert_json=get_valid_alert_data(),
        analysis_json=None,
    )
    res = client.get("/api/v1/investigations/INV-BEH-NO-ANALYSIS")
    assert res.status_code == 200
    data = res.json()
    assert data["analysis"] is None


# 4. Workspace endpoint returns 404 for unknown investigation
def test_workspace_404(db_session):
    res = client.get("/api/v1/investigations/INV-UNKNOWN/workspace")
    assert res.status_code == 404


# 5. Legacy investigation workspace response
def test_legacy_workspace(db_session):
    create_mock_investigation(
        db_session,
        "INV-LEG-WS",
        alert_json=get_valid_alert_data(),
        analysis_json=get_valid_analysis_data(),
    )
    res = client.get("/api/v1/investigations/INV-LEG-WS/workspace")
    assert res.status_code == 200
    data = res.json()
    assert not data["is_behavioral"]
    assert data["behavioral_detections"] == []
    assert data["correlation"] is None


# 6. Single behavioral detection workspace response
def test_single_behavioral_workspace(db_session):
    det_json = {
        "id": "det-1",
        "rule_id": "rule-1",
        "title": "Rule Match",
        "description": "Desc",
        "severity": "MEDIUM",
        "confidence": 75.0,
        "host_id": "host-a",
        "process_guid": "guid-1",
        "timestamp": 120.0,
        "recommendations": ["A"],
    }
    create_mock_investigation(db_session, "INV-SINGLE-BEH", detection_json=det_json)

    res = client.get("/api/v1/investigations/INV-SINGLE-BEH/workspace")
    assert res.status_code == 200
    data = res.json()
    assert data["is_behavioral"]
    assert len(data["behavioral_detections"]) == 1
    assert data["primary_detection"]["id"] == "det-1"


# 7. Correlated behavioral investigation workspace response
def test_correlated_behavioral_workspace(db_session):
    det_json = {
        "correlation_id": "corr-123",
        "group_size": 2,
        "primary_detection": {
            "id": "det-2",
            "rule_id": "rule-b",
            "title": "Rule B",
            "description": "Desc B",
            "severity": "CRITICAL",
            "confidence": 95.0,
            "host_id": "host-1",
            "process_guid": "guid-2",
            "timestamp": 130.0,
        },
        "detections": [
            {
                "id": "det-1",
                "rule_id": "rule-a",
                "title": "Rule A",
                "description": "Desc A",
                "severity": "LOW",
                "confidence": 50.0,
                "host_id": "host-1",
                "process_guid": "guid-1",
                "timestamp": 120.0,
            },
            {
                "id": "det-2",
                "rule_id": "rule-b",
                "title": "Rule B",
                "description": "Desc B",
                "severity": "CRITICAL",
                "confidence": 95.0,
                "host_id": "host-1",
                "process_guid": "guid-2",
                "timestamp": 130.0,
                "mitre_technique": "T1059",
                "mitre_tactic": "Execution",
                "recommendations": ["Rec A", "Rec B"],
                "evidence": [{"PID": 999, "Process Name": "malicious.exe"}],
            },
        ],
    }
    create_mock_investigation(db_session, "INV-CORR-BEH", detection_json=det_json)

    res = client.get("/api/v1/investigations/INV-CORR-BEH/workspace")
    assert res.status_code == 200
    data = res.json()

    # 8. behavioral_detections are correctly exposed
    assert len(data["behavioral_detections"]) == 2
    assert data["behavioral_detections"][0]["id"] == "det-1"

    # 9. primary_detection is correctly exposed
    assert data["primary_detection"]["id"] == "det-2"

    # 10. correlation context is correctly exposed
    assert data["correlation"]["correlation_id"] == "corr-123"
    assert data["correlation"]["duration"] == 10.0

    # 11. process evidence is correctly exposed
    assert len(data["process_evidence"]) == 2
    # guid-2 has pid = 999, process_name = malicious.exe
    proc_2 = [p for p in data["process_evidence"] if p["process_guid"] == "guid-2"][0]
    assert proc_2["pid"] == 999
    assert proc_2["process_name"] == "malicious.exe"

    # 12. multiple MITRE mappings are correctly exposed
    assert len(data["mitre_mappings"]) == 1
    assert data["mitre_mappings"][0]["technique_id"] == "T1059"


# 13. Recommendations are deduplicated
def test_recommendations_deduplicated(db_session):
    det_json = {
        "correlation_id": "corr-123",
        "detections": [
            {"id": "det-1", "recommendations": ["Action A", "Action B"]},
            {"id": "det-2", "recommendations": ["Action B", "Action C"]},
        ],
    }
    create_mock_investigation(db_session, "INV-DEDUP-REC", detection_json=det_json)
    res = client.get("/api/v1/investigations/INV-DEDUP-REC/workspace")
    assert res.status_code == 200
    data = res.json()
    assert data["recommendations"] == ["Action A", "Action B", "Action C"]


# 14. Timeline events are included
def test_timeline_events_included(db_session):
    create_mock_investigation(db_session, "INV-TIMELINE")
    res = client.get("/api/v1/investigations/INV-TIMELINE/workspace")
    assert res.status_code == 200
    data = res.json()
    assert len(data["timeline"]) == 1
    assert data["timeline"][0]["title"] == "Created"


# 15. Empty collections serialize as [] rather than null
def test_empty_collections_serialize(db_session):
    create_mock_investigation(db_session, "INV-EMPTY-COL")
    # TimelineRepository.list_for_investigation won't find timeline if we delete it
    db_session.query(TimelineEvent).delete()
    db_session.commit()

    res = client.get("/api/v1/investigations/INV-EMPTY-COL/workspace")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data["behavioral_detections"], list)
    assert data["behavioral_detections"] == []
    assert isinstance(data["process_evidence"], list)
    assert data["process_evidence"] == []
    assert isinstance(data["mitre_mappings"], list)
    assert data["mitre_mappings"] == []
    assert isinstance(data["recommendations"], list)
    assert data["recommendations"] == []
    assert isinstance(data["timeline"], list)
    assert data["timeline"] == []


# 16. Status and severity serialize using enum values
def test_status_severity_enum_serialization(db_session):
    create_mock_investigation(
        db_session,
        "INV-ENUMS",
        status=InvestigationStatus.NEW,
        severity=InvestigationSeverity.HIGH,
    )
    res = client.get("/api/v1/investigations/INV-ENUMS/workspace")
    assert res.status_code == 200
    data = res.json()
    assert data["investigation"]["status"] == "NEW"
    assert data["investigation"]["severity"] == "HIGH"


# 17. risk_score=0.0 is preserved correctly
def test_risk_score_zero_preserved(db_session):
    create_mock_investigation(db_session, "INV-ZERO-RISK", risk_score=0.0)
    res = client.get("/api/v1/investigations/INV-ZERO-RISK/workspace")
    assert res.status_code == 200
    data = res.json()
    assert data["investigation"]["risk_score"] == 0.0


# 18. confidence=0.0 is preserved correctly
def test_confidence_zero_preserved(db_session):
    create_mock_investigation(db_session, "INV-ZERO-CONF", confidence=0.0)
    res = client.get("/api/v1/investigations/INV-ZERO-CONF/workspace")
    assert res.status_code == 200
    data = res.json()
    assert data["investigation"]["confidence"] == 0.0


# 19. Legacy and behavioral API compatibility
def test_legacy_behavioral_api_compatibility(db_session):
    # Both endpoints return 200
    create_mock_investigation(db_session, "INV-COMPAT")
    res1 = client.get("/api/v1/investigations/INV-COMPAT")
    res2 = client.get("/api/v1/investigations/INV-COMPAT/workspace")
    assert res1.status_code == 200
    assert res2.status_code == 200


# 20. Existing investigation status endpoint still works
def test_existing_status_endpoint_works(db_session):
    create_mock_investigation(db_session, "INV-STATUS", status=InvestigationStatus.NEW)
    res = client.patch(
        "/api/v1/investigations/INV-STATUS/status", json={"status": "INVESTIGATING"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "INVESTIGATING"


# 21. Existing report endpoint remains operational
def test_existing_report_endpoint_works(db_session):
    create_mock_investigation(
        db_session,
        "INV-REPORT",
        alert_json=get_valid_alert_data(),
        analysis_json=get_valid_analysis_data(),
    )
    res = client.get("/api/v1/investigations/INV-REPORT/report")
    assert res.status_code == 200
    data = res.json()
    assert "report" in data


# 22. Workspace service does not duplicate detection_json normalization logic
def test_workspace_service_normalization_dedup():
    import inspect
    source = inspect.getsource(InvestigationService.get_workspace)
    assert "normalized_dets" not in source
    assert "normalized_primary" not in source
    assert "ContextBuilder.build" in source


# 23. Workspace endpoint does not expose the complete internal ContextBuilder dictionary
def test_workspace_endpoint_does_not_leak_context(db_session):
    create_mock_investigation(db_session, "INV-LEAK-TEST")
    res = client.get("/api/v1/investigations/INV-LEAK-TEST/workspace")
    assert res.status_code == 200
    data = res.json()
    # ContextBuilder internal fields that should NOT be in API response root
    assert "conversation" not in data
    assert "evidence_graph" not in data
    assert "current_page" not in data
    assert "analysis_context" not in data


# 24. Performance benchmark
def test_workspace_performance_benchmark(db_session):
    # Setup 100 correlated detections
    dets = []
    for i in range(100):
        dets.append({
            "id": f"det-{i}",
            "rule_id": f"rule-{i % 5}",
            "title": f"Title {i}",
            "description": f"Description {i}",
            "severity": "HIGH" if i % 10 == 0 else "LOW",
            "confidence": 80.0,
            "host_id": "host-perf",
            "process_guid": f"guid-{i}",
            "timestamp": 100.0 + i,
            "mitre_technique": "T1059",
            "mitre_tactic": "Execution",
            "recommendations": [f"Rec {i % 3}"],
            "evidence": [
                {
                    "Process Name": f"proc-{i}.exe",
                    "PID": 1000 + i,
                    "Parent PID": 1000,
                    "Executable": f"C:\\proc-{i}.exe",
                }
            ],
        })

    det_json = {
        "correlation_id": "corr-perf-100",
        "group_size": 100,
        "primary_detection": dets[0],
        "detections": dets,
    }
    create_mock_investigation(db_session, "INV-PERF-WS", detection_json=det_json)

    start = time.perf_counter()

    # Call get_workspace directly
    workspace = InvestigationService.get_workspace(db_session, "INV-PERF-WS")

    elapsed_ms = (time.perf_counter() - start) * 1000
    print(f"\n[Workspace API Performance] Processed 100 detections in {elapsed_ms:.2f} ms")

    assert workspace is not None
    assert len(workspace["behavioral_detections"]) == 100
    assert elapsed_ms < 50.0
