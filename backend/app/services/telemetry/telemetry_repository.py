from sqlalchemy.orm import Session

from app.models.telemetry import TelemetryEvent


class TelemetryRepository:

    @staticmethod
    def get_recent_events(
        db: Session,
        limit: int = 100,
    ) -> list[TelemetryEvent]:

        return (
            db.query(TelemetryEvent)
            .order_by(TelemetryEvent.timestamp.desc())
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_events_by_type(
        db: Session,
        event_type: str,
        limit: int = 100,
    ) -> list[TelemetryEvent]:

        return (
            db.query(TelemetryEvent)
            .filter(TelemetryEvent.event_type == event_type)
            .order_by(TelemetryEvent.timestamp.desc())
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_events_for_host(
        db: Session,
        host_id: str,
        limit: int = 100,
    ) -> list[TelemetryEvent]:

        return (
            db.query(TelemetryEvent)
            .filter(TelemetryEvent.host_id == host_id)
            .order_by(TelemetryEvent.timestamp.desc())
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_recent_process_events(
        db: Session,
        limit: int = 100,
    ) -> list[TelemetryEvent]:

        return (
            db.query(TelemetryEvent)
            .filter(
                TelemetryEvent.event_type.in_(
                    [
                        "process_start",
                        "process_exit",
                    ]
                )
            )
            .order_by(TelemetryEvent.timestamp.desc())
            .limit(limit)
            .all()
        )
    @staticmethod
    def get_process_events_after(
        db: Session,
        after_timestamp,
        limit: int = 5000,
    ) -> list[TelemetryEvent]:
        """
        Return process events newer than the supplied timestamp.

        Events are returned oldest-first so the detection scheduler processes
        telemetry in chronological order.
        """

        query = (
            db.query(TelemetryEvent)
            .filter(
                TelemetryEvent.event_type.in_(
                    [
                        "process_start",
                        "process_exit",
                    ]
                )
            )
        )

        if after_timestamp is not None:
            query = query.filter(
                TelemetryEvent.timestamp > after_timestamp
            )

        return (
            query
            .order_by(TelemetryEvent.timestamp.asc())
            .limit(limit)
            .all()
        )