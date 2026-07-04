import logging
import os

from google import genai

from app.services.llm.fallback import FallbackAI
from app.services.llm.prompts import (
    SUMMARY_PROMPT_TEMPLATE,
    CHAT_PROMPT_TEMPLATE,
    REPORT_PROMPT_TEMPLATE,
)
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("darkvector.llm")

USE_LLM = os.getenv("USE_LLM", "false").strip().lower() == "true"
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()


print("=" * 60)
print("LLM Enabled :", USE_LLM)
print("API Key     :", "Loaded" if GEMINI_API_KEY else "Missing")
print("=" * 60)


class LLMService:
    _client = None

    @classmethod
    def _is_enabled(cls) -> bool:
        return USE_LLM and bool(GEMINI_API_KEY)

    @classmethod
    def _get_client(cls):
        if cls._client is None:
            cls._client = genai.Client(api_key=GEMINI_API_KEY)
        return cls._client

    @classmethod
    def _generate(cls, prompt: str) -> str:
        """
        Calls Gemini.
        Raises Exception if anything goes wrong.
        """

        if not cls._is_enabled():
            raise RuntimeError("LLM disabled")

        try:
            client = cls._get_client()

            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
            )

            text = getattr(response, "text", None)

            if not text:
                raise RuntimeError("Gemini returned empty response.")

            print("✅ USING GEMINI")

            return text.strip()

        except Exception as e:
            logger.exception("Gemini request failed")
            raise e

    ####################################################################
    # SUMMARY
    ####################################################################

    @classmethod
    def generate_summary(
        cls,
        alert_data,
        risk_score,
        severity,
        anomaly_score,
        mitre_mapping=None,
        threat_intelligence=None,
        timeline_events=None,
    ):

        prompt = SUMMARY_PROMPT_TEMPLATE.format(
            alert=alert_data,
            risk_score=risk_score,
            severity=severity,
            anomaly_score=anomaly_score,
            mitre_mapping=mitre_mapping or {},
            threat_intelligence=threat_intelligence or {},
            timeline_events=timeline_events or [],
        )

        try:
            return cls._generate(prompt)

        except Exception:
            print("⚠️ USING FALLBACK (SUMMARY)")

            return FallbackAI.generate_summary(
                alert_data,
                risk_score,
                severity,
                anomaly_score,
            )

    ####################################################################
    # CHAT
    ####################################################################

    @classmethod
    def chat(cls, db, investigation_id: str, message: str):

        from app.services.investigation_service import InvestigationService
        from app.repositories.timeline_repository import TimelineRepository

        investigation = InvestigationService.get_investigation(
            db,
            investigation_id,
        )

        if not investigation:
            return "Investigation not found."

        timeline_repo = TimelineRepository(db)

        timeline_events = timeline_repo.list_for_investigation(
            investigation_id
        )

        timeline = [
            {
                "timestamp": str(e.timestamp),
                "actor": str(e.actor),
                "title": e.title,
                "description": e.description,
            }
            for e in timeline_events
        ]

        analysis = investigation.analysis_json or {}

        context = analysis.get("context", {})

        prompt = CHAT_PROMPT_TEMPLATE.format(
            investigation={
                "investigation_id": investigation.investigation_id,
                "title": investigation.title,
                "severity": str(investigation.severity),
                "status": str(investigation.status),
                "risk_score": investigation.risk_score,
                "alert": investigation.alert_json,
            },
            mitre=context.get("mitre", {}),
            threat_intelligence=context.get(
                "threat_intelligence",
                {},
            ),
            timeline=timeline,
            question=message,
        )

        try:
            return cls._generate(prompt)

        except Exception:
            print("⚠️ USING FALLBACK (CHAT)")

            return FallbackAI.generate_chat(
                investigation,
                timeline,
                message,
            )

    ####################################################################
    # REPORT
    ####################################################################

    @classmethod
    def generate_report(
        cls,
        db,
        investigation,
        timeline_events,
    ):

        timeline = [
            {
                "timestamp": str(e.timestamp),
                "actor": str(e.actor),
                "title": e.title,
                "description": e.description,
            }
            for e in timeline_events
        ]

        analysis = investigation.analysis_json or {}

        context = analysis.get("context", {})

        prompt = REPORT_PROMPT_TEMPLATE.format(
            investigation={
                "investigation_id": investigation.investigation_id,
                "title": investigation.title,
                "severity": str(investigation.severity),
                "status": str(investigation.status),
                "risk_score": investigation.risk_score,
                "alert": investigation.alert_json,
            },
            mitre=context.get("mitre", {}),
            threat_intelligence=context.get(
                "threat_intelligence",
                {},
            ),
            timeline=timeline,
        )

        try:
            return cls._generate(prompt)

        except Exception:
            print("⚠️ USING FALLBACK (REPORT)")

            return FallbackAI.generate_report(
                investigation,
                timeline,
            )