from fastapi import APIRouter, Depends, HTTPException
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
    db: Session = Depends(get_db),
):
    investigations = InvestigationService.list_investigations(db)
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