from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    timestamp: Mapped[datetime] = mapped_column(DateTime)

    username: Mapped[str] = mapped_column(String(100))

    source_ip: Mapped[str] = mapped_column(String(50))

    destination_ip: Mapped[str] = mapped_column(String(50))

    event_type: Mapped[str] = mapped_column(String(100))

    risk_score: Mapped[float] = mapped_column(Float, default=0.0)

    anomaly: Mapped[bool] = mapped_column(default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )