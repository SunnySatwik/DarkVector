from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class TelemetryEventCreate(BaseModel):
    host_id: str
    hostname: str
    agent_version: str
    timestamp: datetime
    event_type: str
    severity: str
    source: str
    data: dict[str, Any]


class TelemetryEventResponse(BaseModel):
    id: UUID | str
    host_id: str
    hostname: str
    timestamp: datetime
    event_type: str
    severity: str
    source: str

    class Config:
        from_attributes = True