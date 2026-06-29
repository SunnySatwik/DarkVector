from app.schemas.analyze import AnalysisResponse
from app.schemas.investigation import InvestigationDetailResponse
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.dependencies.database import get_db
from app.schemas.investigation import (
    InvestigationResponse,
    InvestigationListResponse,
    InvestigationDetailResponse,
)
from app.services.investigation_service import InvestigationService

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
        analysis=AnalysisResponse.model_validate(
            investigation.analysis_json
        ),
    )