from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.schemas.analyze import AnalyzeRequest, AnalysisResponse
from app.services.inference_service import InferenceService
from app.dependencies.database import get_db
from app.services.investigation_service import InvestigationService
router = APIRouter(
    prefix="/analyze",
    tags=["AI"],
)

service = InferenceService()


@router.post("/", response_model=AnalysisResponse)
def analyze(
    request: AnalyzeRequest,
    db: Session = Depends(get_db),
):

    event = request.model_dump()

    analysis = service.analyze(event)

    InvestigationService.create_from_analysis(
        db=db,
        alert=event,
        analysis=analysis,
    )

    return analysis
