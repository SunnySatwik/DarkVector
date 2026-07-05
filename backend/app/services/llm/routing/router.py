from .route import PromptRoute
from ..intent.intent import Intent


class PromptRouter:
    """
    Maps classified user intents to the appropriate prompt route.

    This layer intentionally contains no AI logic, prompt generation,
    or investigation context. Its sole responsibility is translating
    an Intent into the corresponding PromptRoute.
    """

    ROUTES = {
        Intent.GENERAL: PromptRoute.GENERAL,
        Intent.EXPLAIN_ATTACK: PromptRoute.EXPLAIN_ATTACK,
        Intent.RISK_ANALYSIS: PromptRoute.RISK_ANALYSIS,
        Intent.REMEDIATION: PromptRoute.REMEDIATION,
        Intent.MITRE: PromptRoute.MITRE,
        Intent.TIMELINE: PromptRoute.TIMELINE,
        Intent.EVIDENCE: PromptRoute.EVIDENCE,
    }

    def route(self, intent: Intent) -> PromptRoute:
        """
        Resolve the prompt route for a classified intent.

        Args:
            intent: Classified user intent.

        Returns:
            PromptRoute corresponding to the intent.
        """
        return self.ROUTES.get(intent, PromptRoute.GENERAL)