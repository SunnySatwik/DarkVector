from datetime import datetime
import uuid

from sqlalchemy import Column, DateTime, Index, JSON, String

from app.database.base import Base


class TelemetryEvent(Base):
    __tablename__ = "telemetry_events"

    id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )

    host_id = Column(
        String,
        nullable=False,
        index=True,
    )

    hostname = Column(
        String,
        nullable=False,
    )

    timestamp = Column(
        DateTime,
        nullable=False,
    )

    event_type = Column(
        String,
        nullable=False,
        index=True,
    )

    severity = Column(
        String,
        nullable=False,
    )

    source = Column(
        String,
        nullable=False,
    )

    payload = Column(
        JSON,
        nullable=False,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )


Index(
    "idx_telemetry_host_timestamp",
    TelemetryEvent.host_id,
    TelemetryEvent.timestamp,
)