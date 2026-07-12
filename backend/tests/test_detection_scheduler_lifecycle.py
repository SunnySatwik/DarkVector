import pytest
from datetime import datetime, timedelta

from app.models.telemetry import TelemetryEvent
from app.services.detection.scheduler import DetectionScheduler, TelemetryEventDTO

# ─────────────────────────────────────────────────────────────────────────────
# REMOVED: clean_db autouse fixture
#
# The previous fixture was:
#
#   @pytest.fixture(autouse=True)
#   def clean_db():
#       db = SessionLocal()
#       db.query(TimelineEvent).delete()
#       db.query(Investigation).delete()
#       db.query(TelemetryEvent).delete()
#       db.commit()
#       ...
#
# This directly committed destructive DELETE operations against the development
# darkvector PostgreSQL database, permanently destroying real investigation,
# telemetry, and timeline data every time the test suite ran.
#
# Replacement:
#   - Database cleanup is provided by db_session / db_session_factory fixtures
#     from tests/conftest.py. All writes go to darkvector_test and are rolled
#     back after each test via outer transaction rollback.
#   - Scheduler state reset is provided by the autouse reset_scheduler fixture
#     in tests/conftest.py (calls DetectionScheduler.reset() before/after each test).
# ─────────────────────────────────────────────────────────────────────────────


def test_dto_conversion_and_decoupling(db_session_factory):
    """
    Test 1: Verify TelemetryEventDTO correctly extracts parameters
    and remains usable after session close.

    Uses db_session_factory to obtain a session so the test can call
    session.close() to simulate object detachment without affecting the
    conftest fixture's lifecycle management.
    """
    db = db_session_factory()
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

        # Map to DTO while session is still active
        dto = TelemetryEventDTO.from_event(event)

        # Close session (simulating object detachment from SQLAlchemy session)
        db.close()

        # Access attributes on DTO — must succeed without raising DetachedInstanceError
        assert dto.id == "event-1"
        assert dto.host_id == "host-1"
        assert dto.event_type == "process_start"
        assert dto.payload["pid"] == 1234

    except Exception:
        db.close()
        raise


def test_scheduler_lifecycle_across_sessions(db_session_factory):
    """
    Test 2: Simulate multi-cycle detection scheduler worker.

    Cycle 1: Load process telemetry, construct trees, close session.
    Cycle 2: Load new process telemetry, reconstruct tree using context
             (which includes Cycle 1 data from the in-memory process context),
             without raising DetachedInstanceError.

    Session isolation semantics:
        - db1 and db2 are separate Session objects, mirroring real scheduler behaviour
        - Both are bound to the same db_connection outer transaction (from conftest.py)
        - Data committed in db1 (SAVEPOINT released) is visible to db2 via the shared
          connection; the outer transaction is rolled back after the test
        - DetectionScheduler._process_context (in-memory) accumulates across cycles
          and is reset by the autouse reset_scheduler fixture in conftest.py
    """
    # Cycle 1
    db1 = db_session_factory()
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
    db2 = db_session_factory()
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

        # Run cycle 2 — must successfully build process tree referencing both
        # parent and child without raising DetachedInstanceError
        res2 = DetectionScheduler.run(db2)
        assert res2 >= 0
    finally:
        db2.close()

    # Verify both events are in the in-memory process context after two cycles
    assert "event-parent" in DetectionScheduler._process_context
    assert "event-child" in DetectionScheduler._process_context


def test_scheduler_failure_does_not_advance_cursor(db_session_factory):
    """
    Test 3: Verify that a downstream scheduler failure (e.g. exception during run)
    does not advance the timestamp cursor or commit the new context.
    """
    db = db_session_factory()
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

        # Cursor and context must not be updated after a failed cycle
        assert DetectionScheduler._last_processed_timestamp is None
        assert DetectionScheduler._process_context == {}
    finally:
        db.close()
