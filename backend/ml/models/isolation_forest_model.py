from pathlib import Path

import joblib
from sklearn.ensemble import IsolationForest


class IsolationForestModel:

    def __init__(self):

        self.model = IsolationForest(
            n_estimators=200,
            contamination=0.02,
            random_state=42,
            n_jobs=-1,
        )

    def train(self, X):

        self.model.fit(X)

        model_dir = Path(__file__).resolve().parents[2] / "models"
        model_dir.mkdir(parents=True, exist_ok=True)

        joblib.dump(
            self.model,
            model_dir / "isolation_forest.joblib",
        )

    def predict(self, X):

        return self.model.predict(X)

    def anomaly_scores(self, X):

        return self.model.decision_function(X)