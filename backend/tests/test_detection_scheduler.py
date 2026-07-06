from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest

from app.services.detection.scheduler import DetectionScheduler


class FakeTelemetryEvent:
    """
    Minimal telemetry event used for scheduler tests.
    """

    def __init__(
        self,
        event_id: str,
        timestamp: datetime,
        event_type: str = "process_start",
        host_id: str = "host-1",
    ):
        self.id = event_id
        self.timestamp = timestamp
        self.event_type = event_type
        self.host_id = host_id


@pytest.fixture(autouse=True)
def reset_scheduler_state():
    """
    Ensure every test starts and ends with clean scheduler state.
    """

    DetectionScheduler.reset()

    yield

    DetectionScheduler.reset()


def test_reset_clears_scheduler_state():
    """
    reset() must clear both the timestamp cursor and rolling context.
    """

    now = datetime.now()

    event = FakeTelemetryEvent(
        event_id="event-1",
        timestamp=now,
    )

    DetectionScheduler._last_processed_timestamp = now
    DetectionScheduler._process_context = {
        event.id: event,
    }

    DetectionScheduler.reset()

    assert DetectionScheduler._last_processed_timestamp is None
    assert DetectionScheduler._process_context == {}


@patch(
    "app.services.detection.scheduler."
    "TelemetryRepository.get_process_events_after"
)
def test_no_new_events_returns_zero(mock_get_events):
    """
    Scheduler should do nothing when no new telemetry exists.
    """

    mock_get_events.return_value = []

    db = MagicMock()

    result = DetectionScheduler.run(db)

    assert result == 0

    mock_get_events.assert_called_once_with(
        db=db,
        after_timestamp=None,
        limit=5000,
    )

    assert DetectionScheduler._last_processed_timestamp is None
    assert DetectionScheduler._process_context == {}


@patch(
    "app.services.detection.scheduler."
    "DetectionInvestigationCreator.create"
)
@patch(
    "app.services.detection.scheduler."
    "DetectionEngine.evaluate"
)
@patch(
    "app.services.detection.scheduler."
    "ProcessTreeBuilder.build"
)
@patch(
    "app.services.detection.scheduler."
    "TelemetryRepository.get_process_events_after"
)
def test_first_cycle_processes_events_and_advances_cursor(
    mock_get_events,
    mock_build,
    mock_evaluate,
    mock_create,
):
    """
    First successful cycle should:

    - query from no cursor
    - add process_start events to context
    - build trees
    - evaluate detections
    - create investigations
    - advance the cursor
    """

    db = MagicMock()

    time_1 = datetime(2026, 7, 6, 10, 0, 0)
    time_2 = datetime(2026, 7, 6, 10, 0, 5)

    event_1 = FakeTelemetryEvent(
        event_id="event-1",
        timestamp=time_1,
    )

    event_2 = FakeTelemetryEvent(
        event_id="event-2",
        timestamp=time_2,
    )

    mock_get_events.return_value = [
        event_1,
        event_2,
    ]

    fake_tree = MagicMock()
    mock_build.return_value = {
        "host-1": fake_tree,
    }

    fake_detection = MagicMock()
    mock_evaluate.return_value = [
        fake_detection,
    ]

    result = DetectionScheduler.run(db)

    assert result == 1

    mock_get_events.assert_called_once_with(
        db=db,
        after_timestamp=None,
        limit=5000,
    )

    assert len(DetectionScheduler._process_context) == 2

    assert "event-1" in DetectionScheduler._process_context
    assert "event-2" in DetectionScheduler._process_context

    mock_build.assert_called_once()

    context_passed_to_builder = mock_build.call_args.args[0]

    assert len(context_passed_to_builder) == 2

    mock_evaluate.assert_called_once_with(fake_tree)

    mock_create.assert_called_once_with(
        db=db,
        detection=fake_detection,
    )

    assert DetectionScheduler._last_processed_timestamp == time_2


@patch(
    "app.services.detection.scheduler."
    "DetectionInvestigationCreator.create"
)
@patch(
    "app.services.detection.scheduler."
    "DetectionEngine.evaluate"
)
@patch(
    "app.services.detection.scheduler."
    "ProcessTreeBuilder.build"
)
@patch(
    "app.services.detection.scheduler."
    "TelemetryRepository.get_process_events_after"
)
def test_second_cycle_queries_after_previous_cursor(
    mock_get_events,
    mock_build,
    mock_evaluate,
    mock_create,
):
    """
    Second cycle must query only for events newer than the previous cursor.
    """

    db = MagicMock()

    time_1 = datetime(2026, 7, 6, 10, 0, 0)
    time_2 = datetime(2026, 7, 6, 10, 1, 0)

    event_1 = FakeTelemetryEvent(
        event_id="event-1",
        timestamp=time_1,
    )

    event_2 = FakeTelemetryEvent(
        event_id="event-2",
        timestamp=time_2,
    )

    mock_get_events.side_effect = [
        [event_1],
        [event_2],
    ]

    mock_build.return_value = {
        "host-1": MagicMock(),
    }

    mock_evaluate.return_value = []

    first_result = DetectionScheduler.run(db)
    second_result = DetectionScheduler.run(db)

    assert first_result == 0
    assert second_result == 0

    assert mock_get_events.call_count == 2

    first_call = mock_get_events.call_args_list[0]
    second_call = mock_get_events.call_args_list[1]

    assert first_call.kwargs["after_timestamp"] is None
    assert second_call.kwargs["after_timestamp"] == time_1

    assert DetectionScheduler._last_processed_timestamp == time_2

    assert len(DetectionScheduler._process_context) == 2


