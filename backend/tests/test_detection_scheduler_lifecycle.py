import pytest
from datetime import datetime, timedelta
from app.database.session import SessionLocal
from app.models.telemetry import TelemetryEvent
from app.models.investigation import Investigation
from app.models.timeline import TimelineEvent
from app.services.detection.scheduler import DetectionScheduler, TelemetryEventDTO


@pytest.fixture(autouse=True)
def clean_db():
    """Ensure clean database before and after each test."""
    db = SessionLocal()
    try:
        db.query(TimelineEvent).delete()
        db.query(Investigation).delete()
        db.query(TelemetryEvent).delete()
        db.commit()
    finally:
        db.close()

    DetectionScheduler.reset()
    yield
    DetectionScheduler.reset()

    db = SessionLocal()
    try:
        db.query(TimelineEvent).delete()
        db.query(Investigation).delete()
        db.query(TelemetryEvent).delete()
        db.commit()
    finally:
        db.close()


def test_dto_conversion_and_decoupling():
    """
    Test 1: Verify TelemetryEventDTO correctly extracts parameters
    and remains usable after session close.
    """
    db = SessionLocal()
    try:
        event = TelemetryEvent(
            id="event-1",
            host_id="host-1",
            hostname="host-one",
            timestamp=datetime.utcnow(),
            event_type="process_start",
            severity="low",
            source="sentinel",
            payload={
                "pid": 1234,
                "ppid": 1,
                "process_name": "cmd.exe",
                "exe": "cmd.exe",
                "cmdline": ["cmd.exe", "/c"],
                "create_time": 100.0,
            }
        )
        db.add(event)
        db.commit()
        db.refresh(event)

        # Map to DTO
        dto = TelemetryEventDTO.from_event(event)

        # Close session (simulating object detachment)
        db.close()

        # Access attributes on DTO - must succeed and not raise DetachedInstanceError
        assert dto.id == "event-1"
        assert dto.host_id == "host-1"
        assert dto.event_type == "process_start"
        assert dto.payload["pid"] == 1234

    except Exception:
        db.close()
        raise


def test_scheduler_lifecycle_across_sessions():
    """
    Test 2: Simulate multi-cycle detection scheduler worker.
    Cycle 1: Load process telemetry, construct trees, close session (detach).
    Cycle 2: Load new process telemetry, reconstruct tree using context, without DetachedInstanceError.
    """
    # Cycle 1
    db1 = SessionLocal()
    try:
        event1 = TelemetryEvent(
            id="event-parent",
            host_id="host-1",
            hostname="host-one",
            timestamp=datetime.utcnow() - timedelta(minutes=5),
            event_type="process_start",
            severity="low",
            source="sentinel",
            payload={
                "pid": 1000,
                "ppid": 0,
                "process_name": "explorer.exe",
                "create_time": 100.0,
            }
        )
        db1.add(event1)
        db1.commit()

        # Run cycle 1
        res1 = DetectionScheduler.run(db1)
        assert res1 >= 0
    finally:
        db1.close()

    # Cycle 2
    db2 = SessionLocal()
    try:
        event2 = TelemetryEvent(
            id="event-child",
            host_id="host-1",
            hostname="host-one",
            timestamp=datetime.utcnow(),
            event_type="process_start",
            severity="low",
            source="sentinel",
            payload={
                "pid": 2000,
                "ppid": 1000,
                "process_name": "cmd.exe",
                "create_time": 101.0,
            }
        )
        db2.add(event2)
        db2.commit()

        # Run cycle 2 - must successfully build process tree referencing both parent and child, without DetachedInstanceError
        res2 = DetectionScheduler.run(db2)
        assert res2 >= 0
    finally:
        db2.close()

    # Verify context survives
    assert "event-parent" in DetectionScheduler._process_context
    assert "event-child" in DetectionScheduler._process_context


def test_scheduler_failure_does_not_advance_cursor():
    """
    Test 3: Verify that a downstream scheduler failure (e.g. exception during run)
    does not advance the timestamp cursor or commit the new context.
    """
    db = SessionLocal()
    try:
        event = TelemetryEvent(
            id="event-fail",
            host_id="host-1",
            hostname="host-one",
            timestamp=datetime.utcnow(),
            event_type="process_start",
            severity="low",
            source="sentinel",
            payload={
                "pid": 1000,
                "ppid": 0,
                "process_name": "bad.exe",
                "create_time": 100.0,
            }
        )
        db.add(event)
        db.commit()

        # We mock ProcessTreeBuilder.build to raise an exception
        from unittest.mock import patch
        with patch("app.services.detection.scheduler.ProcessTreeBuilder.build", side_effect=RuntimeError("Builder failed")):
            with pytest.raises(RuntimeError, match="Builder failed"):
                DetectionScheduler.run(db)

        # Cursor and context must not be updated
        assert DetectionScheduler._last_processed_timestamp is None
        assert DetectionScheduler._process_context == {}
    finally:
        db.close()
