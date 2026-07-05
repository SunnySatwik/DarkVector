import logging
import os

from google import genai

from app.services.llm.fallback import FallbackAI
from app.services.context_builder import ContextBuilder
from app.services.llm.knowledge_pack import KnowledgePack
from app.services.llm.prompt_builder import PromptBuilder
from app.services.llm.response_validator import ResponseValidator
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

            logger.info("[Gemini] ✓ Response generated")

            return text.strip()

        except Exception as e:
            logger.exception("[Gemini] Request failed")
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
        db=None,
    ):
        import time
        start_time = time.perf_counter()
        stage = "Initialization"
        logger.info("[Pipeline] Summary generation pipeline started")

        try:
            stage = "Context Builder"
            context_data = ContextBuilder.build(
                db=db,
                alert_data=alert_data,
                risk_score=risk_score,
                severity=severity,
                anomaly_score=anomaly_score,
                mitre_mapping=mitre_mapping,
                threat_intelligence=threat_intelligence,
                timeline_events=timeline_events,
                current_page="analysis"
            )
            logger.info("[Context Builder] ✓ Context built")

            stage = "Knowledge Pack"
            knowledge_doc = KnowledgePack.generate(context_data)
            logger.info("[Knowledge Pack] ✓ Generated")
            if logger.isEnabledFor(logging.DEBUG):
                logger.debug("\n========== KNOWLEDGE PACK ==========\n%s\n===================================", knowledge_doc)

            stage = "Prompt Builder"
            prompt = PromptBuilder.summary(knowledge_doc)
            logger.info("[Prompt Builder] ✓ Prompt assembled")
            if logger.isEnabledFor(logging.DEBUG):
                logger.debug("\n========== PROMPT ==========\n%s\n============================", prompt)

            stage = "Gemini"
            raw_reply = cls._generate(prompt)

            stage = "Response Validator"
            reply = ResponseValidator.validate_summary(raw_reply)
            logger.info("[Validator] ✓ Passed")

            # Timing and Metrics Logging
            kb_len = len(knowledge_doc)
            prompt_len = len(prompt)
            reply_len = len(reply)
            pipeline_time = round((time.perf_counter() - start_time) * 1000)

            logger.info("[Pipeline] Knowledge Pack : %d chars", kb_len)
            logger.info("[Pipeline] Prompt         : %d chars", prompt_len)
            logger.info("[Pipeline] Gemini Reply   : %d chars", reply_len)
            logger.info("[Pipeline] Pipeline Time  : %d ms", pipeline_time)

            return reply

        except Exception as e:
            logger.exception("Summary pipeline failed: [%s] stage failed: %s", stage, str(e))
            logger.info("[Pipeline] Using Fallback AI for summary")

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
    def chat(cls, db, investigation_id: str | None, message: str, alert_id: str | None = None, history: list = None):
        import time
        start_time = time.perf_counter()
        stage = "Initialization"
        logger.info("[Pipeline] Chat response pipeline started")

        try:
            stage = "Context Builder"
            context_data = ContextBuilder.build(
                db=db,
                investigation_id=investigation_id,
                alert_id=alert_id,
                recent_message=message,
                history=history,
                current_page="chat"
            )
            logger.info("[Context Builder] ✓ Context built")

            # Check if investigation metadata was found; if not, return early
            if not context_data.get("investigation"):
                logger.info("[Context Builder] Investigation not found in database; aborting pipeline")
                return "Investigation not found."

            stage = "Knowledge Pack"
            knowledge_doc = KnowledgePack.generate(context_data)
            logger.info("[Knowledge Pack] ✓ Generated")
            if logger.isEnabledFor(logging.DEBUG):
                logger.debug("\n========== KNOWLEDGE PACK ==========\n%s\n===================================", knowledge_doc)

            stage = "Prompt Builder"
            prompt = PromptBuilder.chat(knowledge_doc, message)
            logger.info("[Prompt Builder] ✓ Prompt assembled")
            if logger.isEnabledFor(logging.DEBUG):
                logger.debug("\n========== PROMPT ==========\n%s\n============================", prompt)

            stage = "Gemini"
            raw_reply = cls._generate(prompt)

            stage = "Response Validator"
            reply = ResponseValidator.validate_chat(raw_reply)
            logger.info("[Validator] ✓ Passed")

            # Timing and Metrics Logging
            kb_len = len(knowledge_doc)
            prompt_len = len(prompt)
            reply_len = len(reply)
            pipeline_time = round((time.perf_counter() - start_time) * 1000)

            logger.info("[Pipeline] Knowledge Pack : %d chars", kb_len)
            logger.info("[Pipeline] Prompt         : %d chars", prompt_len)
            logger.info("[Pipeline] Gemini Reply   : %d chars", reply_len)
            logger.info("[Pipeline] Pipeline Time  : %d ms", pipeline_time)

            return reply

        except Exception as e:
            logger.exception("Chat pipeline failed: [%s] stage failed: %s", stage, str(e))
            logger.info("[Pipeline] Using Fallback AI for chat")

            from app.services.investigation_service import InvestigationService
            from app.repositories.investigation_repository import InvestigationRepository
            
            investigation = None
            if db:
                if investigation_id:
                    investigation = InvestigationService.get_investigation(db, investigation_id)
                if not investigation and alert_id:
                    investigation = InvestigationRepository.get_by_alert_id(db, alert_id)
            
            timeline = []
            if context_data and context_data.get("timeline"):
                timeline = context_data.get("timeline")

            return FallbackAI.generate_chat(
                investigation,
                timeline,
                message,
                history,
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
        import time
        start_time = time.perf_counter()
        stage = "Initialization"
        logger.info("[Pipeline] Report generation pipeline started")

        try:
            stage = "Context Builder"
            context_data = ContextBuilder.build(
                db=db,
                alert_data=investigation.alert_json,
                analysis_json=investigation.analysis_json,
                risk_score=investigation.risk_score,
                severity=str(investigation.severity),
                timeline_events=timeline_events,
                current_page="report"
            )
            logger.info("[Context Builder] ✓ Context built")

            stage = "Knowledge Pack"
            knowledge_doc = KnowledgePack.generate(context_data)
            logger.info("[Knowledge Pack] ✓ Generated")
            if logger.isEnabledFor(logging.DEBUG):
                logger.debug("\n========== KNOWLEDGE PACK ==========\n%s\n===================================", knowledge_doc)

            stage = "Prompt Builder"
            prompt = PromptBuilder.report(knowledge_doc)
            logger.info("[Prompt Builder] ✓ Prompt assembled")
            if logger.isEnabledFor(logging.DEBUG):
                logger.debug("\n========== PROMPT ==========\n%s\n============================", prompt)

            stage = "Gemini"
            raw_reply = cls._generate(prompt)

            stage = "Response Validator"
            reply = ResponseValidator.validate_report(raw_reply)
            logger.info("[Validator] ✓ Passed")

            # Timing and Metrics Logging
            kb_len = len(knowledge_doc)
            prompt_len = len(prompt)
            reply_len = len(reply)
            pipeline_time = round((time.perf_counter() - start_time) * 1000)

            logger.info("[Pipeline] Knowledge Pack : %d chars", kb_len)
            logger.info("[Pipeline] Prompt         : %d chars", prompt_len)
            logger.info("[Pipeline] Gemini Reply   : %d chars", reply_len)
            logger.info("[Pipeline] Pipeline Time  : %d ms", pipeline_time)

            return reply

        except Exception as e:
            logger.exception("Report pipeline failed: [%s] stage failed: %s", stage, str(e))
            logger.info("[Pipeline] Using Fallback AI for report")

            timeline = [
                {
                    "timestamp": str(e_item.timestamp),
                    "actor": str(e_item.actor),
                    "title": e_item.title,
                    "description": e_item.description,
                }
                for e_item in timeline_events
            ]
            return FallbackAI.generate_report(
                investigation,
                timeline,
            )