# prompt_builder.py

from typing import Any
from app.services.llm.routing.route import PromptRoute

from app.services.llm.behavioral_context import BehavioralReasoningContext
from .builders.general import GeneralPromptBuilder
from .builders.explain_attack import ExplainAttackPromptBuilder
from .builders.risk_analysis import RiskAnalysisPromptBuilder
from .builders.remediation import RemediationPromptBuilder
from .builders.mitre import MitrePromptBuilder
from .builders.timeline import TimelinePromptBuilder
from .builders.evidence import EvidencePromptBuilder


class PromptBuilder:
    @staticmethod
    def chat(
        knowledge_doc: str,
        question: str,
        route: PromptRoute = PromptRoute.GENERAL,
        behavioral_context: BehavioralReasoningContext | None = None,
        policy: Any = None,
    ) -> str:
        """
        Instantiates the correct specialized builder class based on the given PromptRoute,
        calls build() on it, and returns the assembled prompt.
        """
        from typing import Any
        builders = {
            PromptRoute.GENERAL: GeneralPromptBuilder,
            PromptRoute.EXPLAIN_ATTACK: ExplainAttackPromptBuilder,
            PromptRoute.RISK_ANALYSIS: RiskAnalysisPromptBuilder,
            PromptRoute.REMEDIATION: RemediationPromptBuilder,
            PromptRoute.MITRE: MitrePromptBuilder,
            PromptRoute.TIMELINE: TimelinePromptBuilder,
            PromptRoute.EVIDENCE: EvidencePromptBuilder,
        }

        builder_cls = builders.get(route, GeneralPromptBuilder)
        builder_inst = builder_cls(
            knowledge_doc, question, behavioral_context=behavioral_context, policy=policy
        )
        return builder_inst.build()


    @staticmethod
    def summary(
        knowledge_doc: str,
        behavioral_context: BehavioralReasoningContext | None = None,
    ) -> str:
        """
        Generates the standard summary prompt by reusing GeneralPromptBuilder
        and applying specific summary task instructions.
        """
        builder = GeneralPromptBuilder(
            knowledge_doc, behavioral_context=behavioral_context
        )

        if behavioral_context and behavioral_context.is_behavioral:
            builder.task_instruction = (
                "Write a concise investigation summary of maximum 250 words describing:\n"
                "- What was detected and how the detections are related.\n"
                "- Important process execution evidence and the MITRE ATT&CK interpretation.\n"
                "- Why the behavior matters, any evidence limitations, and recommended analyst next actions."
            )
        else:
            builder.task_instruction = (
                "Write a concise investigation summary of maximum 250 words structured with three clear paragraphs:\n"
                "1. What happened: Summarize the alert source, type, and specific anomalous behavior observed.\n"
                "2. Why it matters: Explain the security implications of this anomaly and why it is a risk.\n"
                "3. Recommended next steps: Outline specific, actionable containment or investigation recommendations."
            )

        return builder.build()

    @staticmethod
    def report(
        knowledge_doc: str,
        behavioral_context: BehavioralReasoningContext | None = None,
    ) -> str:
        """
        Generates the standard report prompt by reusing GeneralPromptBuilder
        and applying specific report task instructions.
        """
        builder = GeneralPromptBuilder(
            knowledge_doc, behavioral_context=behavioral_context
        )

        if behavioral_context and behavioral_context.is_behavioral:
            builder.task_instruction = (
                "Generate a comprehensive markdown report with the following specific sections:\n"
                "### Executive Summary\n"
                "A high-level first-person summary of the correlated incident and final status in a natural senior SOC analyst voice.\n\n"
                "### Detection & Correlation Findings\n"
                "Details of the correlated detections, correlation group ID, host, aggregate severity, and how they relate.\n\n"
                "### Process Execution Analysis\n"
                "Analysis of the involved process execution chain and evidence from the execution tree.\n\n"
                "### MITRE ATT&CK Assessment\n"
                "Evaluation of all matched MITRE ATT&CK technique IDs and tactics, and framework alignment.\n\n"
                "### Evidence Assessment\n"
                "Strengths and weaknesses of the observed telemetry evidence.\n\n"
                "### Analyst Recommendations\n"
                "Actionable containment, remediation, and hardening recommendations.\n\n"
                "### Investigation Limitations\n"
                "Explicit limitations in the available evidence and potential gaps in visibility."
            )
        else:
            builder.task_instruction = (
                "Generate a comprehensive markdown report with the following specific sections:\n"
                "### Executive Summary\n"
                "A high-level first-person summary of the incident, detection, and final status using a natural, non-robotic senior SOC analyst voice.\n\n"
                "### Technical Findings\n"
                "Details of the affected host, specific anomalous features observed, and mapped MITRE ATT&CK technique.\n\n"
                "### Business Impact\n"
                "The potential impact on business operations, data security, and compliance if this anomaly were left uncontained.\n\n"
                "### Recommendations\n"
                "Actionable security recommendations and mitigation playbook directives."
            )

        return builder.build()
