from ml.datasets.kdd_loader import KDDLoader

loader = KDDLoader()

df = loader.load()

print(df.head())

print()

print(df.shape)

print()

print(df.info())