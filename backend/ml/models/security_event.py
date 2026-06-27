from dataclasses import dataclass, field
from typing import Any


@dataclass
class FeatureContribution:
    feature: str
    impact: float
    percentage: float = 0.0


@dataclass
class RiskAssessment:
    risk_score: float = 0.0
    severity: str = "Informational"
    is_anomaly: bool = False


@dataclass
class SecurityEvent:
    raw_data: dict[str, Any]

    features: Any = None

    anomaly_score: float = 0.0

    risk: RiskAssessment | None = None

    feature_contributions: list[FeatureContribution] = field(default_factory=list)

    explanation: str = ""