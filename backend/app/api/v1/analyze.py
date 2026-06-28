from fastapi import APIRouter

from app.schemas.analyze import AnalyzeRequest
from app.services.inference_service import InferenceService

router = APIRouter(
    prefix="/analyze",
    tags=["AI"],
)

service = InferenceService()


@router.post("/")
def analyze(request: AnalyzeRequest):

    event = request.model_dump()

    return service.analyze(event)