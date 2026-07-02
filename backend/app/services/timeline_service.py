from app.models.timeline import (
    TimelineActor,
    TimelineEvent,
    TimelineEventType,
)
from app.repositories.timeline_repository import TimelineRepository


class TimelineService:
    def __init__(
        self,
        repository: TimelineRepository,
    ):
        self.repository = repository

    def add_event(
        self,
        investigation_id: str,
        event_type: TimelineEventType,
        actor: TimelineActor,
        title: str,
        description: str,
    ) -> TimelineEvent:

        event = TimelineEvent(
            investigation_id=investigation_id,
            event_type=event_type,
            actor=actor,
            title=title,
            description=description,
        )

        return self.repository.create(event)

    def get_timeline(
        self,
        investigation_id: str,
    ):

        return self.repository.list_for_investigation(
            investigation_id
        )