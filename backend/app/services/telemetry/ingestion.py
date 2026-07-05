from sqlalchemy.orm import Session

from app.schemas.telemetry import TelemetryEventCreate
from app.models.telemetry import TelemetryEvent
from .bus import TelemetryBus

class TelemetryIngestionService:
    """
    Handles telemetry ingestion before publishing
    into the Telemetry Bus.
    """

    @staticmethod
    def ingest(
        db: Session,
        event: TelemetryEventCreate,
    ) -> TelemetryEvent:

        # Future:
        # - Authentication
        # - Duplicate filtering
        # - Schema upgrades
        # - Rate limiting

        return TelemetryBus.publish(
            db=db,
            event=event,
        )