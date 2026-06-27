from ml.datasets.kdd_loader import KDDLoader
from ml.inference.explainer import ShapExplainer
from ml.preprocessing.preprocessor import DataPreprocessor

loader = KDDLoader()

df = loader.load()

X, _ = DataPreprocessor().preprocess(df)

explainer = ShapExplainer()

results = explainer.explain(X.iloc[:3])

for i, event in enumerate(results, start=1):

    print(f"\nEvent {i}")

    for feature in event:

        print(
            f"{feature.feature:<35} {feature.impact:+.4f}"
        )