@patch(
    "app.services.detection.scheduler."
    "ProcessTreeBuilder.build"
)
@patch(
    "app.services.detection.scheduler."
    "TelemetryRepository.get_process_events_after"
)
def test_process_exit_events_do_not_enter_context(
    mock_get_events,
    mock_build,
):
    """
    Only process_start events should be retained in rolling context.
    """

    db = MagicMock()

    time_1 = datetime(2026, 7, 6, 10, 0, 0)
    time_2 = datetime(2026, 7, 6, 10, 0, 5)

    start_event = FakeTelemetryEvent(
        event_id="start-1",
        timestamp=time_1,
        event_type="process_start",
    )

    exit_event = FakeTelemetryEvent(
        event_id="exit-1",
        timestamp=time_2,
        event_type="process_exit",
    )

    mock_get_events.return_value = [
        start_event,
        exit_event,
    ]

    mock_build.return_value = {}

    DetectionScheduler.run(db)

    assert "start-1" in DetectionScheduler._process_context
    assert "exit-1" not in DetectionScheduler._process_context

    assert len(DetectionScheduler._process_context) == 1

    assert DetectionScheduler._last_processed_timestamp == time_2


@patch(
    "app.services.detection.scheduler."
    "DetectionEngine.evaluate"
)
@patch(
    "app.services.detection.scheduler."
    "ProcessTreeBuilder.build"
)
@patch(
    "app.services.detection.scheduler."
    "TelemetryRepository.get_process_events_after"
)
def test_rolling_context_survives_across_cycles(
    mock_get_events,
    mock_build,
    mock_evaluate,
):
    """
    Process starts from previous cycles must remain available when
    later trees are reconstructed.
    """

    db = MagicMock()

    time_1 = datetime(2026, 7, 6, 10, 0, 0)
    time_2 = datetime(2026, 7, 6, 10, 1, 0)

    parent_event = FakeTelemetryEvent(
        event_id="parent",
        timestamp=time_1,
    )

    child_event = FakeTelemetryEvent(
        event_id="child",
        timestamp=time_2,
    )

    mock_get_events.side_effect = [
        [parent_event],
        [child_event],
    ]

    mock_build.return_value = {
        "host-1": MagicMock(),
    }

    mock_evaluate.return_value = []

    DetectionScheduler.run(db)
    DetectionScheduler.run(db)

    second_builder_call = mock_build.call_args_list[1]

    second_context = second_builder_call.args[0]

    context_ids = {
        event.id
        for event in second_context
    }

    assert context_ids == {
        "parent",
        "child",
    }


def test_trim_context_retains_newest_events():
    """
    Context trimming must retain only the newest events
    without mutating the live scheduler state.
    """

    original_max = DetectionScheduler.MAX_CONTEXT_EVENTS

    DetectionScheduler.MAX_CONTEXT_EVENTS = 3

    try:
        base_time = datetime(2026, 7, 6, 10, 0, 0)

        events = [
            FakeTelemetryEvent(
                event_id=f"event-{index}",
                timestamp=base_time + timedelta(seconds=index),
            )
            for index in range(5)
        ]

        candidate_context = {
            event.id: event
            for event in events
        }

        trimmed_context = DetectionScheduler._trim_context(
            candidate_context
        )

        assert len(trimmed_context) == 3

        retained_ids = set(
            trimmed_context.keys()
        )

        assert retained_ids == {
            "event-2",
            "event-3",
            "event-4",
        }

        # Live scheduler state must remain untouched.
        assert DetectionScheduler._process_context == {}

    finally:
        DetectionScheduler.MAX_CONTEXT_EVENTS = original_max

@patch(
    "app.services.detection.scheduler."
    "DetectionEngine.evaluate"
)
@patch(
    "app.services.detection.scheduler."
    "ProcessTreeBuilder.build"
)
@patch(
    "app.services.detection.scheduler."
    "TelemetryRepository.get_process_events_after"
)
def test_cursor_does_not_advance_when_cycle_fails(
    mock_get_events,
    mock_build,
    mock_evaluate,
):
    """
    Cursor must remain unchanged if detection processing fails.
    """

    db = MagicMock()

    event_time = datetime(2026, 7, 6, 10, 0, 0)

    event = FakeTelemetryEvent(
        event_id="event-1",
        timestamp=event_time,
    )

    mock_get_events.return_value = [
        event,
    ]

    fake_tree = MagicMock()

    mock_build.return_value = {
        "host-1": fake_tree,
    }

    mock_evaluate.side_effect = RuntimeError(
        "Detection engine failure"
    )

    with pytest.raises(
        RuntimeError,
        match="Detection engine failure",
    ):
        DetectionScheduler.run(db)

    assert DetectionScheduler._last_processed_timestamp is None
    assert DetectionScheduler._process_context == {}