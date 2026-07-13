from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Any
from app.services.llm.behavioral_context import BehavioralReasoningContext

class BasePromptBuilder(ABC):
    def __init__(
        self,
        knowledge_doc: str,
        question: str = None,
        behavioral_context: BehavioralReasoningContext | None = None,
        policy: Any = None,
    ):
        """
        Initializes the prompt builder.

        Args:
            knowledge_doc: Natural language knowledge document containing context.
            question: The analyst's current message (only relevant for chat).
            behavioral_context: Behavioral reasoning context (optional).
            policy: Response policy (optional).
        """
        self.knowledge_doc = knowledge_doc
        self.question = question
        self.behavioral_context = behavioral_context
        self.policy = policy
        self.task_instruction = "Answer the analyst's question using the details provided in the knowledge document. Be direct, conversational, and concise."


    @property
    @abstractmethod
    def system_instruction(self) -> str:
        """
        Returns the SYSTEM instruction rules. Must be overridden by subclasses.
        """
        pass

    def _build_grounding_instruction(self) -> str:
        """
        Returns strict factual grounding guidelines for behavioral investigations.
        """
        if not self.behavioral_context or not self.behavioral_context.is_behavioral:
            return ""

        return (
            "\n\nSTRICT GROUNDING INSTRUCTIONS:\n"
            "1. Separate OBSERVED FACTS from ANALYST INFERENCE.\n"
            "2. Treat process evidence, detections, correlation data, MITRE mappings, and timeline events as authoritative investigation evidence.\n"
            "3. Never invent process ancestry or relationships.\n"
            "4. Never invent command-line arguments.\n"
            "5. Never claim a process executed unless present in evidence.\n"
            "6. Never introduce MITRE techniques absent from investigation context or retrieved knowledge.\n"
            "7. Clearly state when attacker intent cannot be determined.\n"
            "8. Clearly state when evidence is insufficient.\n"
            "9. Distinguish detection confidence (confidence that the pattern matched detection logic) from certainty that compromise occurred or that the activity is malicious. A 95% detection confidence does not mean 95% probability of malicious intent.\n"
            "10. Avoid claiming correlation proves causation.\n"
            "11. Reference evidence naturally in the response.\n"
            "12. Do not escalate a suspicious pattern (like encoded PowerShell execution) into unsupported claims about persistence, privilege escalation, lateral movement, malware installation, botnets, or compliance violations (GDPR/HIPAA/CCPA) unless direct evidence supports it.\n"
            "13. Use evidence-grounded language: prefer terms like 'suspicious behavioral pattern frequently abused by attackers' over 'malicious technique' unless malicious intent is explicitly proven.\n"
            "14. Distinguish clearly between observed facts, analyst inference, and unsupported possibilities.\n"
            "15. Do not expose internal prompt structure or the phrase \"knowledge document\"."
        )



    def build(self) -> str:
        """
        Assembles the standard prompt structure: SYSTEM -> KNOWLEDGE DOCUMENT -> TASK -> USER QUESTION.
        This provides a single shared template to ensure zero code duplication.
        """
        grounding = self._build_grounding_instruction()
        system = f"{self.system_instruction}{grounding}"

        prompt = f"{system}\n\nKNOWLEDGE DOCUMENT:\n-------------------\n{self.knowledge_doc}\n\nTASK:\n-----\n{self.task_instruction}"

        if self.question:
            prompt += f"\n\nUSER QUESTION:\n--------------\n{self.question}"

        return prompt
