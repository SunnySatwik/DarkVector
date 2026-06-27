from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler


class DataPreprocessor:

    def __init__(self):

        self.categorical_columns = [
            "protocol_type",
            "service",
            "flag",
        ]

        self.preprocessor = None

    def preprocess(self, df: pd.DataFrame):

        # Keep labels separately
        labels = df["label"].copy()

        # Remove labels and difficulty
        features = df.drop(columns=["label", "difficulty"])

        # Numerical columns
        numerical_columns = [
            col
            for col in features.columns
            if col not in self.categorical_columns
        ]

        # Build preprocessing pipeline
        self.preprocessor = ColumnTransformer(
            transformers=[
                (
                    "num",
                    StandardScaler(),
                    numerical_columns,
                ),
                (
                    "cat",
                    OneHotEncoder(
                        handle_unknown="ignore",
                        sparse_output=False,
                    ),
                    self.categorical_columns,
                ),
            ]
        )

        # Fit and transform
        processed = self.preprocessor.fit_transform(features)

        # Get generated column names
        feature_names = self.preprocessor.get_feature_names_out()

        # Convert back to DataFrame
        processed_df = pd.DataFrame(
            processed,
            columns=feature_names,
            index=features.index,
        )

        # Save fitted preprocessor for inference
        model_dir = Path(__file__).resolve().parents[2] / "models"
        model_dir.mkdir(parents=True, exist_ok=True)

        joblib.dump(
            self.preprocessor,
            model_dir / "preprocessor.joblib",
        )

        return processed_df, labels