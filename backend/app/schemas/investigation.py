from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.investigation import (
    InvestigationSeverity,
    InvestigationStatus,
)
from app.schemas.analyze import AnalysisResponse, AnalyzeRequest

class InvestigationResponse(BaseModel):
    investigation_id: str
    alert_id: str
    title: str

    status: InvestigationStatus
    severity: InvestigationSeverity

    risk_score: float
    confidence: float | None

    summary: str | None

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InvestigationListResponse(BaseModel):
    investigations: list[InvestigationResponse]


class UpdateInvestigationRequest(BaseModel):
    status: InvestigationStatus

class InvestigationDetailResponse(BaseModel):
    investigation: InvestigationResponse
    alert: AnalyzeRequest
    analysis: AnalysisResponse