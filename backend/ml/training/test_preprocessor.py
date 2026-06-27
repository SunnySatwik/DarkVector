from ml.datasets.kdd_loader import KDDLoader
from ml.preprocessing.preprocessor import DataPreprocessor

loader = KDDLoader()
df = loader.load()

preprocessor = DataPreprocessor()

X, y = preprocessor.preprocess(df)

print(X.head())
print()
print(X.shape)
print()
print(y.head())