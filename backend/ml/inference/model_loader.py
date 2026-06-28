from pathlib import Path

import joblib
import json


class ModelLoader:

    def __init__(self):

        model_dir = Path(__file__).resolve().parents[2] / "models"

        self.model = joblib.load(
            model_dir / "isolation_forest.joblib"
        )

        self.preprocessor = joblib.load(
            model_dir / "preprocessor.joblib"
        )

        with open(model_dir / "model_metadata.json") as f:
            self.metadata = json.load(f)