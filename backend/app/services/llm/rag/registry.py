# registry.py
"""
Maps each PromptRoute to a RetrievalProfile describing which knowledge
categories to retrieve, how many documents to return, and the routing priority.
"""

from dataclasses import dataclass
from app.services.llm.routing.route import PromptRoute


@dataclass
class RetrievalProfile:
    """
    Describes the retrieval behaviour for a specific PromptRoute.

    Fields
    ------
    categories    : list[str]  Knowledge category folder names to search.
    max_documents : int        Maximum number of documents to return.
    priority      : int        Route priority — lower = more specific/important.
    """
    categories: list[str]
    max_documents: int
    priority: int


# Sentinel for "all known categories"
_ALL_CATEGORIES = ["mitre", "playbooks", "cis", "owasp", "procedures"]


_REGISTRY: dict[PromptRoute, RetrievalProfile] = {
    PromptRoute.MITRE: RetrievalProfile(
        categories=["mitre"],
        max_documents=3,
        priority=1,
    ),
    PromptRoute.EXPLAIN_ATTACK: RetrievalProfile(
        categories=["mitre", "playbooks"],
        max_documents=4,
        priority=1,
    ),
    PromptRoute.REMEDIATION: RetrievalProfile(
        categories=["playbooks", "cis"],
        max_documents=5,
        priority=2,
    ),
    PromptRoute.RISK_ANALYSIS: RetrievalProfile(
        categories=["cis", "owasp"],
        max_documents=4,
        priority=2,
    ),
    PromptRoute.EVIDENCE: RetrievalProfile(
        categories=["procedures", "cis"],
        max_documents=4,
        priority=2,
    ),
    PromptRoute.TIMELINE: RetrievalProfile(
        categories=["procedures"],
        max_documents=3,
        priority=3,
    ),
    PromptRoute.GENERAL: RetrievalProfile(
        categories=_ALL_CATEGORIES,
        max_documents=8,
        priority=3,
    ),
}


class KnowledgeRegistry:
    """
    Resolves a PromptRoute to its RetrievalProfile.
    Falls back to the GENERAL profile for any unmapped route.
    """

    @staticmethod
    def get_profile(route: PromptRoute) -> RetrievalProfile:
        """
        Return the RetrievalProfile for the given route.
        Falls back to GENERAL if the route is not explicitly mapped.
        """
        return _REGISTRY.get(route, _REGISTRY[PromptRoute.GENERAL])

    @staticmethod
    def all_categories() -> list[str]:
        """Return all known knowledge category names."""
        return list(_ALL_CATEGORIES)
