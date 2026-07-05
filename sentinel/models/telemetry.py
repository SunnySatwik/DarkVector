# models/telemetry.py
"""
Core telemetry data model for DV Sentinel.

Every piece of telemetry — whether a heartbeat, a future process event, or a
network observation — is normalised into a TelemetryEvent before transport.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


@dataclass
class TelemetryEvent:
    """
    Immutable representation of a single telemetry observation.

    Fields
    ------
    id              : str  – UUID4 assigned at construction time.
    host_id         : str  – Stable, deterministic identifier for the endpoint.
    hostname        : str  – Human-readable hostname of the source machine.
    agent_version   : str  – Version of the sentinel agent that produced this event.
    timestamp       : str  – ISO-8601 UTC timestamp of when the event was created.
    event_type      : str  – Category label (e.g. "heartbeat").
    severity        : str  – Severity tier: "info" | "low" | "medium" | "high" | "critical".
    source          : str  – Dotted component path (e.g. "sentinel.heartbeat").
    data            : dict – Arbitrary collector-specific payload.
    """

    host_id: str
    hostname: str
    agent_version: str
    event_type: str
    severity: str
    source: str
    data: dict[str, Any]

    # Auto-generated fields — callers should not override these.
    id: str = field(
        default_factory=lambda: str(uuid.uuid4()),
        compare=False,
    )
    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        compare=False,
    )

    def to_dict(self) -> dict[str, Any]:
        """
        Serialise the event to a plain dictionary suitable for JSON encoding.
        Field order matches the backend API contract.
        """
        return {
            "id": self.id,
            "host_id": self.host_id,
            "hostname": self.hostname,
            "agent_version": self.agent_version,
            "timestamp": self.timestamp,
            "event_type": self.event_type,
            "severity": self.severity,
            "source": self.source,
            "data": self.data,
        }
