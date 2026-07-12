"""
Status lifecycle tests.

Uses db_session and client fixtures from tests/conftest.py so:
- All writes go to darkvector_test (not the development darkvector database)
- Test data is rolled back after each test
- The investigation created here is never persisted permanently
"""
import pytest
from datetime import datetime, UTC
from fastapi.testclient import TestClient

from main import app
from app.models.investigation import Investigation, InvestigationSeverity, InvestigationStatus
from app.models.timeline import TimelineEvent, TimelineEventType, TimelineActor


def test_investigation_status_lifecycle(db_session, client):
    """
    Tests the full investigation status lifecycle:
    1. Create investigation via db_session (isolated test DB)
    2. Verify initial state via API
    3. Patch status → INVESTIGATING
    4. Verify timeline has a STATUS_CHANGED event
    5. Verify idempotency: patching same status again creates NO new timeline event
    """
    # Create a test investigation in the isolated database
    inv = Investigation(
        investigation_id="INV-STATUS-LIFECYCLE",
        alert_id="alert-status-lifecycle",
        title="Status Lifecycle Test",
        status=InvestigationStatus.NEW,
        severity=InvestigationSeverity.HIGH,
        risk_score=90.0,
        confidence=0.9,
        summary="Test investigation for status lifecycle",
    )
    db_session.add(inv)
    db_session.commit()

    # 1. Verify initial status
    get_res = client.get("/api/v1/investigations/INV-STATUS-LIFECYCLE")
    assert get_res.status_code == 200
    assert get_res.json()["investigation"]["status"] == "NEW"

    # 2. Patch status to INVESTIGATING
    patch_res = client.patch(
        "/api/v1/investigations/INV-STATUS-LIFECYCLE/status",
        json={"status": "INVESTIGATING"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "INVESTIGATING"

    # 3. Verify timeline has status_changed event
    timeline_res = client.get("/api/v1/investigations/INV-STATUS-LIFECYCLE/timeline")
    assert timeline_res.status_code == 200
    timeline = timeline_res.json()

    status_events = [
        e for e in timeline
        if e["event_type"] == TimelineEventType.STATUS_CHANGED.value
    ]
    assert len(status_events) >= 1, "Expected at least one STATUS_CHANGED timeline event"

    latest_event = status_events[-1]
    assert latest_event["title"] == "Status changed"
    assert latest_event["description"] == "Investigation marked as Investigating."

    # 4. Idempotency: patching same status again must NOT add another event
    patch_res_dup = client.patch(
        "/api/v1/investigations/INV-STATUS-LIFECYCLE/status",
        json={"status": "INVESTIGATING"},
    )
    assert patch_res_dup.status_code == 200

    timeline_res_dup = client.get("/api/v1/investigations/INV-STATUS-LIFECYCLE/timeline")
    assert timeline_res_dup.status_code == 200
    timeline_dup = timeline_res_dup.json()

    status_events_dup = [
        e for e in timeline_dup
        if e["event_type"] == TimelineEventType.STATUS_CHANGED.value
    ]
    assert len(status_events_dup) == len(status_events), (
        "Patching the same status a second time must not add a duplicate STATUS_CHANGED event"
    )


def test_investigation_status_404(client):
    """
    Verifies that patching a non-existent investigation returns 404.
    """
    patch_res = client.patch(
        "/api/v1/investigations/INV-NONEXISTENT-STATUS/status",
        json={"status": "INVESTIGATING"},
    )
    assert patch_res.status_code == 404
