from pathlib import Path

import joblib
import numpy as np
import shap

from ml.models.security_event import FeatureContribution


class ShapExplainer:

    def __init__(self):

        model = (
            Path(__file__).resolve().parents[2]
            / "models"
            / "isolation_forest.joblib"
        )

        self.model = joblib.load(model)

        self.explainer = shap.TreeExplainer(self.model)

    def explain(self, X, top_n: int = 5):

        shap_values = self.explainer.shap_values(X)

        explanations = []

        feature_names = X.columns.tolist()

        for row in shap_values:

            indices = np.argsort(np.abs(row))[::-1][:top_n]

            explanations.append(
                [
                    FeatureContribution(
                        feature=feature_names[i],
                        impact=round(float(row[i]), 4),
                    )
                    for i in indices
                ]
            )

        return explanations