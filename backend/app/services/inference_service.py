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
        # Executive Summary  (analyst-voice, first-person)
        # --------------------------------------------------

        category = alert_data.get("category", "unknown")
        source = alert_data.get("source", "an unknown host")
        alert_type = alert_data.get("type", "an anomalous event")

        _category_context: dict[str, str] = {
            "process": (
                f"I spotted a process on `{source}` that spawned outside the expected "
                f"execution chain — the binary doesn't match anything in this host's "
                f"normal runtime profile."
            ),
            "network": (
                f"I found an outbound connection from `{source}` that doesn't match "
                f"this server's known egress patterns. The destination has no prior "
                f"history from this host."
            ),
            "authentication": (
                f"I noticed unusual authentication activity on `{source}` that doesn't "
                f"fit this account's historical access pattern. The timing and origin "
                f"are both out of character."
            ),
            "system": (
                f"I detected privilege changes on `{source}` that opened escalation "
                f"paths beyond the expected role boundary — a common precursor to "
                f"lateral movement."
            ),
        }

        _base = _category_context.get(
            category,
            f"I detected anomalous activity from `{source}` that deviates significantly "
            f"from the established baseline for this host type.",
        )

        summary = (
            f"{_base} "
            f"The alert type is **{alert_type}** and at a risk score of "
            f"**{risk.risk_score:.1f}**, this sits in the {risk.severity.upper()} range. "
            f"I'd recommend reviewing the process tree and recent network connections "
            f"before closing this case."
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