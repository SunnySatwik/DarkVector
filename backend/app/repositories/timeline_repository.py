from sqlalchemy.orm import Session

from app.models.timeline import TimelineEvent


class TimelineRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, event: TimelineEvent) -> TimelineEvent:
        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)
        return event

    def list_for_investigation(
        self,
        investigation_id: str,
    ) -> list[TimelineEvent]:

        return (
            self.db.query(TimelineEvent)
            .filter(
                TimelineEvent.investigation_id == investigation_id
            )
            .order_by(TimelineEvent.timestamp.asc())
            .all()
        )