import logging
import os
import time

from google import genai
from dotenv import load_dotenv

from app.services.llm.fallback import FallbackAI
from app.services.context_builder import ContextBuilder
from app.services.llm.knowledge_pack import KnowledgePack
from app.services.llm.prompt import PromptBuilder
from app.services.llm.response_validator import ResponseValidator
from app.services.llm.citations import EvidenceCitationBuilder
from app.services.llm.routing.route import PromptRoute
from app.services.llm.behavioral_context import BehavioralReasoningContext

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

    @classmethod
    def _prepare_reasoning(
        cls,
        context_data: dict,
        analyst_question: str | None,
        route: PromptRoute,
    ) -> tuple[BehavioralReasoningContext, str, list]:
        """
        Shared behavioral reasoning preparation logic.
        Instantiates context, builds retrieval query, retrieves RAG documents,
        enriches knowledge doc and context data.
        """
        from app.services.llm.rag.query_builder import RetrievalQueryBuilder
        from app.services.llm.rag.retriever import KnowledgeRetriever

        # 1. Instantiate BehavioralReasoningContext
        behavioral_context = BehavioralReasoningContext.from_context(context_data)

        # 2. Generate standard KnowledgePack
        knowledge_doc = KnowledgePack.generate(context_data)

        # 3. Build query using RetrievalQueryBuilder
        query = RetrievalQueryBuilder.build(analyst_question, behavioral_context)

        # 4. Fetch RAG documents using query (or None if query is empty)
        retrieved_docs = []
        if query or not behavioral_context.is_behavioral:
            retrieved_docs = KnowledgeRetriever.retrieve(route, query)
        else:
            retrieved_docs = KnowledgeRetriever.retrieve(route, None)

        # 5. Enrich context_data for citations
        context_data["retrieved_documents"] = retrieved_docs

        # 6. Integrate retrieved documents into the knowledge doc
        if retrieved_docs:
            doc_blocks = []
            for doc in retrieved_docs:
                doc_blocks.append(
                    f"### Document: {doc.title} (Source: {doc.source or 'unknown'})\n"
                    f"Summary: {doc.summary}\n"
                    f"Content:\n{doc.content}"
                )
            integrated_text = "\n\n## Retrieved Reference Material\n" + "\n\n".join(doc_blocks)
            knowledge_doc = f"{knowledge_doc}\n\n{integrated_text}"

        return behavioral_context, knowledge_doc, retrieved_docs

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

            stage = "Behavioral Reasoning Prep"
            beh_ctx, knowledge_doc, retrieved_docs = cls._prepare_reasoning(
                context_data, analyst_question=None, route=PromptRoute.GENERAL
            )
            logger.info("[Reasoning Prep] ✓ Completed")

            stage = "Prompt Builder"
            prompt = PromptBuilder.summary(knowledge_doc, behavioral_context=beh_ctx)
            logger.info("[Prompt Builder] ✓ Prompt assembled")

            stage = "Gemini"
            raw_reply = cls._generate(prompt)

            # Append citations
            citations = EvidenceCitationBuilder.build(context_data)
            if citations:
                citation_lines = "\n".join(f"• {c}" for c in citations)
                raw_reply = f"{raw_reply}\n\nEvidence Used\n{citation_lines}"

            stage = "Response Validator"
            reply = ResponseValidator.validate_summary(raw_reply, knowledge_doc)
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

            reply = FallbackAI.generate_summary(
                alert_data,
                risk_score,
                severity,
                anomaly_score,
            )

            # Append citations in fallback
            try:
                if 'context_data' not in locals() or not context_data:
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
                citations = EvidenceCitationBuilder.build(context_data)
                if citations:
                    citation_lines = "\n".join(f"• {c}" for c in citations)
                    reply = f"{reply}\n\nEvidence Used\n{citation_lines}"
            except Exception:
                pass

            return reply

    ####################################################################
    # CHAT
    ####################################################################

    @classmethod
    def chat(cls, db, investigation_id: str | None, message: str, alert_id: str | None = None, history: list = None):
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

            stage = "Prompt Router"
            from app.services.llm.intent.classifier import IntentClassifier
            from app.services.llm.routing.router import PromptRouter

            intent_result = IntentClassifier().classify(message)
            route = PromptRouter().route(intent_result.intent)
            logger.info("[Prompt Router] ✓ Intent: %s -> Route: %s (Confidence: %.2f)", intent_result.intent.value, route.value, intent_result.confidence)

            stage = "Behavioral Reasoning Prep"
            beh_ctx, knowledge_doc, retrieved_docs = cls._prepare_reasoning(
                context_data, analyst_question=message, route=route
            )
            logger.info("[Reasoning Prep] ✓ Completed")

            stage = "Prompt Builder"
            prompt = PromptBuilder.chat(knowledge_doc, message, route, behavioral_context=beh_ctx)
            logger.info("[Prompt Builder] ✓ Prompt assembled")

            stage = "Gemini"
            raw_reply = cls._generate(prompt)

            # Append citations
            citations = EvidenceCitationBuilder.build(context_data)
            if citations:
                citation_lines = "\n".join(f"• {c}" for c in citations)
                raw_reply = f"{raw_reply}\n\nEvidence Used\n{citation_lines}"

            stage = "Response Validator"
            reply = ResponseValidator.validate_chat(raw_reply, knowledge_doc)
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

            if not investigation:
                investigation = {}
            
            timeline = []
            if 'context_data' in locals() and context_data and context_data.get("timeline"):
                timeline = context_data.get("timeline")

            reply = FallbackAI.generate_chat(
                investigation,
                timeline,
                message,
                history,
            )

            # Append citations in fallback
            try:
                if 'context_data' not in locals() or not context_data:
                    context_data = ContextBuilder.build(
                        db=db,
                        investigation_id=investigation_id,
                        alert_id=alert_id,
                        recent_message=message,
                        history=history,
                        current_page="chat"
                    )
                citations = EvidenceCitationBuilder.build(context_data)
                if citations:
                    citation_lines = "\n".join(f"• {c}" for c in citations)
                    reply = f"{reply}\n\nEvidence Used\n{citation_lines}"
            except Exception:
                pass

            return reply

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

            stage = "Behavioral Reasoning Prep"
            beh_ctx, knowledge_doc, retrieved_docs = cls._prepare_reasoning(
                context_data, analyst_question=None, route=PromptRoute.GENERAL
            )
            logger.info("[Reasoning Prep] ✓ Completed")

            stage = "Prompt Builder"
            prompt = PromptBuilder.report(knowledge_doc, behavioral_context=beh_ctx)
            logger.info("[Prompt Builder] ✓ Prompt assembled")

            stage = "Gemini"
            raw_reply = cls._generate(prompt)

            # Append citations
            citations = EvidenceCitationBuilder.build(context_data)
            if citations:
                citation_lines = "\n".join(f"• {c}" for c in citations)
                raw_reply = f"{raw_reply}\n\nEvidence Used\n{citation_lines}"

            stage = "Response Validator"
            reply = ResponseValidator.validate_report(raw_reply, knowledge_doc)
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

            fallback_inv = investigation if investigation is not None else {}

            timeline = [
                {
                    "timestamp": str(e_item.timestamp),
                    "actor": str(e_item.actor),
                    "title": e_item.title,
                    "description": e_item.description,
                }
                for e_item in timeline_events
            ]
            reply = FallbackAI.generate_report(
                fallback_inv,
                timeline,
            )

            # Append citations in fallback
            try:
                if 'context_data' not in locals() or not context_data:
                    context_data = ContextBuilder.build(
                        db=db,
                        alert_data=investigation.alert_json,
                        analysis_json=investigation.analysis_json,
                        risk_score=investigation.risk_score,
                        severity=str(investigation.severity),
                        timeline_events=timeline_events,
                        current_page="report"
                    )
                citations = EvidenceCitationBuilder.build(context_data)
                if citations:
                    citation_lines = "\n".join(f"• {c}" for c in citations)
                    reply = f"{reply}\n\nEvidence Used\n{citation_lines}"
            except Exception:
                pass

            return reply