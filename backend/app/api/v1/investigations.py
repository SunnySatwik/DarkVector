from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencies.database import get_db
from app.schemas.investigation import (
    InvestigationListResponse,
    InvestigationResponse,
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