from sqlalchemy import text

from app.database.session import engine


def test_connection():
    try:
        with engine.connect() as conn:
            version = conn.execute(text("SELECT version();"))
            print("✅ Connected!")
            print(version.scalar())

    except Exception as e:
        print("❌ Connection failed")
        print(e)


if __name__ == "__main__":
    test_connection()