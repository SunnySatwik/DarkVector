from datetime import datetime

from pydantic import BaseModel, ConfigDict
from datetime import datetime

class EventBase(BaseModel):
    timestamp: datetime
    username: str
    source_ip: str
    destination_ip: str
    event_type: str


class EventCreate(EventBase):
    pass


class EventResponse(EventBase):
    id: int
    timestamp: datetime
    risk_score: float
    anomaly: bool

    model_config = ConfigDict(from_attributes=True)