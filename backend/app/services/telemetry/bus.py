import logging
from sqlalchemy.orm import Session

from app.models.telemetry import TelemetryEvent
from app.schemas.telemetry import TelemetryEventCreate
from .endpoint_repository import EndpointRepository
logger = logging.getLogger(__name__)


class TelemetryBus:
    """
    Central event bus for all endpoint telemetry.

    Today:
        Sentinel -> Bus -> Database

    Future:
        Sentinel -> Bus
                    ├── Database
                    ├── Detection Engine
                    ├── WebSocket Stream
                    ├── Metrics
                    ├── Alert Engine
                    └── SIEM Export
    """

    @staticmethod
    def publish(
        db: Session,
        event: TelemetryEventCreate,
    ) -> TelemetryEvent:

        telemetry = TelemetryEvent(
            host_id=event.host_id,
            hostname=event.hostname,
            timestamp=event.timestamp,
            event_type=event.event_type,
            severity=event.severity,
            source=event.source,
            payload=event.data,
        )

        db.add(telemetry)
        db.commit()
        db.refresh(telemetry)
        endpoint = EndpointRepository.get_by_host(
            db,
            event.host_id,
        )

        if endpoint is None:
            EndpointRepository.create(
                db,
                event,
            )
        else:
            EndpointRepository.update_heartbeat(
                db,
                endpoint,
                event,
            )
            
        logger.info(
            "Telemetry event stored",
            extra={
                "host_id": telemetry.host_id,
                "hostname": telemetry.hostname,
                "event_type": telemetry.event_type,
            },
        )

        return telemetry