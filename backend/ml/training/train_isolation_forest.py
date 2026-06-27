from ml.datasets.kdd_loader import KDDLoader
from ml.models.isolation_forest_model import IsolationForestModel
from ml.preprocessing.preprocessor import DataPreprocessor

print("Loading dataset...")

loader = KDDLoader()
df = loader.load()

print(f"Dataset: {df.shape}")

print("Preprocessing...")

preprocessor = DataPreprocessor()

X, y = preprocessor.preprocess(df)

print(f"Processed: {X.shape}")

print("Training Isolation Forest...")

model = IsolationForestModel()

model.train(X)

print("Model trained successfully!")

scores = model.anomaly_scores(X)

print()

print(f"Lowest score : {scores.min():.4f}")
print(f"Highest score: {scores.max():.4f}")
print(f"Mean score   : {scores.mean():.4f}")