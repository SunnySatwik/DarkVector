from fastapi.testclient import TestClient
from main import app
from app.models.investigation import InvestigationStatus
from app.models.timeline import TimelineEventType

client = TestClient(app)

def test_investigation_status_lifecycle():
    # 1. Get investigations
    res = client.get("/api/v1/investigations")
    assert res.status_code == 200
    data = res.json()
    investigations = data.get("investigations", [])
    
    # If no investigations exist, we can't test lifecycle on an existing one.
    # But usually seed data or mock investigations are available during run.
    if not investigations:
        # Let's verify status patch returns 404 for a dummy ID
        patch_res = client.patch("/api/v1/investigations/INV-DUMMY/status", json={"status": "INVESTIGATING"})
        assert patch_res.status_code == 404
        return

    target = investigations[0]
    inv_id = target["investigation_id"]
    original_status = target["status"]

    # 2. Patch status to a new status (e.g. INVESTIGATING, or CONTAINED if it is already INVESTIGATING)
    new_status = "INVESTIGATING" if original_status != "INVESTIGATING" else "CONTAINED"
    patch_res = client.patch(f"/api/v1/investigations/{inv_id}/status", json={"status": new_status})
    assert patch_res.status_code == 200
    updated_data = patch_res.json()
    assert updated_data["status"] == new_status

    # 3. Check timeline
    timeline_res = client.get(f"/api/v1/investigations/{inv_id}/timeline")
    assert timeline_res.status_code == 200
    timeline = timeline_res.json()
    
    # Verify at least one status_changed event exists with the correct description
    status_events = [e for e in timeline if e["event_type"] == TimelineEventType.STATUS_CHANGED.value]
    assert len(status_events) >= 1
    
    # The last status event should be our new transition
    latest_event = status_events[-1]
    assert latest_event["title"] == "Status changed"
    assert latest_event["description"] == f"Investigation marked as {new_status.title()}."

    # 4. Check idempotency (patching same status again should NOT add another event)
    initial_event_count = len(status_events)
    patch_res_dup = client.patch(f"/api/v1/investigations/{inv_id}/status", json={"status": new_status})
    assert patch_res_dup.status_code == 200
    
    timeline_res_dup = client.get(f"/api/v1/investigations/{inv_id}/timeline")
    timeline_dup = timeline_res_dup.json()
    status_events_dup = [e for e in timeline_dup if e["event_type"] == TimelineEventType.STATUS_CHANGED.value]
    assert len(status_events_dup) == initial_event_count
