"""
Database Isolation Architecture Regression Tests
=================================================

These tests verify the correctness of the centralized PostgreSQL test
isolation architecture described in tests/conftest.py.

Tests are deterministic and do NOT rely on execution ordering.
Each test is self-contained: it uses fixture-level lifecycle to prove
that data is correctly isolated and not committed to the actual database.

Requirements verified:
    1. runtime DATABASE_URL and TEST_DATABASE_URL cannot resolve to the same db
    2. Unsafe test database names are rejected by the validator
    3. db_session data is visible within the test (savepoint works)
    4. db_session data is NOT committed to the actual PostgreSQL database
       (proven by querying with a separate external connection)
    5. FastAPI TestClient requests use the isolated test database session
    6. db_session_factory allows multiple sessions with correct cross-session
       data visibility within the same outer transaction
"""
import pytest
from datetime import datetime, UTC
from sqlalchemy import text

from app.core.config import settings
from app.models.investigation import Investigation, InvestigationSeverity, InvestigationStatus
from app.models.timeline import TimelineEvent, TimelineEventType, TimelineActor

# Import the validator directly so it can be tested as a plain function
from tests.conftest import validate_test_db_target


# ---------------------------------------------------------------------------
# 1. URL Safety: runtime DB ≠ test DB
# ---------------------------------------------------------------------------

def test_runtime_and_test_databases_are_different():
    """
    Verifies that DATABASE_URL and TEST_DATABASE_URL resolve to different
    database names. This is the primary architectural safety guarantee.
    """
    from sqlalchemy.engine import make_url

    if not settings.TEST_DATABASE_URL:
        pytest.skip("TEST_DATABASE_URL not configured")

    runtime_url = make_url(str(settings.DATABASE_URL))
    test_url = make_url(str(settings.TEST_DATABASE_URL))

    assert runtime_url.database != test_url.database, (
        f"DATABASE_URL and TEST_DATABASE_URL must target different databases. "
        f"Got: runtime='{runtime_url.database}', test='{test_url.database}'"
    )


# ---------------------------------------------------------------------------
# 2. Validator rejects unsafe configurations
# ---------------------------------------------------------------------------

def test_validator_rejects_same_database_name():
    """
    validate_test_db_target() raises RuntimeError when the test URL targets
    the same database name as the runtime URL.
    """
    with pytest.raises(RuntimeError, match="same as the runtime"):
        validate_test_db_target(
            "postgresql://user:pw@localhost:5432/darkvector",
            "postgresql://user:pw@localhost:5432/darkvector",
        )


def test_validator_rejects_database_name_without_test_marker():
    """
    validate_test_db_target() raises RuntimeError when the test database name
    does not contain the word 'test'.
    """
    with pytest.raises(RuntimeError, match="does not contain"):
        validate_test_db_target(
            "postgresql://user:pw@localhost:5432/darkvector",
            "postgresql://user:pw@localhost:5432/darkvector_staging",
        )


def test_validator_accepts_valid_test_database():
    """
    validate_test_db_target() does not raise when the test database name
    is different from the runtime DB and contains 'test'.
    """
    # Should not raise
    validate_test_db_target(
        "postgresql://user:pw@localhost:5432/darkvector",
        "postgresql://user:pw@localhost:5432/darkvector_test",
    )


# ---------------------------------------------------------------------------
# 3. Data is visible within the test session (savepoint works)
# ---------------------------------------------------------------------------

def test_data_visible_within_test_session(db_session):
    """
    Data added to db_session and committed is visible within the same test
    via db_session queries. This verifies that the savepoint architecture
    correctly makes committed data available during the test.
    """
    unique_id = "INV-ISOLATION-VISIBLE"
    inv = Investigation(
        investigation_id=unique_id,
        alert_id="alert-isolation-visible",
        title="Isolation Visible Test",
        status=InvestigationStatus.NEW,
        severity=InvestigationSeverity.LOW,
        risk_score=0.0,
        confidence=0.0,
        summary="Isolation test — visibility verification",
    )
    db_session.add(inv)
    db_session.commit()

    # Data must be queryable within the same session
    found = db_session.query(Investigation).filter_by(
        investigation_id=unique_id
    ).first()
    assert found is not None, (
        "Data committed inside a test must be visible via db_session queries."
    )
    assert found.investigation_id == unique_id


# ---------------------------------------------------------------------------
# 4. Data is NOT committed to the actual PostgreSQL database
# ---------------------------------------------------------------------------

