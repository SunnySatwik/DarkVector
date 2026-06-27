from sqlalchemy.orm import Session

from app.models.event import Event
from app.schemas.event import EventCreate


class EventRepository:

    @staticmethod
    def create(db: Session, event: EventCreate):

        db_event = Event(
    timestamp=event.timestamp,
    username=event.username,
    source_ip=event.source_ip,
    destination_ip=event.destination_ip,
    event_type=event.event_type,
)

        db.add(db_event)
        db.commit()
        db.refresh(db_event)

        return db_event

    @staticmethod
    def get_all(db: Session):

        return db.query(Event).all()