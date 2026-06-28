from pathlib import Path
import joblib
import json

class ModelLoader:
    """
    Handles loading the pre-trained Isolation Forest anomaly detection model,
    the preprocessing pipeline, and the model metadata from disk.
    """

    def __init__(self):
        """
        Initializes the ModelLoader and loads the required model, preprocessor,
        and metadata files from the models directory.
        """
        model_dir = Path(__file__).resolve().parents[2] / "models"

        self.model = joblib.load(
            model_dir / "isolation_forest.joblib"
        )

        self.preprocessor = joblib.load(
            model_dir / "preprocessor.joblib"
        )

        with open(model_dir / "model_metadata.json") as f:
            self.metadata = json.load(f)
