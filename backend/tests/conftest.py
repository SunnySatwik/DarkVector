"""
DarkVector Test Database Infrastructure
========================================

This conftest.py provides centralized, production-grade PostgreSQL database
isolation for the entire test suite.

Architecture:
    test_engine (session-scoped)
        ↓  creates one SQLAlchemy engine per pytest run
    db_connection (function-scoped)
        ↓  one connection per test, wrapped in an outer BEGIN transaction
    db_session (function-scoped)
        ↓  session bound to db_connection, uses SAVEPOINTs
        ↓  FastAPI get_db overridden to yield this session
    db_session_factory (function-scoped)
        ↓  callable returning sessions bound to the same db_connection
        ↓  used by multi-session scheduler lifecycle tests
    client (function-scoped)
        ↓  FastAPI TestClient that uses the isolated db_session

Safety guarantees:
    - TEST_DATABASE_URL must differ from DATABASE_URL (validated via URL parsing)
    - TEST_DATABASE_URL database name must contain 'test'
    - Outer connection transaction is ALWAYS rolled back after each test
    - Application code calling session.commit() commits the current SAVEPOINT,
      not the outer transaction; the after_transaction_end listener issues a
      fresh SAVEPOINT so subsequent commits are also isolated
    - Tests that do not use db_session, db_session_factory, or client do NOT
      connect to PostgreSQL at all (pure unit tests remain DB-free)

DB Setup:
    psql -U postgres -c "CREATE DATABASE darkvector_test;"
    Set TEST_DATABASE_URL=postgresql://postgres:<pwd>@localhost:5432/darkvector_test in .env
"""

from __future__ import annotations

import pytest
from sqlalchemy import create_engine, event as sa_event
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.base import Base

# Register all models with Base.metadata so create_all creates every table
from app.models.investigation import Investigation  # noqa: F401
from app.models.timeline import TimelineEvent       # noqa: F401
from app.models.telemetry import TelemetryEvent    # noqa: F401
from app.models.endpoint_agent import EndpointAgent # noqa: F401
from app.models.event import Event                  # noqa: F401
from app.models.containment import ContainmentJob   # noqa: F401


# ---------------------------------------------------------------------------
# Safety Validator — plain function, independently testable
# ---------------------------------------------------------------------------

def validate_test_db_target(runtime_url_str: str, test_url_str: str) -> None:
    """
    Validates that the configured TEST_DATABASE_URL is safe to use for
    automated tests.

    Raises:
        RuntimeError: If the test database matches the runtime database name,
                      or if the test database name does not contain 'test'.

    This function intentionally raises RuntimeError rather than calling
    pytest.exit() so it can be independently tested as a normal Python function.
    The test_engine fixture converts RuntimeError into pytest.exit().
    """
    runtime_url = make_url(runtime_url_str)
    test_url = make_url(test_url_str)

    runtime_db = runtime_url.database or ""
    test_db = test_url.database or ""

    if runtime_db == test_db:
        raise RuntimeError(
            f"[DB SAFETY] TEST_DATABASE_URL targets database '{test_db}', which is the same "
            f"as the runtime DATABASE_URL database '{runtime_db}'. "
            f"pytest refuses to start — running tests against the development database "
            f"would delete your real investigation and telemetry data."
        )

    if "test" not in test_db.lower():
        raise RuntimeError(
            f"[DB SAFETY] TEST_DATABASE_URL database name '{test_db}' does not contain "
            f"the word 'test'. pytest refuses to start to protect your data. "
            f"Configure a database whose name clearly indicates it is for testing, "
            f"e.g. darkvector_test."
        )


# ---------------------------------------------------------------------------
# Internal helper: build an isolated session with savepoint management
# ---------------------------------------------------------------------------

def _make_isolated_session(connection) -> Session:
    """
    Creates a SQLAlchemy Session bound to *connection* with automatic
    SAVEPOINT management.

    Behaviour:
        - session.commit() commits the current SAVEPOINT (not the outer tx)
        - The after_transaction_end listener immediately issues a new SAVEPOINT
          so that subsequent application-level commit() calls are still isolated
        - The outer connection's BEGIN transaction is never committed; it is
          always rolled back by db_connection fixture teardown

    This pattern correctly isolates tests that call session.commit() any
    number of times, including application code inside repository layers.
    """
    session = Session(bind=connection)
    session.begin_nested()  # issue initial SAVEPOINT

    @sa_event.listens_for(session, "after_transaction_end")
    def _restart_savepoint(session: Session, transaction) -> None:  # type: ignore[type-arg]
        # Re-issue a new SAVEPOINT after each savepoint commit or rollback.
        # Condition: the ending transaction is a nested (savepoint) transaction
        # whose parent is the outer (non-nested) connection transaction.
        if transaction.nested and not transaction._parent.nested:
            try:
                session.begin_nested()
            except Exception:
                # Session may have been closed; ignore.
                pass

    return session


