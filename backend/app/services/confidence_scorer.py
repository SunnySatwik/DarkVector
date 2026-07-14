"""
LEGACY ML CONFIDENCE SCORER

Preferred semantic definition:
"Confidence represents the strength and reliability of the available evidence supporting
DarkVector's analysis of the event."

It does NOT represent:
- The probability that the event is malicious or that the host is compromised.
- A risk score with a different label.
- The Isolation Forest anomaly score converted directly to a percentage.
- AI confidence, analyst confidence, or detection severity.
"""

import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("darkvector.analysis")

class ConfidenceResult:
    def __init__(
        self,
        score: float,
        model_evidence: float,
        explanation_evidence: float,
        contextual_evidence: float,
        input_completeness: float,
        reasons: List[str],
    ):
        self.score = score
        self.model_evidence = model_evidence
        self.explanation_evidence = explanation_evidence
        self.contextual_evidence = contextual_evidence
        self.input_completeness = input_completeness
        self.reasons = reasons

    def to_dict(self) -> Dict[str, Any]:
        return {
            "score": self.score,
            "model_evidence": self.model_evidence,
            "explanation_evidence": self.explanation_evidence,
            "contextual_evidence": self.contextual_evidence,
            "input_completeness": self.input_completeness,
            "reasons": self.reasons,
        }


class ConfidenceScorer:
    @staticmethod
    def calculate(
        anomaly_score: float,
        score_distribution: Dict[str, float],
        top_factors: List[Any],
        mitre_mapping: Optional[Dict[str, Any]],
        threat_intelligence: Optional[Dict[str, Any]],
        alert_data: Dict[str, Any],
    ) -> ConfidenceResult:
        reasons = []

        # 1. MODEL EVIDENCE STRENGTH
        # Evaluate model score position in training distribution
        model_evidence = 15.0
        d = score_distribution or {}
        if d:
            if anomaly_score <= d.get("p1", -0.005):
                model_evidence = 95.0
                reasons.append("Event sits in the top 1% of anomalies in model training distribution.")
            elif anomaly_score <= d.get("p5", 0.018):
                model_evidence = 85.0
                reasons.append("Event sits in the top 5% of anomalies in model training distribution.")
            elif anomaly_score <= d.get("p10", 0.034):
                model_evidence = 75.0
                reasons.append("Model detected moderate-to-high deviation from typical event profiles.")
            elif anomaly_score <= d.get("p25", 0.065):
                model_evidence = 60.0
                reasons.append("Model detected slight deviation from typical event profiles.")
            elif anomaly_score <= d.get("median", 0.095):
                model_evidence = 40.0
                reasons.append("Event profile is close to the typical training baseline.")
            else:
                model_evidence = 15.0
                reasons.append("Event profile is highly typical of standard baseline traffic.")
        else:
            model_evidence = 50.0
            reasons.append("Calibration stats unavailable; defaulting to baseline model score weight.")

        # 2. EXPLANATION QUALITY (SHAP)
        explanation_evidence = 0.0
        if not top_factors:
            reasons.append("No feature attribution (SHAP) factors are available.")
        else:
            # We count features with positive impact
            significant_factors = [
                f for f in top_factors
                if hasattr(f, "impact") and getattr(f, "impact", 0.0) > 0.0
            ]
            if not significant_factors:
                reasons.append("Attributed feature contributions show zero anomaly impact.")
            else:
                explanation_evidence = 30.0
                explanation_evidence += min(len(significant_factors) * 20.0, 60.0)
                # Check for high impact feature
                max_impact = max(getattr(f, "impact", 0.0) for f in significant_factors)
                if max_impact > 0.15:
                    explanation_evidence += 10.0
                explanation_evidence = min(explanation_evidence, 100.0)
                reasons.append(f"Identified {len(significant_factors)} distinct feature attributions explaining model deviation.")

        # 3. CONTEXTUAL CORROBORATION
        contextual_evidence = 20.0
        mitre_matched = False
        ti_matched = False
        suspicious_cmd = False

        if mitre_mapping and mitre_mapping.get("technique_id") and mitre_mapping.get("technique_id") != "T1190":
            contextual_evidence += 30.0
            mitre_matched = True
            reasons.append(f"Context matches specific MITRE ATT&CK technique: {mitre_mapping.get('technique_id')}.")

        if threat_intelligence:
            rep = threat_intelligence.get("reputation", "unknown").lower()
            if rep in ("malicious", "suspicious"):
                contextual_evidence += 30.0
                ti_matched = True
                reasons.append(f"Threat intelligence flags source indicator as {rep} ({threat_intelligence.get('category')}).")
            elif rep == "clean":
                contextual_evidence += 15.0
                reasons.append("Threat intelligence registers the source indicator as a trusted internal zone.")
        
        # Check details for shell obfuscation / commands
        details = alert_data.get("details") or {}
        cmdline = (details.get("commandLine") or details.get("command_line") or "").lower()
        suspicious_keywords = ["encodedcommand", "powershell", "nsenter", "bash -i", "nc ", "cmd.exe"]
        if any(kw in cmdline for kw in suspicious_keywords):
            contextual_evidence += 20.0
            suspicious_cmd = True
            reasons.append("Forensic telemetry contains known obfuscation or shell execution keywords.")

        contextual_evidence = min(contextual_evidence, 100.0)
        if not (mitre_matched or ti_matched or suspicious_cmd):
            reasons.append("No independent threat intelligence or framework indicators corroborate this anomaly.")

        # 4. INPUT COMPLETENESS
        completeness_score = 0.0
        missing_fields = []
        if alert_data.get("source"):
            completeness_score += 20.0
        else:
            missing_fields.append("source")

        if alert_data.get("category"):
            completeness_score += 20.0
        else:
            missing_fields.append("category")

        if alert_data.get("type"):
            completeness_score += 20.0
        else:
            missing_fields.append("type")

        if details:
            completeness_score += 20.0
            if any(k in details for k in ("processPath", "process_path", "ipAddress", "ip_address")):
                completeness_score += 20.0
            else:
                missing_fields.append("details.identifiers")
        else:
            missing_fields.append("details")

        if missing_fields:
            reasons.append(f"Diagnostic telemetry is missing important fields ({', '.join(missing_fields)}), reducing evidence depth.")
        else:
            reasons.append("Complete forensic input payload provided for analysis.")

        # 5. FINAL SCORE
        score = (
            model_evidence * 0.35 +
            explanation_evidence * 0.20 +
            contextual_evidence * 0.25 +
            completeness_score * 0.20
        )
        score = round(max(0.0, min(score, 100.0)), 1)

        # Observable logging
        logger.info(
            "[Confidence]\n"
            f"Model Evidence       : {model_evidence:.1f}\n"
            f"Explanation Evidence : {explanation_evidence:.1f}\n"
            f"Context Evidence     : {contextual_evidence:.1f}\n"
            f"Input Completeness   : {completeness_score:.1f}\n"
            f"Final Confidence     : {score:.1f}"
        )

        return ConfidenceResult(
            score=score,
            model_evidence=model_evidence,
            explanation_evidence=explanation_evidence,
            contextual_evidence=contextual_evidence,
            input_completeness=completeness_score,
            reasons=reasons,
        )
