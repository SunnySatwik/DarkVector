from __future__ import annotations

import logging
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.telemetry import TelemetryEvent
from app.services.telemetry.telemetry_repository import TelemetryRepository
from app.services.telemetry.process_tree.builder import ProcessTreeBuilder
from app.services.detection.engine import DetectionEngine
from app.services.detection.detection_investigation_creator import (
    DetectionInvestigationCreator,
)

logger = logging.getLogger(__name__)


class DetectionScheduler:
    """
    Executes incremental autonomous detection cycles.

    The scheduler maintains:

    1. A timestamp cursor tracking the newest successfully processed event.
    2. Rolling process_start context so process trees retain parent-child
       relationships across scheduler cycles.

    State is committed only after the complete detection cycle succeeds.

    Pipeline:

        New Telemetry Events
                ↓
        Candidate Process Context
                ↓
        Process Tree Builder
                ↓
        Detection Engine
                ↓
        Investigation Creator
                ↓
        Commit Context + Cursor
    """

    _last_processed_timestamp: datetime | None = None

    _process_context: dict[str, TelemetryEvent] = {}

    MAX_CONTEXT_EVENTS = 10_000

    @classmethod
    def run(cls, db: Session) -> int:
        """
        Execute one incremental detection cycle.

        Scheduler state is committed only after all tree evaluation
        and investigation creation completes successfully.
        """

        new_events = TelemetryRepository.get_process_events_after(
            db=db,
            after_timestamp=cls._last_processed_timestamp,
            limit=5000,
        )

        if not new_events:
            logger.debug(
                "Detection cycle skipped because no new process events exist."
            )
            return 0

        newest_timestamp = new_events[-1].timestamp

        new_process_starts = [
            event
            for event in new_events
            if event.event_type == "process_start"
        ]

        # ---------------------------------------------------------
        # Build candidate state.
        #
        # Do NOT mutate the live scheduler context yet.
        # If anything later in the cycle fails, the existing
        # context and cursor remain unchanged.
        # ---------------------------------------------------------

        candidate_context = dict(cls._process_context)

        for event in new_process_starts:
            candidate_context[event.id] = event

        candidate_context = cls._trim_context(
            candidate_context
        )

        context_events = list(candidate_context.values())

        # ---------------------------------------------------------
        # Build process trees
        # ---------------------------------------------------------

        trees = ProcessTreeBuilder.build(
            context_events
        )

        total_detections = 0
        investigations_processed = 0

        # ---------------------------------------------------------
        # Detection + Investigation Pipeline
        #
        # Any exception here prevents scheduler state from being
        # committed.
        # ---------------------------------------------------------

        for tree in trees.values():
            detections = DetectionEngine.evaluate(tree)

            total_detections += len(detections)

            for detection in detections:
                DetectionInvestigationCreator.create(
                    db=db,
                    detection=detection,
                )

                investigations_processed += 1

        # ---------------------------------------------------------
        # Commit scheduler state only after successful completion
        # ---------------------------------------------------------

        cls._process_context = candidate_context
        cls._last_processed_timestamp = newest_timestamp

        logger.info(
            "Incremental detection cycle completed.",
            extra={
                "new_events": len(new_events),
                "new_process_starts": len(new_process_starts),
                "context_events": len(context_events),
                "hosts_evaluated": len(trees),
                "detections_generated": total_detections,
                "investigations_processed": investigations_processed,
                "cursor_timestamp": str(
                    cls._last_processed_timestamp
                ),
            },
        )

        return total_detections

    @classmethod
    def _trim_context(
        cls,
        context: dict[str, TelemetryEvent],
    ) -> dict[str, TelemetryEvent]:
        """
        Prevent rolling process context from growing without bounds.

        Returns a new context containing at most
        MAX_CONTEXT_EVENTS process_start events.

        The newest events are retained.
        """

        if len(context) <= cls.MAX_CONTEXT_EVENTS:
            return context

        sorted_events = sorted(
            context.values(),
            key=lambda event: event.timestamp,
            reverse=True,
        )

        retained_events = sorted_events[
            : cls.MAX_CONTEXT_EVENTS
        ]

        return {
            event.id: event
            for event in retained_events
        }

    @classmethod
    def reset(cls) -> None:
        """
        Reset scheduler state.

        Intended primarily for tests.
        """

        cls._last_processed_timestamp = None
        cls._process_context = {}