from enum import Enum


class PromptRoute(Enum):

    GENERAL = "general"

    EXPLAIN_ATTACK = "explain_attack"

    RISK_ANALYSIS = "risk_analysis"

    REMEDIATION = "remediation"

    MITRE = "mitre"

    TIMELINE = "timeline"

    EVIDENCE = "evidence"