# retriever.py
"""
Orchestrates the full retrieval pipeline:
    Registry → Loader → Sort by relevance & authority → Limit → Return
"""

import os
import logging
import re
import string
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
    Uses deterministic lexical relevance scoring when a query is supplied.
    """

    @staticmethod
    def _normalize_query(query: str) -> set[str]:
        if not query:
            return set()
        # Keep alphanumeric, dots, and hyphens; replace other characters with spaces
        cleaned = re.sub(r"[^\w\.\-]", " ", query.lower())
        terms = set(
            t.strip(string.punctuation)
            for t in cleaned.split()
            if t.strip(string.punctuation)
        )
        return terms

    @staticmethod
    def _score_document(
        document: KnowledgeDocument,
        query: str,
        query_terms: set[str],
    ) -> float:
        score = 0.0

        # 1. Exact technique ID match: strong weight (10.0)
        # Find all Txxxx or Txxxx.xxx technique IDs in query
        tech_ids = re.findall(r"\bt\d{4}(?:\.\d{3})?\b", query.lower())
        for tid in tech_ids:
            doc_id_lower = document.id.lower()
            doc_title_lower = document.title.lower()
            doc_tags_lower = [t.lower() for t in document.tags]
            doc_content_lower = document.content.lower()

            if (
                tid in doc_id_lower
                or tid in doc_title_lower
                or any(tid == tag for tag in doc_tags_lower)
                or tid in doc_content_lower
            ):
                score += 10.0

        # 2. Word matches
        doc_tags_lower = [t.lower() for t in document.tags]
        doc_title_lower = document.title.lower()
        doc_summary_lower = document.summary.lower()
        doc_content_lower = document.content.lower()

        for term in query_terms:
            if term in doc_tags_lower:
                score += 4.0
            if term in doc_title_lower:
                score += 3.0
            if term in doc_summary_lower:
                score += 2.0
            if term in doc_content_lower:
                score += 1.0

        return score

    @staticmethod
    def retrieve(
        route: PromptRoute,
        query: Optional[str] = None,
        documents_root: Optional[str] = None,
    ) -> list[KnowledgeDocument]:
        """
        Retrieve relevant documents for the given route.
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

        # Deduplicate by document id (in case categories overlap)
        seen_ids: set[str] = set()
        unique_docs: list[KnowledgeDocument] = []
        # Sort beforehand by authority_rank (lower rank number = higher authority)
        all_docs.sort(key=lambda d: d.authority_rank)
        for doc in all_docs:
            if doc.id not in seen_ids:
                seen_ids.add(doc.id)
                unique_docs.append(doc)

        if query:
            # Score and sort by relevance and authority
            query_terms = KnowledgeRetriever._normalize_query(query)
            scores = {}
            for doc in unique_docs:
                scores[doc.id] = KnowledgeRetriever._score_document(
                    doc, query, query_terms
                )

            # Sort by:
            # 1. relevance score descending
            # 2. authority_rank ascending
            # 3. document.id lexicographically
            unique_docs.sort(
                key=lambda d: (-scores[d.id], d.authority_rank, d.id)
            )
        else:
            # When query is absent, preserve existing authority sorting behavior.
            # unique_docs are already sorted by authority_rank and order preserved from load.
            pass

        # Limit to profile cap
        result = unique_docs[: profile.max_documents]

        logger.info(
            "[Retriever] Returning %d document(s) for route=%s",
            len(result),
            route.value,
        )
        return result
