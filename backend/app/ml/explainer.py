from pathlib import Path

import joblib
import numpy as np
import shap

from app.schemas.analyze import FeatureContribution


class Explainer:
    """
    Computes SHAP (SHapley Additive exPlanations) values for the Isolation Forest model
    to explain the key features driving an anomaly score.
    """

    def __init__(self):
        """
        Initializes the ShapExplainer and loads the pre-trained Isolation Forest model.
        """
        model = (
            Path(__file__).resolve().parents[2]
            / "models"
            / "isolation_forest.joblib"
        )

        self.model = joblib.load(model)

        self.explainer = shap.TreeExplainer(self.model)

    def explain(self, X, top_n: int = 5):
        """
        Generates feature attribution explanations for the given input data.

        Args:
            X (pd.DataFrame): Dataframe containing the preprocessed features.
            top_n (int): Number of top feature contributions to return.

        Returns:
            List[List[FeatureContribution]]: A list of feature contributions for each row in X.
        """
        shap_values = self.explainer.shap_values(X)

        explanations = []

        feature_names = X.columns.tolist()

        for row in shap_values:

            indices = np.argsort(np.abs(row))[::-1][:top_n]

            explanations.append(
                [
                    FeatureContribution(
                        feature=feature_names[i],
                        impact=round(float(abs(row[i])), 4),
                        direction="increase" if row[i] >= 0 else "decrease",
                    )
                    for i in indices
                ]
            )

        return explanations[0]
