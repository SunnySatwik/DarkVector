from datetime import datetime, timezone
from uuid import UUID

from pydantic import BaseModel, field_serializer

from app.models.timeline import (
    TimelineActor,
    TimelineEventType,
)

class TimelineEventResponse(BaseModel):
    id: UUID
    timestamp: datetime
    actor: TimelineActor
    event_type: TimelineEventType
    title: str
    description: str

    model_config = {
        "from_attributes": True,
    }

    @field_serializer("timestamp")
    def serialize_timestamp(self, dt: datetime, _info) -> str:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()