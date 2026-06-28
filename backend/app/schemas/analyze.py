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

class AnalysisResponse(BaseModel):
    anomaly_score: float
    risk_score: float
    severity: str
    is_anomaly: bool