from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.models.investigation import (
    Investigation,
    InvestigationSeverity,
    InvestigationStatus,
)
from app.models.timeline import (
    TimelineActor,
    TimelineEventType,
)
from app.repositories.investigation_repository import InvestigationRepository
from app.repositories.timeline_repository import TimelineRepository
from app.services.detection.models import Detection
from app.services.timeline_service import TimelineService
from app.services.investigation_service import InvestigationService


class DetectionInvestigationCreator:
    """
    Converts Detection objects into DarkVector investigations.

    This keeps the Behavior Detection pipeline independent from the
    ML Alert Analysis pipeline while reusing the existing Investigation,
    Timeline, and Mission Control infrastructure.
    """

    @staticmethod
    def create(
        db: Session,
        detection: Detection,
    ) -> Investigation:

        # Idempotency
        existing = InvestigationRepository.get_by_alert_id(
            db,
            detection.id,
        )

        if existing:
            return existing

        investigation = Investigation(
            investigation_id=InvestigationService._generate_investigation_id(),
            alert_id=detection.id,
            title=detection.title,
            status=InvestigationStatus.NEW,
            severity=InvestigationSeverity[detection.severity],
            risk_score=float(detection.confidence),
            confidence=float(detection.confidence),
            summary=detection.description,
            alert_json=None,
            analysis_json=None,
            detection_json={
                "id": detection.id,
                "rule_id": detection.rule_id,
                "title": detection.title,
                "description": detection.description,
                "severity": detection.severity,
                "confidence": detection.confidence,
                "host_id": detection.host_id,
                "process_guid": detection.process_guid,
                "timestamp": detection.timestamp,
                "mitre_technique": detection.mitre_technique,
                "mitre_tactic": detection.mitre_tactic,
                "recommendations": detection.recommendations,
                "evidence": detection.evidence,
                "metadata": detection.metadata,
            },
        )

        created = InvestigationRepository.create(
            db,
            investigation,
        )

        timeline_repo = TimelineRepository(db)

        timeline_service = TimelineService(
            timeline_repo,
        )

        timeline_service.add_event(
            investigation_id=created.investigation_id,
            event_type=TimelineEventType.ALERT_CREATED,
            actor=TimelineActor.SYSTEM,
            title="Behavioral detection received",
            description=(
                f"Detection '{created.title}' automatically "
                f"created a new investigation."
            ),
        )

        timeline_service.add_event(
            investigation_id=created.investigation_id,
            event_type=TimelineEventType.ANALYSIS_COMPLETED,
            actor=TimelineActor.SYSTEM,
            title="Behavior analysis completed",
            description=(
                f"Rule '{detection.rule_id}' generated a "
                f"{created.severity.value} severity detection "
                f"with {created.confidence:.0f}% confidence."
            ),
        )

        return created