from datetime import datetime, timezone
from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator

from app.models.investigation import (
    InvestigationSeverity,
    InvestigationStatus,
)
from app.schemas.analyze import AnalysisResponse, AnalyzeRequest
from app.schemas.timeline import TimelineEventResponse


def normalize_confidence_scale(v: float | None) -> float | None:
    """
    Standardizes database/persisted confidence metrics to the canonical 0-100 scale.
    Maintains safe backward compatibility for legacy 0-1 values.
    """
    if v is not None:
        if 0.0 < v <= 1.0:
            return round(v * 100.0, 1)
        return round(max(0.0, min(v, 100.0)), 1)
    return v


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

    is_deleted: bool = False
    containment_status: str | None = None
    containment_message: str | None = None

    model_config = ConfigDict(from_attributes=True)

    @field_validator("confidence", mode="before")
    @classmethod
    def validate_confidence(cls, v: float | None) -> float | None:
        return normalize_confidence_scale(v)

    @field_serializer("created_at", "updated_at")
    def serialize_datetime(self, dt: datetime, _info) -> str:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()



class InvestigationListResponse(BaseModel):
    investigations: list[InvestigationResponse]


class UpdateInvestigationRequest(BaseModel):
    status: InvestigationStatus


class InvestigationDetailResponse(BaseModel):
    investigation: InvestigationResponse
    alert: AnalyzeRequest | None = None
    analysis: AnalysisResponse | None = None


class BehavioralDetectionResponse(BaseModel):
    id: str
    rule_id: str
    title: str
    description: str
    severity: str
    confidence: float
    host_id: str
    process_guid: str
    timestamp: float
    mitre_technique: str | None = None
    mitre_tactic: str | None = None
    recommendations: list[str] = Field(default_factory=list)
    evidence: list[dict] = Field(default_factory=list)
    metadata: dict = Field(default_factory=dict)

    model_config = ConfigDict(from_attributes=True)


class CorrelationResponse(BaseModel):
    correlation_id: str
    number_of_detections: int
    first_seen: float
    last_seen: float
    duration: float
    involved_process_guids: list[str] = Field(default_factory=list)
    mitre_techniques: list[str] = Field(default_factory=list)
    mitre_tactics: list[str] = Field(default_factory=list)
    aggregate_severity: str
    aggregate_confidence: float

    model_config = ConfigDict(from_attributes=True)


class ProcessEvidenceResponse(BaseModel):
    process_guid: str
    pid: int | None = None
    ppid: int | None = None
    process_name: str | None = None
    executable: str | None = None
    cmdline: list[str] | str | None = None
    username: str | None = None
    parent_info: str | dict | None = None

    model_config = ConfigDict(from_attributes=True)


class MitreMappingResponse(BaseModel):
    technique_id: str
    technique_name: str | None = None
    tactic: str | None = None
    description: str | None = None

    model_config = ConfigDict(from_attributes=True, extra="allow")


class ContainmentJobResponse(BaseModel):
    job_id: str
    status: str
    executor: str
    message: str | None = None
    started_at: str
    completed_at: str | None = None
    last_update: str


class InvestigationWorkspaceResponse(BaseModel):
    investigation: InvestigationResponse

    alert: AnalyzeRequest | None = None
    analysis: AnalysisResponse | None = None

    is_behavioral: bool

    behavioral_detections: list[BehavioralDetectionResponse] = Field(
        default_factory=list
    )
    primary_detection: BehavioralDetectionResponse | None = None
    correlation: CorrelationResponse | None = None
    process_evidence: list[ProcessEvidenceResponse] = Field(
        default_factory=list
    )
    mitre_mappings: list[MitreMappingResponse] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    timeline: list[TimelineEventResponse] = Field(default_factory=list)
    containment_job: ContainmentJobResponse | None = None

    model_config = ConfigDict(from_attributes=True)