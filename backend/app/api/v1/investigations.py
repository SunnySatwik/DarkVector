from app.schemas.analyze import AnalysisResponse, AnalyzeRequest
from app.schemas.investigation import InvestigationDetailResponse
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.dependencies.database import get_db
from app.schemas.investigation import (
    InvestigationResponse,
    InvestigationListResponse,
    InvestigationDetailResponse,
    UpdateInvestigationRequest,
)
from app.services.investigation_service import InvestigationService
from app.repositories.timeline_repository import TimelineRepository
from app.services.timeline_service import TimelineService
from app.schemas.timeline import TimelineEventResponse
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
        investigation=InvestigationResponse.model_validate(
            investigation
        ),
        alert=AnalyzeRequest.model_validate(
            investigation.alert_json
        ),
        analysis=AnalysisResponse.model_validate(
            investigation.analysis_json
        ),
    )
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

    return service.get_timeline(
        investigation_id
    )


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