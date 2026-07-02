from app.database.base import Base
from app.database.session import engine

# Import models
from app.models.event import Event
from app.models.investigation import Investigation
from app.models.timeline import TimelineEvent


def init_db():
    Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    init_db()
    print("✅ Database initialized.")