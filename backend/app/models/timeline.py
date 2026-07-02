from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class TimelineActor(str, enum.Enum):
    SYSTEM = "system"
    AI = "ai"
    ANALYST = "analyst"


class TimelineEventType(str, enum.Enum):
    ALERT_CREATED = "alert_created"
    ANALYSIS_COMPLETED = "analysis_completed"
    STATUS_CHANGED = "status_changed"
    NOTE_ADDED = "note_added"
    CONTAINMENT_EXECUTED = "containment_executed"
    INVESTIGATION_CLOSED = "investigation_closed"


class TimelineEvent(Base):
    __tablename__ = "investigation_timeline"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    investigation_id: Mapped[str] = mapped_column(
        ForeignKey("investigations.investigation_id"),
        nullable=False,
        index=True,
    )

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )

    actor: Mapped[TimelineActor] = mapped_column(
        Enum(TimelineActor),
        nullable=False,
    )

    event_type: Mapped[TimelineEventType] = mapped_column(
        Enum(TimelineEventType),
        nullable=False,
    )

    title: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    investigation = relationship(
        "Investigation",
        back_populates="timeline",
    )