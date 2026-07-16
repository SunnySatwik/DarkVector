from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.dependencies.database import get_db
from app.schemas.analyze import AnalysisResponse, AnalyzeRequest
from app.schemas.timeline import TimelineEventResponse
from app.schemas.investigation import (
    InvestigationResponse,
    InvestigationListResponse,
    InvestigationDetailResponse,
    UpdateInvestigationRequest,
    InvestigationWorkspaceResponse,
)
from app.services.investigation_service import InvestigationService
from app.repositories.timeline_repository import TimelineRepository
from app.services.timeline_service import TimelineService

router = APIRouter(
    prefix="/investigations",
    tags=["Investigations"],
)


@router.get(
    "/",
    response_model=InvestigationListResponse,
)
def list_investigations(
    include_archived: bool = False,
    db: Session = Depends(get_db),
):
    investigations = InvestigationService.list_investigations(db, include_archived=include_archived)
    return InvestigationListResponse(
        investigations=[
            InvestigationResponse.model_validate(inv)
            for inv in investigations
        ]
    )


@router.get(
    "/{investigation_id}/workspace",
    response_model=InvestigationWorkspaceResponse,
)
def get_workspace(
    investigation_id: str,
    db: Session = Depends(get_db),
):
    workspace = InvestigationService.get_workspace(
        db,
        investigation_id,
    )

    if workspace is None:
        raise HTTPException(
            status_code=404,
            detail="Investigation not found",
        )

    return InvestigationWorkspaceResponse.model_validate(workspace)


@router.get(
    "/{investigation_id}/timeline",
    response_model=list[TimelineEventResponse],
)
def get_timeline(
    investigation_id: str,
    db: Session = Depends(get_db),
):
    repository = TimelineRepository(db)
    service = TimelineService(repository)
    return service.get_timeline(investigation_id)


class ReportResponse(BaseModel):
    report: str


@router.get(
    "/{investigation_id}/report",
    response_model=ReportResponse,
)
def get_investigation_report(
    investigation_id: str,
    db: Session = Depends(get_db),
):
    investigation = InvestigationService.get_investigation(
        db,
        investigation_id,
    )
    if investigation is None:
        raise HTTPException(
            status_code=404,
            detail="Investigation not found",
        )

    timeline_repo = TimelineRepository(db)
    timeline_events = timeline_repo.list_for_investigation(investigation_id)

    from app.services.llm.llm_service import LLMService

    report_content = LLMService.generate_report(
        db, investigation, timeline_events
    )
    return ReportResponse(report=report_content)


@router.patch(
    "/{investigation_id}/status",
    response_model=InvestigationResponse,
)
def update_investigation_status(
    investigation_id: str,
    payload: UpdateInvestigationRequest,
    db: Session = Depends(get_db),
):
    investigation = InvestigationService.update_status(
        db,
        investigation_id,
        payload.status,
    )
    if investigation is None:
        raise HTTPException(
            status_code=404,
            detail="Investigation not found",
        )
    return InvestigationResponse.model_validate(investigation)


@router.get(
    "/{investigation_id}",
    response_model=InvestigationDetailResponse,
)
def get_investigation(
    investigation_id: str,
    db: Session = Depends(get_db),
):
    investigation = InvestigationService.get_investigation(
        db,
        investigation_id,
    )

    if investigation is None:
        raise HTTPException(
            status_code=404,
            detail="Investigation not found",
        )

    return InvestigationDetailResponse(
        investigation=InvestigationResponse.model_validate(investigation),
        alert=(
            AnalyzeRequest.model_validate(investigation.alert_json)
            if investigation.alert_json
            else None
        ),
        analysis=(
            AnalysisResponse.model_validate(investigation.analysis_json)
            if investigation.analysis_json
            else None
        ),
    )


@router.post("/bulk-archive")
def bulk_archive(
    status: str | None = None,
    severity: str | None = None,
    generated_by: str | None = None,
    demo_only: bool = False,
    start_date: str | None = None,
    end_date: str | None = None,
    db: Session = Depends(get_db)
):
    count = InvestigationService.bulk_archive_investigations(
        db, status, severity, generated_by, demo_only, start_date, end_date
    )
    return {"message": f"Successfully archived {count} investigations."}


@router.post("/bulk-delete")
def bulk_delete(
    permanent: bool = False,
    status: str | None = None,
    severity: str | None = None,
    generated_by: str | None = None,
    demo_only: bool = False,
    start_date: str | None = None,
    end_date: str | None = None,
    db: Session = Depends(get_db)
):
    count = InvestigationService.bulk_delete_investigations(
        db, permanent, status, severity, generated_by, demo_only, start_date, end_date
    )
    return {"message": f"Successfully deleted {count} investigations."}


@router.post("/{investigation_id}/archive", response_model=InvestigationResponse)
def archive_investigation(investigation_id: str, db: Session = Depends(get_db)):
    inv = InvestigationService.archive_investigation(db, investigation_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return InvestigationResponse.model_validate(inv)


@router.post("/{investigation_id}/restore", response_model=InvestigationResponse)
def restore_investigation(investigation_id: str, db: Session = Depends(get_db)):
    inv = InvestigationService.restore_investigation(db, investigation_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return InvestigationResponse.model_validate(inv)


@router.post("/{investigation_id}/dismiss", response_model=InvestigationResponse)
def dismiss_investigation(investigation_id: str, db: Session = Depends(get_db)):
    inv = InvestigationService.dismiss_investigation(db, investigation_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return InvestigationResponse.model_validate(inv)


@router.delete("/{investigation_id}")
def delete_investigation(investigation_id: str, permanent: bool = False, db: Session = Depends(get_db)):
    success = InvestigationService.delete_investigation(db, investigation_id, permanent=permanent)
    if not success:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return {"message": "Investigation deleted successfully."}


@router.post("/{investigation_id}/containment")
def trigger_containment(
    investigation_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    res = InvestigationService.trigger_containment(db, investigation_id, background_tasks)
    if not res:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return res