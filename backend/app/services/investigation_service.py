from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.models.investigation import (
    Investigation,
    InvestigationSeverity,
    InvestigationStatus,
)
from app.repositories.investigation_repository import InvestigationRepository
from app.schemas.analyze import AnalysisResponse


class InvestigationService:
    """Business logic for investigation lifecycle."""

    @staticmethod
    def _generate_investigation_id() -> str:
        """
        Temporary investigation ID generator.

        Later we'll replace this with a database-backed
        sequence like INV-2026-000001.
        """

        timestamp = datetime.now(UTC)

        return (
            f"INV-"
            f"{timestamp.year}-"
            f"{timestamp.strftime('%m%d%H%M%S')}"
        )

    @staticmethod
    def create_from_analysis(
        db: Session,
        alert: dict,
        analysis: AnalysisResponse,
    ) -> Investigation:
        """
        Create and persist an investigation from an analyzed alert.
        """

        severity = InvestigationSeverity[
            analysis.analysis.severity.upper()
        ]

        investigation = Investigation(
            investigation_id=InvestigationService._generate_investigation_id(),
            alert_id=alert["id"],
            title=alert["type"],
            status=InvestigationStatus.NEW,
            severity=severity,
            risk_score=analysis.analysis.risk_score,
            confidence=analysis.analysis.confidence,
            summary=analysis.explanation.summary,
            analysis_json=analysis.model_dump(mode="json"),
        )

        return InvestigationRepository.create(
            db,
            investigation,
        )

    @staticmethod
    def list_investigations(
        db: Session,
    ) -> list[Investigation]:
        """
        Return all investigations ordered by newest first.
        """

        return InvestigationRepository.list_all(db)