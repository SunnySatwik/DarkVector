import json
from datetime import datetime, UTC
from pathlib import Path

import numpy as np

from ml.datasets.kdd_loader import KDDLoader
from ml.models.isolation_forest_model import IsolationForestModel
from ml.preprocessing.preprocessor import DataPreprocessor

print("Loading dataset...")

loader = KDDLoader()
df = loader.load()

X, _ = DataPreprocessor().preprocess(df)

print("Training model...")

model = IsolationForestModel()
model.model.fit(X)

scores = model.anomaly_scores(X)

metadata = {
    "model_version": "1.0.0",
    "trained_at": datetime.now(UTC).isoformat(),
    "dataset": "NSL-KDD",
    "feature_count": X.shape[1],
    "event_count": X.shape[0],
    "score_distribution": {
        "min": float(np.min(scores)),
        "max": float(np.max(scores)),
        "mean": float(np.mean(scores)),
        "std": float(np.std(scores)),
        "p1": float(np.percentile(scores, 1)),
        "p5": float(np.percentile(scores, 5)),
        "p10": float(np.percentile(scores, 10)),
        "p25": float(np.percentile(scores, 25)),
        "median": float(np.percentile(scores, 50)),
        "p75": float(np.percentile(scores, 75)),
        "p90": float(np.percentile(scores, 90)),
        "p95": float(np.percentile(scores, 95)),
        "p99": float(np.percentile(scores, 99)),
    },
}

model_dir = Path(__file__).resolve().parents[2] / "models"
model_dir.mkdir(parents=True, exist_ok=True)

with open(model_dir / "model_metadata.json", "w") as f:
    json.dump(metadata, f, indent=4)

print("\nSaved model metadata.")