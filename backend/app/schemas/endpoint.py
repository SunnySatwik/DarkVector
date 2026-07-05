from datetime import datetime

from pydantic import BaseModel


class EndpointAgentResponse(BaseModel):
    id: str
    host_id: str
    hostname: str
    agent_version: str
    os: str
    architecture: str
    ip_address: str
    status: str
    last_seen: datetime

    class Config:
        from_attributes = True