def test_committed_data_not_visible_outside_outer_transaction(db_session, test_engine):
    """
    Data committed inside a test (via db_session) must NOT be visible from
    an external database connection.

    This is the definitive architectural proof: the data exists in
    db_connection's outer BEGIN transaction (visible via db_session), but
    has never been committed to the actual PostgreSQL storage. A fresh
    connection to the same database will not see it.

    This test is self-contained — it does not rely on another test running
    first, and does not depend on test ordering.
    """
    unique_id = "INV-ISOLATION-PROOF-EXTERNAL"
    inv = Investigation(
        investigation_id=unique_id,
        alert_id="alert-isolation-proof",
        title="External Visibility Proof",
        status=InvestigationStatus.NEW,
        severity=InvestigationSeverity.LOW,
        risk_score=0.0,
        confidence=0.0,
        summary="Isolation proof test",
    )
    db_session.add(inv)
    db_session.commit()

    # Verify it is visible within the test session (savepoint working)
    found_internally = db_session.query(Investigation).filter_by(
        investigation_id=unique_id
    ).first()
    assert found_internally is not None, "Data must be visible within db_session"

    # Open a completely separate connection to the same test database.
    # This connection has NO knowledge of db_connection's uncommitted transaction.
    # If data is NOT committed, this query will return nothing.
    with test_engine.connect() as external_conn:
        result = external_conn.execute(
            text(
                "SELECT investigation_id FROM investigations "
                "WHERE investigation_id = :inv_id"
            ),
            {"inv_id": unique_id},
        ).fetchone()

    assert result is None, (
        f"ISOLATION FAILURE: Data committed inside a test appeared in an external "
        f"connection. This means the outer transaction was accidentally committed, "
        f"and data will persist in darkvector_test between tests. "
        f"Found: {result}"
    )


# ---------------------------------------------------------------------------
# 5. FastAPI TestClient requests use the isolated session
# ---------------------------------------------------------------------------

def test_api_endpoint_uses_isolated_session(db_session, client):
    """
    Data written via db_session is visible to FastAPI API endpoints when
    accessed through the conftest.py client fixture.

    This verifies that the get_db dependency override in db_session routes
    API requests through the same isolated session (and therefore the same
    outer transaction that will be rolled back after the test).
    """
    unique_id = "INV-API-ISOLATION"
    inv = Investigation(
        investigation_id=unique_id,
        alert_id="alert-api-isolation",
        title="API Isolation Test",
        status=InvestigationStatus.NEW,
        severity=InvestigationSeverity.HIGH,
        risk_score=85.0,
        confidence=0.85,
        summary="Test that API sees isolated session data",
    )
    db_session.add(inv)
    db_session.commit()

    # The API endpoint must find the investigation through the overridden get_db
    res = client.get(f"/api/v1/investigations/{unique_id}/workspace")
    assert res.status_code == 200, (
        f"API should find the investigation created in db_session. "
        f"Got: {res.status_code} — {res.text}"
    )
    data = res.json()
    assert data["investigation"]["investigation_id"] == unique_id


# ---------------------------------------------------------------------------
# 6. db_session_factory: cross-session data visibility + isolation
# ---------------------------------------------------------------------------

def test_session_factory_cross_session_visibility(db_session_factory, test_engine):
    """
    db_session_factory sessions share the same outer transaction boundary.

    Verify:
        a) Data committed in session 1 is visible in session 2 (required by
           scheduler lifecycle tests where cycle N+1 must see cycle N's data)
        b) Data is NOT externally committed to PostgreSQL (outer tx rollback works)
    """
    unique_id_1 = "INV-FACTORY-SESSION-1"
    unique_id_2 = "INV-FACTORY-SESSION-2"

    # Session 1: insert and commit
    db1 = db_session_factory()
    inv1 = Investigation(
        investigation_id=unique_id_1,
        alert_id="alert-factory-1",
        title="Factory Session 1",
        status=InvestigationStatus.NEW,
        severity=InvestigationSeverity.LOW,
        risk_score=0.0,
        confidence=0.0,
        summary="Session factory cross-session test — session 1",
    )
    db1.add(inv1)
    db1.commit()
    db1.close()

    # Session 2: must see session 1's data
    db2 = db_session_factory()
    found = db2.query(Investigation).filter_by(
        investigation_id=unique_id_1
    ).first()
    assert found is not None, (
        "db_session_factory session 2 must see data committed by session 1. "
        "This is required for scheduler lifecycle tests (cycle N+1 must see cycle N telemetry)."
    )

    # Session 2: insert its own data
    inv2 = Investigation(
        investigation_id=unique_id_2,
        alert_id="alert-factory-2",
        title="Factory Session 2",
        status=InvestigationStatus.NEW,
        severity=InvestigationSeverity.LOW,
        risk_score=0.0,
        confidence=0.0,
        summary="Session factory cross-session test — session 2",
    )
    db2.add(inv2)
    db2.commit()
    db2.close()

    # External verification: neither investigation should be committed to the DB
    with test_engine.connect() as external_conn:
        result1 = external_conn.execute(
            text("SELECT investigation_id FROM investigations WHERE investigation_id = :id"),
            {"id": unique_id_1},
        ).fetchone()
        result2 = external_conn.execute(
            text("SELECT investigation_id FROM investigations WHERE investigation_id = :id"),
            {"id": unique_id_2},
        ).fetchone()

    assert result1 is None, (
        f"ISOLATION FAILURE: Session 1 data '{unique_id_1}' appeared in an external "
        f"connection — the outer transaction was not rolled back correctly."
    )
    assert result2 is None, (
        f"ISOLATION FAILURE: Session 2 data '{unique_id_2}' appeared in an external "
        f"connection — the outer transaction was not rolled back correctly."
    )
