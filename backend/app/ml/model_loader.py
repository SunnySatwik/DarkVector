from pathlib import Path
import json

import joblib


class ModelLoader:

    def __init__(self):

        model_dir = (
            Path(__file__).resolve().parents[2]
            / "models"
        )

        self.model = joblib.load(
            model_dir / "isolation_forest.joblib"
        )

        self.preprocessor = joblib.load(
            model_dir / "preprocessor.joblib"
        )

        metadata_path = (
            model_dir / "model_metadata.json"
        )

        if metadata_path.exists():

            with open(metadata_path, "r") as f:

                self.metadata = json.load(f)

        else:

            self.metadata = {
                "model_version": "unknown",
                "trained_at": None,
                "dataset": None,
                "feature_count": None,
                "event_count": None,
            }