from datetime import datetime
from enum import Enum
from typing import Optional, Any, Dict

from sqlalchemy import DateTime, Float, Integer, String, Enum as SQLEnum, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

class InvestigationStatus(str, Enum):
    NEW = "NEW"
    INVESTIGATING = "INVESTIGATING"
    CONTAINED = "CONTAINED"
    RESOLVED = "RESOLVED"
    FALSE_POSITIVE = "FALSE_POSITIVE"

class InvestigationSeverity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class Investigation(Base):
    __tablename__ = "investigations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    investigation_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    alert_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[InvestigationStatus] = mapped_column(
        SQLEnum(InvestigationStatus, name="investigation_status"),
        nullable=False,
        default=InvestigationStatus.NEW
    )
    severity: Mapped[InvestigationSeverity] = mapped_column(
        SQLEnum(InvestigationSeverity, name="investigation_severity"),
        nullable=False,
        default=InvestigationSeverity.LOW
    )
    
    risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    alert_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    analysis_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    detection_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(
    JSON,
    nullable=True,
)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )
    timeline = relationship(
        "TimelineEvent",
        back_populates="investigation",
        cascade="all, delete-orphan",
        order_by="TimelineEvent.timestamp",
     )
