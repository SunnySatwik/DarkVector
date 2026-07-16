from app.database.base import Base
from app.database.session import engine

# Import models
from app.models.event import Event
from app.models.investigation import Investigation
from app.models.timeline import TimelineEvent
from app.models.telemetry import TelemetryEvent   # <-- ADD THIS
from app.models.endpoint_agent import EndpointAgent
from app.models.containment import ContainmentJob

def init_db():
    Base.metadata.create_all(bind=engine)
    
    from sqlalchemy import text
    with engine.begin() as conn:
        try:
            if engine.dialect.name == "postgresql":
                # Add columns to investigations
                conn.execute(text("ALTER TABLE investigations ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE"))
                conn.execute(text("ALTER TABLE investigations ADD COLUMN IF NOT EXISTS containment_status VARCHAR(50) DEFAULT NULL"))
                conn.execute(text("ALTER TABLE investigations ADD COLUMN IF NOT EXISTS containment_message TEXT DEFAULT NULL"))
                # Update null values for safety
                conn.execute(text("UPDATE investigations SET is_deleted = FALSE WHERE is_deleted IS NULL"))
            else:
                # SQLite fallback
                try:
                    conn.execute(text("ALTER TABLE investigations ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE"))
                except Exception:
                    pass
                try:
                    conn.execute(text("ALTER TABLE investigations ADD COLUMN containment_status VARCHAR(50) DEFAULT NULL"))
                except Exception:
                    pass
                try:
                    conn.execute(text("ALTER TABLE investigations ADD COLUMN containment_message TEXT DEFAULT NULL"))
                except Exception:
                    pass
        except Exception as e:
            print(f"Warning altering investigations table: {e}")
            
    # Autocommit connection block to alter custom PG ENUM type (PostgreSQL doesn't allow ALTER TYPE ADD VALUE in transaction block)
    if engine.dialect.name == "postgresql":
        with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
            try:
                conn.execute(text("ALTER TYPE investigation_status ADD VALUE 'ARCHIVED'"))
            except Exception as e:
                # Catch duplicate value exception
                pass


if __name__ == "__main__":
    init_db()
    print("✅ Database initialized.")