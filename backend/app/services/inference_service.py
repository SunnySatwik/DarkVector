import logging
from time import perf_counter

import pandas as pd

from app.ml.explainer import Explainer
from app.ml.feature_mapper import FeatureMapper
from app.ml.model_loader import ModelLoader
from app.ml.risk_scorer import RiskScorer

from app.schemas.analyze import (
    AnalysisResponse,
    AnalysisResult,
    ContextEnrichment,
    Explanation,
    Metadata,
)
from app.services.context.context_service import ContextService

logger = logging.getLogger("darkvector.analysis")


class InferenceService:
    """
    Executes the complete ML inference pipeline for incoming alerts.
    """

    def __init__(self):

        loader = ModelLoader()

        self.model = loader.model
        self.preprocessor = loader.preprocessor
        self.risk_scorer = RiskScorer()
        self.explainer = Explainer()

        self.model_metadata = loader.metadata

    def preprocess(self, event_df: pd.DataFrame) -> pd.DataFrame:

        processed = self.preprocessor.transform(event_df)

        return pd.DataFrame(
            processed,
            columns=self.preprocessor.get_feature_names_out(),
            index=event_df.index,
        )

    def analyze(self, alert_data: dict) -> AnalysisResponse:

        start = perf_counter()

        alert_id = alert_data.get("id", "UNKNOWN")

        logger.info(f"Analyzing alert {alert_id}")

        # --------------------------------------------------
        # Domain Alert → KDD Features
        # --------------------------------------------------

        kdd_event = FeatureMapper.from_alert(alert_data)

        event_df = pd.DataFrame([kdd_event])

        features = self.preprocess(event_df)

        # --------------------------------------------------
        # Isolation Forest
        # --------------------------------------------------

        anomaly_score = float(
            self.model.decision_function(features)[0]
        )

        # --------------------------------------------------
        # Risk Assessment
        # --------------------------------------------------

        risk = self.risk_scorer.from_score(anomaly_score)

        # --------------------------------------------------
        # SHAP Explanation
        # --------------------------------------------------

        top_factors = self.explainer.explain(features)

        # --------------------------------------------------
        # Confidence
        # Temporary heuristic until calibrated confidence
        # --------------------------------------------------

        confidence = round(
            min(risk.risk_score / 100 + 0.20, 0.99),
            2,
        )

        # --------------------------------------------------
        # Executive Summary
        # (Later replaced by Gemini)
        # --------------------------------------------------

        summary = (
            f"The event was classified as "
            f"{risk.severity} risk with a "
            f"risk score of {risk.risk_score:.1f}. "
            f"The strongest feature contributions "
            f"were used to determine the anomaly."
        )

        # --------------------------------------------------
        # Metadata
        # --------------------------------------------------

        analysis_time_ms = round(
            (perf_counter() - start) * 1000,
            2,
        )

        logger.info(
            "Analysis completed for %s in %.2f ms",
            alert_id,
            analysis_time_ms,
        )

        # --------------------------------------------------
        # Context Enrichment (MITRE + Threat Intelligence)
        # --------------------------------------------------

        context_dict = ContextService.enrich(alert_data)
        context = ContextEnrichment.model_validate(context_dict)

        return AnalysisResponse(

            analysis=AnalysisResult(

                risk_score=float(risk.risk_score),

                anomaly_score=float(anomaly_score),

                severity=str(risk.severity),

                confidence=float(confidence),

                is_anomaly=bool(risk.is_anomaly),
            ),

            explanation=Explanation(

                summary=summary,

                top_factors=top_factors,
            ),

            metadata=Metadata(

                model_version=self.model_metadata.get(
                    "model_version",
                    "unknown",
                ),

                analysis_time_ms=float(
                    analysis_time_ms
                ),
            ),

            context=context,
        )