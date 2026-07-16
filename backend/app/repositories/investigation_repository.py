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
        inv = db.get(Investigation, id)
        if inv and inv.is_deleted:
            return None
        return inv

    @staticmethod
    def get_by_investigation_id(
        db: Session,
        investigation_id: str,
        include_deleted: bool = False,
    ) -> Investigation | None:

        stmt = select(Investigation).where(
            Investigation.investigation_id == investigation_id
        )
        if not include_deleted:
            stmt = stmt.where(Investigation.is_deleted == False)

        return db.scalar(stmt)

    @staticmethod
    def get_by_alert_id(
        db: Session,
        alert_id: str,
        include_deleted: bool = False,
    ) -> Investigation | None:

        stmt = select(Investigation).where(
            Investigation.alert_id == alert_id
        )
        if not include_deleted:
            stmt = stmt.where(Investigation.is_deleted == False)

        return db.scalar(stmt)

    @staticmethod
    def list_all(
        db: Session,
        limit: int = 100,
        offset: int = 0,
        include_archived: bool = False,
        include_deleted: bool = False,
    ) -> list[Investigation]:

        stmt = select(Investigation)
        if not include_deleted:
            stmt = stmt.where(Investigation.is_deleted == False)
        if not include_archived:
            from app.models.investigation import InvestigationStatus
            stmt = stmt.where(Investigation.status != InvestigationStatus.ARCHIVED)
            
        stmt = stmt.offset(offset).limit(limit).order_by(Investigation.created_at.desc())

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

    @staticmethod
    def find_by_detection_ids_or_process_guids(
        db: Session,
        detection_ids: list[str],
        process_guids: list[str],
    ) -> list[Investigation]:
        """
        Locates all investigations containing any of the member detection IDs
        or related process GUIDs in their detection_json.
        """
        stmt = select(Investigation).where(Investigation.is_deleted == False).order_by(Investigation.created_at.desc())
        invs = list(db.scalars(stmt))

        matches = []
        for inv in invs:
            if not inv.detection_json:
                continue

            # Support both new correlation group and legacy single-detection schemas
            if "id" in inv.detection_json and "detections" not in inv.detection_json:
                dets = [inv.detection_json]
            else:
                dets = inv.detection_json.get("detections", [])

            for d in dets:
                det_id = d.get("id")
                proc_guid = d.get("process_guid")
                if (det_id and det_id in detection_ids) or (
                    proc_guid and proc_guid in process_guids
                ):
                    matches.append(inv)
                    break
        return matches