from __future__ import annotations

import uuid
from datetime import datetime, timezone
from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base

class ContainmentJob(Base):
    __tablename__ = "containment_jobs"

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
    
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="QUEUED")
    executor: Mapped[str] = mapped_column(String(50), nullable=False, default="simulated")
    message: Mapped[str] = mapped_column(Text, nullable=True, default=None)
    
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    
    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
    )
    
    last_update: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
