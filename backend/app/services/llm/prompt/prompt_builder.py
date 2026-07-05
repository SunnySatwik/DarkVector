# prompt_builder.py

from app.services.llm.routing.route import PromptRoute
from .builders.general import GeneralPromptBuilder
from .builders.explain_attack import ExplainAttackPromptBuilder
from .builders.risk_analysis import RiskAnalysisPromptBuilder
from .builders.remediation import RemediationPromptBuilder
from .builders.mitre import MitrePromptBuilder
from .builders.timeline import TimelinePromptBuilder
from .builders.evidence import EvidencePromptBuilder

class PromptBuilder:
    @staticmethod
    def chat(knowledge_doc: str, question: str, route: PromptRoute = PromptRoute.GENERAL) -> str:
        """
        Instantiates the correct specialized builder class based on the given PromptRoute,
        calls build() on it, and returns the assembled prompt.
        """
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
        builder_inst = builder_cls(knowledge_doc, question)
        return builder_inst.build()

    @staticmethod
    def summary(knowledge_doc: str) -> str:
        """
        Generates the standard summary prompt by reusing GeneralPromptBuilder
        and applying specific summary task instructions.
        """
        builder = GeneralPromptBuilder(knowledge_doc)
        builder.task_instruction = (
            "Write a concise investigation summary of maximum 250 words structured with three clear paragraphs:\n"
            "1. What happened: Summarize the alert source, type, and specific anomalous behavior observed.\n"
            "2. Why it matters: Explain the security implications of this anomaly and why it is a risk.\n"
            "3. Recommended next steps: Outline specific, actionable containment or investigation recommendations."
        )
        return builder.build()

    @staticmethod
    def report(knowledge_doc: str) -> str:
        """
        Generates the standard report prompt by reusing GeneralPromptBuilder
        and applying specific report task instructions.
        """
        builder = GeneralPromptBuilder(knowledge_doc)
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