# ---------------------------------------------------------------------------
# FIXTURE: test_engine  (session-scoped — created once per pytest run)
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def test_engine():
    """
    Session-scoped SQLAlchemy engine bound to the isolated test database.

    - Validates TEST_DATABASE_URL safety before any connection is made.
    - Creates the full schema on test database startup.
    - Drops the schema after the entire pytest session completes.

    If TEST_DATABASE_URL is not configured, all database-dependent tests are
    automatically skipped. Pure unit tests (which do not request db_session,
    db_session_factory, or client) are unaffected.
    """
    test_url = settings.TEST_DATABASE_URL

    if not test_url:
        pytest.skip(
            "TEST_DATABASE_URL is not configured. "
            "Add TEST_DATABASE_URL=postgresql://...@localhost:5432/darkvector_test "
            "to your .env file to enable database tests."
        )

    # Safety validation — abort the entire suite if the URL is unsafe
    try:
        validate_test_db_target(str(settings.DATABASE_URL), str(test_url))
    except RuntimeError as exc:
        pytest.exit(str(exc), returncode=1)

    engine = create_engine(str(test_url), echo=False, pool_pre_ping=True)

    # Create schema once for the entire test session
    Base.metadata.create_all(bind=engine)

    # Run migrations on test DB
    from sqlalchemy import text
    with engine.begin() as conn:
        try:
            if engine.dialect.name == "postgresql":
                # Add columns to investigations
                conn.execute(text("ALTER TABLE investigations ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE"))
                conn.execute(text("ALTER TABLE investigations ADD COLUMN IF NOT EXISTS containment_status VARCHAR(50) DEFAULT NULL"))
                conn.execute(text("ALTER TABLE investigations ADD COLUMN IF NOT EXISTS containment_message TEXT DEFAULT NULL"))
                # Update null values for safety
                conn.execute(text("UPDATE investigations SET is_deleted = FALSE WHERE is_deleted IS NULL"))
                try:
                    conn.execute(text("ALTER TYPE investigation_status ADD VALUE 'ARCHIVED'"))
                except Exception:
                    pass
        except Exception as e:
            print(f"Warning altering test investigations table: {e}")

    yield engine

    # Tear down schema after all tests complete — ONLY against the verified test DB
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


# ---------------------------------------------------------------------------
# FIXTURE: db_connection  (function-scoped — one per test)
# ---------------------------------------------------------------------------

@pytest.fixture
def db_connection(test_engine):
    """
    Function-scoped database connection with an outer transaction boundary.

    The outer transaction is NEVER committed — it is always rolled back after
    the test function completes. This ensures zero test data persists in
    darkvector_test between tests.

    Both db_session and db_session_factory depend on this fixture, ensuring
    that all sessions within a single test share the same outer rollback boundary.
    """
    conn = test_engine.connect()
    trans = conn.begin()

    yield conn

    trans.rollback()
    conn.close()


# ---------------------------------------------------------------------------
# FIXTURE: db_session  (function-scoped)
# ---------------------------------------------------------------------------

@pytest.fixture
def db_session(db_connection):
    """
    Function-scoped SQLAlchemy session for tests that require a single database
    session with FastAPI API integration.

    Features:
        - Session is bound to db_connection's outer transaction
        - Application code may call session.commit() safely (commits savepoint)
        - FastAPI's get_db dependency is overridden to yield this session,
          so TestClient API requests within the test see the same data
        - All data is rolled back when db_connection fixture tears down

    Usage:
        def test_something(db_session):
            inv = Investigation(...)
            db_session.add(inv)
            db_session.commit()
            # TestClient requests via `client` fixture or module-level
            # TestClient(app) will see this investigation.
    """
    from main import app
    from app.dependencies.database import get_db

    session = _make_isolated_session(db_connection)

    def override_get_db():
        try:
            yield session
        finally:
            pass  # Session lifecycle is managed by this fixture, not FastAPI

    app.dependency_overrides[get_db] = override_get_db

    try:
        yield session
    finally:
        app.dependency_overrides.pop(get_db, None)
        session.close()


# ---------------------------------------------------------------------------
# FIXTURE: db_session_factory  (function-scoped)
# ---------------------------------------------------------------------------

@pytest.fixture
def db_session_factory(db_connection):
    """
    Function-scoped factory for creating multiple independent sessions within
    one test. Used by DetectionScheduler lifecycle tests that simulate
    multi-cycle behaviour with separate session objects (db1, db2).

    Semantics (matching scheduler lifecycle requirements):

        1. Cycle 1 opens db1 = db_session_factory()
        2. db1 inserts telemetry, commits (releases savepoint — data visible
           at connection level within the outer transaction)
        3. db1 is closed
        4. Cycle 2 opens db2 = db_session_factory()
        5. db2 can see cycle 1 data (same connection, same outer BEGIN)
        6. After the test, outer transaction rolls back — ZERO data persists

    All sessions created by this factory share db_connection's outer BEGIN
    transaction, so the single outer rollback at test teardown eliminates
    all data from every session.

    Each session has its own SAVEPOINT and after_transaction_end listener,
    so application code (including repository layer commits) is fully isolated.
    """
    created_sessions: list[Session] = []

    def make_session() -> Session:
        session = _make_isolated_session(db_connection)
        created_sessions.append(session)
        return session

    yield make_session

    # Close any sessions the test left open
    for session in created_sessions:
        try:
            if session.is_active:
                session.close()
        except Exception:
            pass


# ---------------------------------------------------------------------------
# FIXTURE: client  (function-scoped)
# ---------------------------------------------------------------------------

@pytest.fixture
def client(db_session):
    """
    Function-scoped FastAPI TestClient backed by the isolated db_session.

    The db_session fixture overrides app.dependency_overrides[get_db], so all
    requests through this client use the same isolated session — making test
    data written via db_session visible to API endpoints.
    """
    from fastapi.testclient import TestClient
    from main import app

    with TestClient(app) as c:
        yield c


# ---------------------------------------------------------------------------
# FIXTURE: reset_scheduler  (autouse — every test)
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def reset_scheduler():
    """
    Resets DetectionScheduler class-level state before and after every test.

    The scheduler stores a timestamp cursor and a rolling process context as
    class variables. Without resetting these, scheduler state leaks across
    tests regardless of database isolation.

    This fixture replaces the autouse clean_db fixture that previously called
    DetectionScheduler.reset() alongside destructive database deletes.
    """
    from app.services.detection.scheduler import DetectionScheduler
    DetectionScheduler.reset()
    yield
    DetectionScheduler.reset()
