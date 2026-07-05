# retriever.py
"""
Orchestrates the full retrieval pipeline:
    Registry → Loader → Sort by authority → Limit → Return

Future ChromaDB integration replaces only this file.
The query parameter is accepted now so the interface is stable
when semantic search is added.
"""

import os
import logging
from typing import Optional

from app.services.llm.routing.route import PromptRoute
from app.services.llm.rag.models import KnowledgeDocument
from app.services.llm.rag.loader import MarkdownLoader
from app.services.llm.rag.registry import KnowledgeRegistry, RetrievalProfile

logger = logging.getLogger("darkvector.rag.retriever")

# Default location of the documents folder, relative to this file.
_DEFAULT_DOCUMENTS_ROOT = os.path.join(os.path.dirname(__file__), "documents")


class KnowledgeRetriever:
    """
    Retrieves relevant KnowledgeDocument objects for a given PromptRoute.

    Pipeline
    --------
    1. Resolve RetrievalProfile from KnowledgeRegistry.
    2. Load documents from each category directory via MarkdownLoader.
    3. Sort by authority rank (official → internal → community).
    4. Limit to profile.max_documents.
    5. Return the list.

    Future
    ------
    When ChromaDB is integrated, step 2-3 will be replaced by a vector
    similarity search using the ``query`` parameter. All other steps remain.
    """

    @staticmethod
    def retrieve(
        route: PromptRoute,
        query: Optional[str] = None,
        documents_root: Optional[str] = None,
    ) -> list[KnowledgeDocument]:
        """
        Retrieve relevant documents for the given route.

        Parameters
        ----------
        route          : PromptRoute
            The intent-resolved route determining which categories to search.
        query          : str, optional
            Natural language query string. Accepted for future ChromaDB
            integration but not used by the current keyword loader.
        documents_root : str, optional
            Override the documents folder path. Defaults to the ``documents/``
            directory co-located with this module.

        Returns
        -------
        list[KnowledgeDocument]
            Authority-ranked, count-limited documents for the route.
        """
        root = documents_root or _DEFAULT_DOCUMENTS_ROOT
        profile: RetrievalProfile = KnowledgeRegistry.get_profile(route)

        logger.info(
            "[Retriever] Route=%s  categories=%s  max=%d",
            route.value,
            profile.categories,
            profile.max_documents,
        )

        # Load documents from every relevant category directory
        all_docs: list[KnowledgeDocument] = []
        for category in profile.categories:
            category_path = os.path.join(root, category)
            docs = MarkdownLoader.load_directory(category_path)
            all_docs.extend(docs)

        if not all_docs:
            logger.info("[Retriever] No documents found for route=%s", route.value)
            return []

        # Sort by authority rank (lower number = higher authority)
        all_docs.sort(key=lambda d: d.authority_rank)

        # Deduplicate by document id (in case categories overlap)
        seen_ids: set[str] = set()
        unique_docs: list[KnowledgeDocument] = []
        for doc in all_docs:
            if doc.id not in seen_ids:
                seen_ids.add(doc.id)
                unique_docs.append(doc)

        # Limit to profile cap
        result = unique_docs[: profile.max_documents]

        logger.info(
            "[Retriever] Returning %d document(s) for route=%s",
            len(result),
            route.value,
        )
        return result
