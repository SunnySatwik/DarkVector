from ml.datasets.kdd_loader import KDDLoader
from app.ml.risk_scorer import RiskScorer
from ml.models.isolation_forest_model import IsolationForestModel
from ml.preprocessing.preprocessor import DataPreprocessor

loader = KDDLoader()
df = loader.load()

X, _ = DataPreprocessor().preprocess(df)

model = IsolationForestModel()
model.model.fit(X)

scores = model.anomaly_scores(X)

print("\nFirst 20 Risk Assessments")
print("-" * 60)

for score in scores[:20]:
    assessment = RiskScorer.from_score(float(score))

    print(
        f"Risk: {assessment.risk_score:5.1f} | "
        f"{assessment.severity:<13} | "
        f"Anomaly: {assessment.is_anomaly}"
    )