from dataclasses import dataclass, field
from typing import Any


class Severity:
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


@dataclass(frozen=True)
class Detection:
    """
    Structured, immutable detection object representing a security alert.
    """

    id: str
    rule_id: str
    title: str
    description: str
    severity: str  # LOW, MEDIUM, HIGH, CRITICAL
    confidence: int
    host_id: str
    process_guid: str
    timestamp: float
    mitre_technique: str
    mitre_tactic: str
    recommendations: list[str] = field(default_factory=list)
    evidence: list[dict[str, Any]] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)
