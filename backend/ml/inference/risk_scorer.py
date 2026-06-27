from dataclasses import dataclass
import numpy as np

@dataclass
class RiskAssessment:
    risk_score: float
    severity: str
    is_anomaly: bool


class RiskScorer:

    @staticmethod
    def severity(score):

        if score >= 90:
            return "Critical"
        elif score >= 75:
            return "High"
        elif score >= 50:
            return "Medium"
        elif score >= 25:
            return "Low"

        return "Informational"

    @staticmethod
    def from_score(anomaly_score: float):

        # decision_function is roughly [-0.2, 0.2]
        normalized = max(
            0,
            min(
                1,
                (0.15 - anomaly_score) / 0.30,
            ),
        )

        risk = round(normalized * 100, 1)

        return RiskAssessment(
            risk_score=risk,
            severity=RiskScorer.severity(risk),
            is_anomaly=risk >= 75,
        )