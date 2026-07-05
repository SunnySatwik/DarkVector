import re

from .intent import Intent, IntentResult
from .keywords import (
    EXPLAIN_ATTACK_KEYWORDS,
    RISK_KEYWORDS,
    REMEDIATION_KEYWORDS,
    MITRE_KEYWORDS,
    TIMELINE_KEYWORDS,
    EVIDENCE_KEYWORDS,
)


class IntentClassifier:
    """
    Deterministic intent classifier for the AI Context Engine.

    Determines what the analyst is asking without using an LLM.
    """
    INTENT_KEYWORDS = {
        Intent.EXPLAIN_ATTACK: EXPLAIN_ATTACK_KEYWORDS,
        Intent.RISK_ANALYSIS: RISK_KEYWORDS,
        Intent.REMEDIATION: REMEDIATION_KEYWORDS,
        Intent.MITRE: MITRE_KEYWORDS,
        Intent.TIMELINE: TIMELINE_KEYWORDS,
        Intent.EVIDENCE: EVIDENCE_KEYWORDS,
    }
    def _normalize(self, text: str) -> str:
        """
        Normalize text for keyword matching.

        - Lowercase
        - Remove punctuation
        - Collapse multiple spaces
        """

        text = text.lower()
        text = re.sub(r"[^\w\s]", " ", text)
        text = re.sub(r"\s+", " ", text).strip()
        return text

    def _score_keywords(
    self,
    text: str,
    keywords: list[str],
) -> tuple[int, list[str]]:
        """
        Count keyword matches for an intent.

        Returns:
            (score, matched_keywords)
        """

        score = 0
        matched = []

        for keyword in keywords:
            if keyword.lower() in text:
                score += 1
                matched.append(keyword)

        return score, matched

    def classify(self, question: str) -> IntentResult:
        """
        Classify a user question into an investigation intent.
        """

        normalized = self._normalize(question)

        best_intent = Intent.GENERAL
        best_score = 0
        best_matches = []

        total_score = 0

        for intent, keywords in self.INTENT_KEYWORDS.items():
            score, matches = self._score_keywords(normalized, keywords)

            total_score += score

            if score > best_score:
                best_score = score
                best_intent = intent
                best_matches = matches
        if best_score == 0:
            return IntentResult(
                intent=Intent.GENERAL,
                confidence=0.50,
                matched_keywords=[],
            )
        confidence = best_score / max(total_score, 1)

        # Clamp confidence between 0.50 and 1.00
        confidence = max(0.50, min(confidence, 1.00))

        return IntentResult(
            intent=best_intent,
            confidence=round(confidence, 2),
            matched_keywords=best_matches,
        )