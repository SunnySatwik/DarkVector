from datetime import datetime

from sqlalchemy.orm import Session

from app.models.endpoint_agent import EndpointAgent
from app.models.enums import AgentStatus

class EndpointRepository:

    @staticmethod
    def get_by_host(
        db: Session,
        host_id: str,
    ) -> EndpointAgent | None:

        return (
            db.query(EndpointAgent)
            .filter(EndpointAgent.host_id == host_id)
            .first()
        )

    @staticmethod
    def create(
        db: Session,
        event,
    ) -> EndpointAgent:

        payload = event.data

        endpoint = EndpointAgent(
            host_id=event.host_id,
            hostname=event.hostname,
            agent_version=event.agent_version,
            os=payload.get("os", "Unknown"),
            architecture=payload.get("architecture", "Unknown"),
            ip_address=payload.get("ip_address", "Unknown"),
            status=AgentStatus.CONNECTED.value,
            last_seen=event.timestamp,
        )

        db.add(endpoint)
        db.commit()
        db.refresh(endpoint)

        return endpoint

    @staticmethod
    def update_heartbeat(
        db: Session,
        endpoint: EndpointAgent,
        event,
    ) -> EndpointAgent:

        payload = event.data

        endpoint.hostname = event.hostname
        endpoint.agent_version = event.agent_version
        endpoint.os = payload.get(
            "os",
            endpoint.os,
        )
        endpoint.architecture = payload.get(
            "architecture",
            endpoint.architecture,
        )
        endpoint.ip_address = payload.get(
            "ip_address",
            endpoint.ip_address,
        )

        endpoint.status = AgentStatus.CONNECTED.value
        endpoint.last_seen = event.timestamp

        db.commit()
        db.refresh(endpoint)

        return endpoint