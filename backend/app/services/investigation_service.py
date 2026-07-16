from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy.orm import Session

from app.models.investigation import (
    Investigation,
    InvestigationSeverity,
    InvestigationStatus,
)
from app.repositories.investigation_repository import InvestigationRepository
from app.schemas.analyze import AnalysisResponse
from app.models.timeline import (
    TimelineActor,
    TimelineEventType,
)
from app.repositories.timeline_repository import TimelineRepository
from app.services.timeline_service import TimelineService

class InvestigationService:
    """Business logic for investigation lifecycle."""

    @staticmethod
    def _generate_investigation_id() -> str:
        return (
            f"INV-"
            f"{datetime.now(UTC):%y%m%d}-"
            f"{uuid4().hex[:6].upper()}"
        )

    @staticmethod
    def build_concise_summary(alert: dict, analysis: AnalysisResponse) -> str:
        """
        Builds a concise, plain text, evidence-grounded investigation summary (1-3 sentences)
        for legacy ML investigations. Satisfies the semantic boundary contract.
        """
        category = alert.get("category", "unknown").lower()
        source = alert.get("source", "unknown host")
        alert_type = alert.get("type", "anomalous activity")
        
        details = alert.get("details") or {}
        
        if category == "process":
            proc_path = details.get("processPath") or details.get("process_path") or "an unknown binary"
            cmd_line = details.get("commandLine") or details.get("command_line")
            parent = details.get("parentProcess") or details.get("parent_process")
            
            detail_msg = f"executing {proc_path}"
            if cmd_line:
                # Truncate cmd_line if extremely long to maintain concise summary contract
                cmd_truncated = cmd_line[:120] + "..." if len(cmd_line) > 120 else cmd_line
                detail_msg += f" with command line '{cmd_truncated}'"
            if parent:
                detail_msg += f" (parent process: {parent})"
                
            summary = (
                f"Anomalous process execution was observed on {source} {detail_msg}. "
                f"The activity triggered a {alert_type} alert and was flagged by the ML analysis pipeline."
            )
        elif category == "network":
            ip = details.get("ipAddress") or details.get("ip_address")
            port = details.get("port")
            bytes_tx = details.get("bytesTransferred") or details.get("bytes_transferred")
            
            dest_msg = ""
            if ip:
                dest_msg += f" to {ip}"
                if port:
                    dest_msg += f" on port {port}"
            if bytes_tx:
                dest_msg += f" transferring {bytes_tx} bytes"
                
            summary = (
                f"Anomalous network connection was observed from {source}{dest_msg}. "
                f"The activity triggered a {alert_type} alert and was flagged by the ML analysis pipeline."
            )
        elif category == "authentication":
            username = details.get("username") or "an unknown user"
            ip = details.get("ipAddress") or details.get("ip_address")
            
            from_msg = f" for user {username}"
            if ip:
                from_msg += f" from IP {ip}"
                
            summary = (
                f"Anomalous authentication attempt was observed on {source}{from_msg}. "
                f"The activity triggered a {alert_type} alert and was flagged by the ML analysis pipeline."
            )
        else:
            summary = (
                f"Anomalous activity of category {category} was observed on {source}. "
                f"The activity triggered a {alert_type} alert and was flagged by the ML analysis pipeline."
            )
            
        mitre_suffix = ""
        mitre = None
        if hasattr(analysis, "context") and getattr(analysis, "context", None):
            mitre = getattr(analysis.context, "mitre", None)
        elif isinstance(analysis, dict) and "context" in analysis and analysis["context"]:
            mitre = analysis["context"].get("mitre")
            
        if mitre:
            tech_id = getattr(mitre, "technique_id", None) or (mitre.get("technique_id") if isinstance(mitre, dict) else None)
            tech_name = getattr(mitre, "technique_name", None) or (mitre.get("technique_name") if isinstance(mitre, dict) else None)
            if tech_id:
                mitre_suffix = f" The activity maps to MITRE ATT&CK {tech_id} ({tech_name or ''})."
                
        return summary + mitre_suffix

    @staticmethod
    def create_from_analysis(
        db: Session,
        alert: dict,
        analysis: AnalysisResponse,
    ) -> Investigation:
        """
        Create and persist an investigation from an analyzed alert.
        """
        # Idempotency check: return existing if present
        existing = InvestigationRepository.get_by_alert_id(db, alert["id"])
        if existing:
            return existing
 
        severity = InvestigationSeverity[
            analysis.analysis.severity.upper()
        ]
 
        summary = InvestigationService.build_concise_summary(alert, analysis)

        investigation = Investigation(
            investigation_id=InvestigationService._generate_investigation_id(),
            alert_id=alert["id"],
            title=alert["type"],
            status=InvestigationStatus.NEW,
            severity=severity,
            risk_score=analysis.analysis.risk_score,
            confidence=analysis.analysis.confidence,
            summary=summary,
            alert_json=alert,
            analysis_json=analysis.model_dump(mode="json"),
        )
 
        created = InvestigationRepository.create(
            db,
            investigation,
        )
        timeline_repository = TimelineRepository(db)
 
        timeline_service = TimelineService(
            timeline_repository
        )
        timeline_service.add_event(
            investigation_id=created.investigation_id,
            event_type=TimelineEventType.ALERT_CREATED,
            actor=TimelineActor.SYSTEM,
            title="Alert received",
            description=(
                f"Security alert '{created.title}' "
                f"triggered an investigation."
            ),
        )
        timeline_service.add_event(
            investigation_id=created.investigation_id,
            event_type=TimelineEventType.ANALYSIS_COMPLETED,
            actor=TimelineActor.AI,
            title="AI analysis completed",
            description=(
                f"Risk Score: {created.risk_score:.1f} | "
                f"Severity: {created.severity.value} | "
                f"Confidence: {created.confidence:.0f}%"
            ),
        )
        return created


    @staticmethod
    def list_investigations(
        db: Session,
        include_archived: bool = False,
    ) -> list[Investigation]:
        """
        Return all investigations ordered by newest first.
        """

        return InvestigationRepository.list_all(db, include_archived=include_archived)

    @staticmethod
    def get_investigation(
        db: Session,
        investigation_id: str,
    ) -> Investigation | None:
        """
        Retrieve a single investigation by its public ID.
        """

        return InvestigationRepository.get_by_investigation_id(
            db,
            investigation_id,
        )

    @staticmethod
    def update_status(
        db: Session,
        investigation_id: str,
        status: InvestigationStatus,
    ) -> Investigation | None:
        """
        Update the status of an investigation and log a timeline event.
        """
        investigation = InvestigationRepository.get_by_investigation_id(
            db,
            investigation_id,
        )
        if not investigation:
            return None

        # Only update and log if the status actually changed to prevent duplicate events
        if investigation.status != status:
            investigation.status = status
            InvestigationRepository.update(db, investigation)

            timeline_repository = TimelineRepository(db)
            timeline_service = TimelineService(timeline_repository)
            timeline_service.add_event(
                investigation_id=investigation_id,
                event_type=TimelineEventType.STATUS_CHANGED,
                actor=TimelineActor.ANALYST,
                title="Status changed",
                description=f"Investigation marked as {status.value.title()}.",
            )

        return investigation

    @staticmethod
    def archive_investigation(db: Session, investigation_id: str) -> Investigation | None:
        investigation = InvestigationRepository.get_by_investigation_id(db, investigation_id)
        if not investigation:
            return None
        
        if investigation.status != InvestigationStatus.ARCHIVED:
            investigation.status = InvestigationStatus.ARCHIVED
            InvestigationRepository.update(db, investigation)
            
            timeline_repo = TimelineRepository(db)
            timeline_service = TimelineService(timeline_repo)
            timeline_service.add_event(
                investigation_id=investigation_id,
                event_type=TimelineEventType.STATUS_CHANGED,
                actor=TimelineActor.ANALYST,
                title="Investigation archived",
                description="Investigation archived by analyst.",
            )
        return investigation

    @staticmethod
    def restore_investigation(db: Session, investigation_id: str) -> Investigation | None:
        investigation = InvestigationRepository.get_by_investigation_id(db, investigation_id)
        if not investigation:
            return None
        
        if investigation.status == InvestigationStatus.ARCHIVED:
            investigation.status = InvestigationStatus.NEW
            InvestigationRepository.update(db, investigation)
            
            timeline_repo = TimelineRepository(db)
            timeline_service = TimelineService(timeline_repo)
            timeline_service.add_event(
                investigation_id=investigation_id,
                event_type=TimelineEventType.STATUS_CHANGED,
                actor=TimelineActor.ANALYST,
                title="Investigation restored",
                description="Investigation restored from archive.",
            )
        return investigation

    @staticmethod
    def delete_investigation(db: Session, investigation_id: str, permanent: bool = False) -> bool:
        investigation = InvestigationRepository.get_by_investigation_id(db, investigation_id, include_deleted=True)
        if not investigation:
            return False
            
        if permanent:
            InvestigationRepository.delete(db, investigation)
        else:
            if not investigation.is_deleted:
                investigation.is_deleted = True
                InvestigationRepository.update(db, investigation)
                
                timeline_repo = TimelineRepository(db)
                timeline_service = TimelineService(timeline_repo)
                timeline_service.add_event(
                    investigation_id=investigation_id,
                    event_type=TimelineEventType.STATUS_CHANGED,
                    actor=TimelineActor.ANALYST,
                    title="Investigation soft-deleted",
                    description="Investigation soft-deleted by analyst.",
                )
        return True

    @staticmethod
    def dismiss_investigation(db: Session, investigation_id: str) -> Investigation | None:
        investigation = InvestigationRepository.get_by_investigation_id(db, investigation_id)
        if not investigation:
            return None
        
        timeline_repo = TimelineRepository(db)
        timeline_service = TimelineService(timeline_repo)
        
        if investigation.status != InvestigationStatus.RESOLVED:
            investigation.status = InvestigationStatus.RESOLVED
            timeline_service.add_event(
                investigation_id=investigation_id,
                event_type=TimelineEventType.STATUS_CHANGED,
                actor=TimelineActor.ANALYST,
                title="Status changed",
                description="Investigation marked as Resolved.",
            )
            
        investigation.status = InvestigationStatus.ARCHIVED
        timeline_service.add_event(
            investigation_id=investigation_id,
            event_type=TimelineEventType.STATUS_CHANGED,
            actor=TimelineActor.ANALYST,
            title="Investigation dismissed",
            description="Investigation dismissed (resolved and archived).",
        )
        
        InvestigationRepository.update(db, investigation)
        return investigation

    @staticmethod
    def bulk_archive_investigations(
        db: Session,
        status: str | None = None,
        severity: str | None = None,
        generated_by: str | None = None,
        demo_only: bool = False,
        start_date: str | None = None,
        end_date: str | None = None,
    ) -> int:
        from sqlalchemy import select
        
        stmt = select(Investigation).where(
            Investigation.is_deleted == False,
            Investigation.status != InvestigationStatus.ARCHIVED,
        )
        
        if status:
            stmt = stmt.where(Investigation.status == status.upper())
        if severity:
            stmt = stmt.where(Investigation.severity == severity.upper())
        if demo_only:
            stmt = stmt.where(Investigation.detection_json == None)
        if generated_by:
            if generated_by.lower() == "behavioral":
                stmt = stmt.where(Investigation.detection_json != None)
            elif generated_by.lower() == "ml":
                stmt = stmt.where(Investigation.detection_json == None)
        if start_date:
            try:
                s_dt = datetime.fromisoformat(start_date)
                stmt = stmt.where(Investigation.created_at >= s_dt)
            except ValueError:
                pass
        if end_date:
            try:
                e_dt = datetime.fromisoformat(end_date)
                stmt = stmt.where(Investigation.created_at <= e_dt)
            except ValueError:
                pass
                
        invs = list(db.scalars(stmt))
        count = 0
        timeline_repo = TimelineRepository(db)
        timeline_service = TimelineService(timeline_repo)
        
        for inv in invs:
            inv.status = InvestigationStatus.ARCHIVED
            InvestigationRepository.update(db, inv)
            timeline_service.add_event(
                investigation_id=inv.investigation_id,
                event_type=TimelineEventType.STATUS_CHANGED,
                actor=TimelineActor.ANALYST,
                title="Investigation archived",
                description="Investigation archived during bulk operation.",
            )
            count += 1
        return count

    @staticmethod
    def bulk_delete_investigations(
        db: Session,
        permanent: bool = False,
        status: str | None = None,
        severity: str | None = None,
        generated_by: str | None = None,
        demo_only: bool = False,
        start_date: str | None = None,
        end_date: str | None = None,
    ) -> int:
        from sqlalchemy import select
        
        stmt = select(Investigation)
        if not permanent:
            stmt = stmt.where(Investigation.is_deleted == False)
            
        if status:
            stmt = stmt.where(Investigation.status == status.upper())
        if severity:
            stmt = stmt.where(Investigation.severity == severity.upper())
        if demo_only:
            stmt = stmt.where(Investigation.detection_json == None)
        if generated_by:
            if generated_by.lower() == "behavioral":
                stmt = stmt.where(Investigation.detection_json != None)
            elif generated_by.lower() == "ml":
                stmt = stmt.where(Investigation.detection_json == None)
        if start_date:
            try:
                s_dt = datetime.fromisoformat(start_date)
                stmt = stmt.where(Investigation.created_at >= s_dt)
            except ValueError:
                pass
        if end_date:
            try:
                e_dt = datetime.fromisoformat(end_date)
                stmt = stmt.where(Investigation.created_at <= e_dt)
            except ValueError:
                pass
                
        invs = list(db.scalars(stmt))
        count = 0
        timeline_repo = TimelineRepository(db)
        timeline_service = TimelineService(timeline_repo)
        
        for inv in invs:
            if permanent:
                InvestigationRepository.delete(db, inv)
            else:
                inv.is_deleted = True
                InvestigationRepository.update(db, inv)
                timeline_service.add_event(
                    investigation_id=inv.investigation_id,
                    event_type=TimelineEventType.STATUS_CHANGED,
                    actor=TimelineActor.ANALYST,
                    title="Investigation soft-deleted",
                    description="Investigation soft-deleted during bulk operation.",
                )
            count += 1
        return count

    @staticmethod
    def trigger_containment(db: Session, investigation_id: str, background_tasks) -> dict | None:
        investigation = InvestigationRepository.get_by_investigation_id(db, investigation_id)
        if not investigation:
            return None
            
        from app.models.containment import ContainmentJob
        import uuid
        
        job = ContainmentJob(
            investigation_id=investigation_id,
            status="QUEUED",
            executor="simulated",
            message="Host network containment task queued."
        )
        db.add(job)
        
        investigation.containment_status = "QUEUED"
        investigation.containment_message = "Host network containment task queued."
        
        timeline_repo = TimelineRepository(db)
        timeline_service = TimelineService(timeline_repo)
        timeline_service.add_event(
            investigation_id=investigation_id,
            event_type=TimelineEventType.STATUS_CHANGED,
            actor=TimelineActor.ANALYST,
            title="Containment Requested",
            description="Analyst dispatched active host network isolation task.",
        )
        db.commit()
        db.refresh(job)
        
        from app.services.containment_provider import SimulatedProvider
        from app.database.session import SessionLocal
        
        def run_job_bg(job_id: uuid.UUID, inv_id: str):
            with SessionLocal() as bg_db:
                provider = SimulatedProvider()
                provider.execute(bg_db, job_id, inv_id)
                
        background_tasks.add_task(run_job_bg, job.id, investigation_id)
        
        return {
            "job_id": str(job.id),
            "status": job.status,
            "message": job.message,
            "started_at": job.started_at.isoformat(),
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        }

    @staticmethod
    def get_workspace(
        db: Session,
        investigation_id: str,
    ) -> dict | None:
        """
        Builds a frontend-ready dictionary representing the workspace for an investigation.
        """
        investigation = InvestigationService.get_investigation(db, investigation_id)
        if not investigation:
            return None

        # Load timeline events using TimelineRepository
        timeline_repo = TimelineRepository(db)
        timeline_events = timeline_repo.list_for_investigation(investigation_id)

        # Call ContextBuilder.build to reuse canonical normalization layer
        from app.services.context_builder import ContextBuilder
        context = ContextBuilder.build(
            db=db,
            investigation_id=investigation_id,
            timeline_events=timeline_events,
        )

        is_behavioral = context.get("behavioral_context") is not None

        # Extract normalized attributes
        behavioral_detections = []
        primary_detection = None
        correlation = None
        process_evidence = []
        mitre_mappings = []
        recommendations = []

        if is_behavioral:
            behavioral_detections = context["behavioral_context"].get("detections") or []
            primary_detection = context["behavioral_context"].get("primary_detection")
            correlation = context.get("correlation_context")
            process_evidence = context.get("process_evidence") or []
            mitre_mappings = context.get("mitre_mappings") or []
            recommendations = context.get("recommendations") or []

        from app.models.containment import ContainmentJob
        active_job = db.query(ContainmentJob).filter(
            ContainmentJob.investigation_id == investigation_id
        ).order_by(ContainmentJob.started_at.desc()).first()
        
        job_details = None
        if active_job:
            job_details = {
                "job_id": str(active_job.id),
                "status": active_job.status,
                "executor": active_job.executor,
                "message": active_job.message,
                "started_at": active_job.started_at.isoformat(),
                "completed_at": active_job.completed_at.isoformat() if active_job.completed_at else None,
                "last_update": active_job.last_update.isoformat(),
            }

        return {
            "investigation": investigation,
            "alert": investigation.alert_json,
            "analysis": investigation.analysis_json,
            "is_behavioral": is_behavioral,
            "behavioral_detections": behavioral_detections,
            "primary_detection": primary_detection,
            "correlation": correlation,
            "process_evidence": process_evidence,
            "mitre_mappings": mitre_mappings,
            "recommendations": recommendations,
            "timeline": timeline_events,
            "containment_job": job_details,
        }