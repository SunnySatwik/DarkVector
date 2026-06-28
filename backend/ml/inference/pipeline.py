from app.ml.risk_scorer import RiskScorer
from ml.models.security_event import SecurityEvent


class InferencePipeline:

    def __init__(self, model):
        self.model = model

    def process(self, event: SecurityEvent):

        # Isolation Forest
        score = self.model.anomaly_scores(
            event.features
        )[0]

        event.anomaly_score = float(score)

        # Risk Assessment
        event.risk = RiskScorer.from_score(score)

        return event