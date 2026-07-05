# base.py

from abc import ABC, abstractmethod

class BasePromptBuilder(ABC):
    def __init__(self, knowledge_doc: str, question: str = None):
        """
        Initializes the prompt builder.
        
        Args:
            knowledge_doc: Natural language knowledge document containing context.
            question: The analyst's current message (only relevant for chat).
        """
        self.knowledge_doc = knowledge_doc
        self.question = question
        self.task_instruction = "Answer the analyst's question using the details provided in the knowledge document. Be direct, conversational, and concise."

    @property
    @abstractmethod
    def system_instruction(self) -> str:
        """
        Returns the SYSTEM instruction rules. Must be overridden by subclasses.
        """
        pass

    def build(self) -> str:
        """
        Assembles the standard prompt structure: SYSTEM -> KNOWLEDGE DOCUMENT -> TASK -> USER QUESTION.
        This provides a single shared template to ensure zero code duplication.
        """
        prompt = f"{self.system_instruction}\n\nKNOWLEDGE DOCUMENT:\n-------------------\n{self.knowledge_doc}\n\nTASK:\n-----\n{self.task_instruction}"
        
        if self.question:
            prompt += f"\n\nUSER QUESTION:\n--------------\n{self.question}"
            
        return prompt
