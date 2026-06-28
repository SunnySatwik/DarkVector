import json
from dataclasses import dataclass
from pathlib import Path


@dataclass
class RiskAssessment:
    risk_score: float
    severity: str
    is_anomaly: bool


class RiskScorer:

    def __init__(self):

        metadata_path = (
            Path(__file__).resolve().parents[2]
            / "models"
            / "model_metadata.json"
        )

        with open(metadata_path, "r") as f:
            metadata = json.load(f)

        self.dist = metadata["score_distribution"]

    def severity(self, risk):

        if risk >= 90:
            return "Critical"

        if risk >= 75:
            return "High"

        if risk >= 50:
            return "Medium"

        if risk >= 25:
            return "Low"

        return "Informational"

    def from_score(self, score):

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