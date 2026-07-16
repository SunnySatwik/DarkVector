from abc import ABC, abstractmethod
import time
from sqlalchemy.orm import Session
from app.models.containment import ContainmentJob
from app.models.investigation import Investigation, InvestigationStatus
from app.models.timeline import TimelineEventType, TimelineActor
from app.services.timeline_service import TimelineService
from app.repositories.timeline_repository import TimelineRepository
from datetime import datetime, timezone
import uuid

class ContainmentProvider(ABC):
    @abstractmethod
    def execute(self, db: Session, job_id: uuid.UUID, investigation_id: str):
        pass

class SimulatedProvider(ContainmentProvider):
    def execute(self, db: Session, job_id: uuid.UUID, investigation_id: str):
        # We simulate the transitions
        # Stage 1: Transition to EXECUTING
        job = db.get(ContainmentJob, job_id)
        if not job or job.status != "QUEUED":
            return
            
        job.status = "EXECUTING"
        job.message = "Agent isolation rules dispatching to endpoint interfaces."
        job.last_update = datetime.now(timezone.utc)
        
        # Log timeline event
        timeline_repo = TimelineRepository(db)
        timeline_service = TimelineService(timeline_repo)
        timeline_service.add_event(
            investigation_id=investigation_id,
            event_type=TimelineEventType.STATUS_CHANGED,
            actor=TimelineActor.SYSTEM,
            title="Containment Started",
            description="Containment agent execution started. Blocking endpoint egress interface routes.",
        )
        db.commit()
        
        # Simulate work duration
        time.sleep(3)
        
        # Stage 2: Transition to COMPLETED
        db.refresh(job)
        if not job or job.status != "EXECUTING":
            return
            
        job.status = "COMPLETED"
        job.completed_at = datetime.now(timezone.utc)
        job.message = "Target network segments successfully quarantined."
        job.last_update = datetime.now(timezone.utc)
        
        # Update the investigation
        investigation = db.query(Investigation).filter(Investigation.investigation_id == investigation_id).first()
        if investigation:
            investigation.containment_status = "COMPLETED"
            investigation.containment_message = "Host successfully quarantined and isolated."
            investigation.status = InvestigationStatus.CONTAINED
            
        # Log final timeline event
        timeline_service.add_event(
            investigation_id=investigation_id,
            event_type=TimelineEventType.STATUS_CHANGED,
            actor=TimelineActor.SYSTEM,
            title="Containment Completed",
            description="Containment successfully completed. Affected host isolated.",
        )
        db.commit()
