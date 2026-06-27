from sqlalchemy.orm import Session

from app.repositories.event_repository import EventRepository
from app.schemas.event import EventCreate


class EventService:

    @staticmethod
    def create_event(db: Session, event: EventCreate):
        return EventRepository.create(db, event)

    @staticmethod
    def list_events(db: Session):
        return EventRepository.get_all(db)