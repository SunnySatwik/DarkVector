from datetime import datetime, timezone
import pytest
from app.schemas.timeline import TimelineEventResponse
from app.schemas.investigation import InvestigationResponse
from app.models.timeline import TimelineActor, TimelineEventType
from app.models.investigation import InvestigationSeverity, InvestigationStatus
from app.services.llm.fallback import FallbackAI
from app.services.llm.policy import ResponsePolicy, PromptRoute, ResponseScope, RetrievalDecision

def test_timeline_event_response_timezone_serialization():
    # Test that TimelineEventResponse serializes timezone-naive and timezone-aware datetimes with timezone offset (ISO 8601 UTC)
    naive_dt = datetime(2026, 7, 13, 19, 25, 22)
    aware_dt = datetime(2026, 7, 13, 19, 25, 22, tzinfo=timezone.utc)
    
    resp_naive = TimelineEventResponse(
        id="d3b07384-d113-4ec6-a5b6-764955743b18",
        timestamp=naive_dt,
        actor=TimelineActor.SYSTEM,
        event_type=TimelineEventType.ALERT_CREATED,
        title="Alert Created",
        description="Behavioral alert triggered"
    )
    
    resp_aware = TimelineEventResponse(
        id="d3b07384-d113-4ec6-a5b6-764955743b18",
        timestamp=aware_dt,
        actor=TimelineActor.SYSTEM,
        event_type=TimelineEventType.ALERT_CREATED,
        title="Alert Created",
        description="Behavioral alert triggered"
    )
    
    json_naive = resp_naive.model_dump_json()
    json_aware = resp_aware.model_dump_json()
    
    # Both must contain timezone indicators (+00:00 or Z)
    assert "+00:00" in json_naive or "Z" in json_naive or "19:25:22+00" in json_naive
    assert "+00:00" in json_aware or "Z" in json_aware or "19:25:22+00" in json_aware

def test_investigation_response_timezone_serialization():
    # Test that InvestigationResponse serializes created_at and updated_at timezone-correctly
    dt = datetime(2026, 7, 13, 19, 25, 22)
    resp = InvestigationResponse(
        investigation_id="INV-260713-CB785E",
        alert_id="alert-123",
        title="Test Investigation",
        status=InvestigationStatus.NEW,
        severity=InvestigationSeverity.HIGH,
        risk_score=95.0,
        confidence=0.9,
        summary="Test",
        created_at=dt,
        updated_at=dt
    )
    
    json_data = resp.model_dump_json()
    assert "+00:00" in json_data or "Z" in json_data or "19:25:22+00" in json_data
