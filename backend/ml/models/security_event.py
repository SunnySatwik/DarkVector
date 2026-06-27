from dataclasses import dataclass, field
from typing import Any


@dataclass
class RiskAssessment:
    risk_score: float = 0.0
    severity: str = "Informational"
    is_anomaly: bool = False


@dataclass
class SecurityEvent:

    # Original event data
    raw_data: dict[str, Any]

    # Preprocessed feature vector
    features: Any = None

    # Model outputs
    anomaly_score: float = 0.0
    risk: RiskAssessment | None = None

    # Explainability
    shap_values: Any = None
    top_features: list[str] = field(default_factory=list)

    # LLM
    explanation: str = ""