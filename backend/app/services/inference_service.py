import logging
import pandas as pd

from app.ml.model_loader import ModelLoader
from app.ml.risk_scorer import RiskScorer
from app.ml.feature_mapper import FeatureMapper

# Initialize logger for analysis service
logger = logging.getLogger("darkvector.analysis")

class InferenceService:
    """
    Service responsible for preprocessing domain alerts and executing 
    the machine learning inference pipeline (Isolation Forest) to determine 
    anomaly scores and risk levels.
    """

    def __init__(self):
        """
        Initializes the InferenceService by loading the Isolation Forest model,
        preprocessor pipeline, and the risk scorer.
        """
        logger.info("Initializing InferenceService and loading ML models...")
        loader = ModelLoader()
        self.model = loader.model
        self.preprocessor = loader.preprocessor
        self.risk_scorer = RiskScorer()

    def preprocess(self, event_df: pd.DataFrame) -> pd.DataFrame:
        """
        Applies the pre-trained preprocessing pipeline (one-hot encoding, scaling, etc.)
        to the KDD feature dataframe.

        Args:
            event_df (pd.DataFrame): Dataframe containing the mapped 41 KDD features.

        Returns:
            pd.DataFrame: Preprocessed feature dataframe ready for model prediction.
        """
        processed = self.preprocessor.transform(event_df)
        return pd.DataFrame(
            processed,
            columns=self.preprocessor.get_feature_names_out(),
            index=event_df.index,
        )
        
    def analyze(self, alert_data: dict) -> dict:
        """
        Executes the full analysis pipeline for an incoming domain alert:
        1. Maps the domain alert properties to raw KDD network features.
        2. Preprocesses the feature vector.
        3. Runs the Isolation Forest model to get the decision/anomaly score.
        4. Calculates the calibrated risk score, severity, and anomaly classification.

        Args:
            alert_data (dict): The domain Alert object received from the client.

        Returns:
            dict: Analysis results containing anomaly_score, risk_score, severity, and is_anomaly.
        """
        alert_id = alert_data.get("id", "UNKNOWN")
        logger.info(f"Received analysis request for alert ID: {alert_id}")

        # Step 1: Map domain alert to raw KDD features
        kdd_event = FeatureMapper.from_alert(alert_data)
        logger.debug(f"Mapped alert {alert_id} to KDD features.")

        # Step 2: Preprocess the feature vector
        event_df = pd.DataFrame([kdd_event])
        features = self.preprocess(event_df)

        # Step 3: Run model inference
        anomaly_score = self.model.decision_function(features)[0]
        
        # Step 4: Map anomaly score to risk metrics
        risk = self.risk_scorer.from_score(float(anomaly_score))

        logger.info(f"Analysis completed for alert {alert_id}. Risk Score: {risk.risk_score}, Severity: {risk.severity}")

        # Explicitly cast to native Python types for clean Pydantic validation
        return {
            "anomaly_score": float(anomaly_score),
            "risk_score": float(risk.risk_score),
            "severity": str(risk.severity),
            "is_anomaly": bool(risk.is_anomaly),
        }