from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencies.database import get_db
from app.schemas.event import EventCreate, EventResponse
from app.services.event_service import EventService

router = APIRouter(prefix="/events", tags=["Events"])


@router.get("/", response_model=list[EventResponse])
def get_events(db: Session = Depends(get_db)):
    return EventService.list_events(db)


@router.post("/", response_model=EventResponse)
def create_event(
    event: EventCreate,
    db: Session = Depends(get_db),
):
    return EventService.create_event(db, event)