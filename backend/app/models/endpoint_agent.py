import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, String

from app.database.base import Base


class EndpointAgent(Base):
    __tablename__ = "endpoint_agents"

    id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )

    host_id = Column(
        String,
        unique=True,
        nullable=False,
        index=True,
    )

    hostname = Column(
        String,
        nullable=False,
    )

    agent_version = Column(
        String,
        nullable=False,
    )

    os = Column(
        String,
        nullable=False,
    )

    architecture = Column(
        String,
        nullable=False,
    )

    ip_address = Column(
        String,
        nullable=False,
    )

    status = Column(
        String,
        nullable=False,
        default="connected",
    )

    last_seen = Column(
        DateTime,
        nullable=False,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )