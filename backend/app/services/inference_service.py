import pandas as pd

from ml.inference.model_loader import ModelLoader
from ml.inference.risk_scorer import RiskScorer
from app.ml.feature_mapper import FeatureMapper


class InferenceService:

    def __init__(self):

        loader = ModelLoader()

        self.model = loader.model
        self.preprocessor = loader.preprocessor
        self.risk_scorer = RiskScorer()
    def preprocess(self, event_df):

        processed = self.preprocessor.transform(event_df)

        return pd.DataFrame(
            processed,
            columns=self.preprocessor.get_feature_names_out(),
            index=event_df.index,
        )
        
    def analyze(self, alert_data: dict):

        kdd_event = FeatureMapper.from_alert(alert_data)

        event_df = pd.DataFrame([kdd_event])

        features = self.preprocess(event_df)

        anomaly_score = self.model.decision_function(features)[0]

        risk = self.risk_scorer.from_score(float(anomaly_score))

        return {
            "anomaly_score": float(anomaly_score),
            "risk_score": float(risk.risk_score),
            "severity": str(risk.severity),
            "is_anomaly": bool(risk.is_anomaly),
        }