from dataclasses import dataclass
from enum import Enum


class Intent(Enum):
    GENERAL = "general"
    EXPLAIN_ATTACK = "explain_attack"
    RISK_ANALYSIS = "risk_analysis"
    REMEDIATION = "remediation"
    MITRE = "mitre"
    TIMELINE = "timeline"
    EVIDENCE = "evidence"


@dataclass
class IntentResult:
    intent: Intent
    confidence: float
    matched_keywords: list[str]