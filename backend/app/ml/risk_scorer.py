import json
from dataclasses import dataclass
from pathlib import Path

@dataclass
class RiskAssessment:
    """
    Represents the output of a risk assessment.
    """
    risk_score: float
    severity: str
    is_anomaly: bool


class RiskScorer:
    """
    Calibrates raw machine learning anomaly scores into human-readable risk scores,
    severities, and anomaly classifications using pre-calculated training distribution percentiles.
    """

    def __init__(self):
        """
        Initializes the RiskScorer by loading the score distribution percentiles
        from the model metadata file.
        """
        metadata_path = (
            Path(__file__).resolve().parents[2]
            / "models"
            / "model_metadata.json"
        )

        with open(metadata_path, "r") as f:
            metadata = json.load(f)

        self.dist = metadata["score_distribution"]

    def severity(self, risk: float) -> str:
        """
        Maps a calibrated risk score to a qualitative severity level.

        Args:
            risk (float): The calibrated risk score (0-100).

        Returns:
            str: The severity category (e.g., 'Critical', 'High', 'Medium', 'Low', 'Informational').
        """
        if risk >= 90:
            return "Critical"

        if risk >= 75:
            return "High"

        if risk >= 50:
            return "Medium"

        if risk >= 25:
            return "Low"

        return "Informational"

    def from_score(self, score: float) -> RiskAssessment:
        """
        Converts a raw model decision function score into a RiskAssessment object
        by evaluating it against score distribution percentiles.

        Args:
            score (float): The raw decision function score from the Isolation Forest model.

        Returns:
            RiskAssessment: The calibrated risk score, severity, and anomaly classification.
        """
        d = self.dist

        if score <= d["p1"]:
            risk = 100

        elif score <= d["p5"]:
            risk = 95

        elif score <= d["p10"]:
            risk = 90

        elif score <= d["p25"]:
            risk = 75

        elif score <= d["median"]:
            risk = 50

        elif score <= d["p75"]:
            risk = 25

        else:
            risk = 10

        return RiskAssessment(
            risk_score=float(risk),
            severity=self.severity(risk),
            is_anomaly=bool(risk >= 75),
        )
