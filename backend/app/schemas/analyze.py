from pydantic import BaseModel
from typing import Optional

class AlertDetails(BaseModel):
    ipAddress: Optional[str] = None
    userAgent: Optional[str] = None
    processPath: Optional[str] = None
    parentProcess: Optional[str] = None
    commandLine: Optional[str] = None
    port: Optional[int] = None
    bytesTransferred: Optional[int] = None
    username: Optional[str] = None
    isolationForestScore: Optional[float] = None

class AnalyzeRequest(BaseModel):
    id: str
    timestamp: str
    source: str
    type: str
    severity: str
    category: str
    description: str
    details: Optional[AlertDetails] = None

class AnalysisResult(BaseModel):
    risk_score: float
    anomaly_score: float
    severity: str
    confidence: float
    is_anomaly: bool


# ---------- Explanation ----------

class FeatureContribution(BaseModel):
    feature: str
    impact: float
    direction: str


class Explanation(BaseModel):
    summary: str
    top_factors: list[FeatureContribution]


# ---------- Metadata ----------

class Metadata(BaseModel):
    model_version: str
    analysis_time_ms: float


# ---------- Final Response ----------

class AnalysisResponse(BaseModel):
    analysis: AnalysisResult
    explanation: Explanation
    metadata: Metadata