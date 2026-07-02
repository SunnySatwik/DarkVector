from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

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