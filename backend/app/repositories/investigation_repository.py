from _pytest import debugging
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.investigation import Investigation


class InvestigationRepository:
    """Handles persistence for Investigation entities."""

    @staticmethod
    def create(
        db: Session,
        investigation: Investigation,
    ) -> Investigation:
        try:
            db.add(investigation)
            db.commit()
            db.refresh(investigation)
            return investigation

        except Exception:
            db.rollback()
            raise
        
    @staticmethod
    def get_by_id(
        db: Session,
        id: int,
    ) -> Investigation | None:
        return db.get(Investigation, id)

    @staticmethod
    def get_by_investigation_id(
        db: Session,
        investigation_id: str,
    ) -> Investigation | None:

        stmt = (
            select(Investigation)
            .where(
                Investigation.investigation_id == investigation_id
            )
        )

        return db.scalar(stmt)

    @staticmethod
    def get_by_alert_id(
        db: Session,
        alert_id: str,
    ) -> Investigation | None:

        stmt = (
            select(Investigation)
            .where(
                Investigation.alert_id == alert_id
            )
        )

        return db.scalar(stmt)

    @staticmethod
    def list_all(
        db: Session,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Investigation]:

        stmt = (
            select(Investigation)
            .offset(offset)
            .limit(limit)
            .order_by(Investigation.created_at.desc())
        )

        return list(db.scalars(stmt))

    @staticmethod
    def update(
        db: Session,
        investigation: Investigation,
    ) -> Investigation:

        db.add(investigation)
        db.commit()
        db.refresh(investigation)
        return investigation

    @staticmethod
    def delete(
        db: Session,
        investigation: Investigation,
    ) -> None:

        db.delete(investigation)
        db.commit()