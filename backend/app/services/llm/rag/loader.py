# loader.py
"""
Reads markdown files from the filesystem, delegates parsing to DocumentParser,
and caches results in memory so the filesystem is read only once per process.
"""

import os
import logging
from typing import Optional

from app.services.llm.rag.models import KnowledgeDocument
from app.services.llm.rag.parser import DocumentParser

logger = logging.getLogger("darkvector.rag.loader")


class MarkdownLoader:
    """
    Filesystem loader for markdown knowledge documents.

    All loaded documents are stored in a class-level cache keyed by their
    absolute file path, so repeated calls to load_document() or
    load_directory() for the same path incur no additional I/O.
    """

    _cache: dict[str, KnowledgeDocument] = {}

    @classmethod
    def load_document(cls, path: str) -> Optional[KnowledgeDocument]:
        """
        Load and parse a single markdown file, returning a KnowledgeDocument.
        Returns None (and logs a warning) if the file does not exist.

        Parameters
        ----------
        path : str
            Absolute or relative path to a ``.md`` file.
        """
        abs_path = os.path.abspath(path)

        if abs_path in cls._cache:
            logger.debug("[Loader] Cache hit: %s", abs_path)
            return cls._cache[abs_path]

        if not os.path.isfile(abs_path):
            logger.warning("[Loader] Document not found: %s", abs_path)
            return None

        doc = DocumentParser.parse(abs_path)
        cls._cache[abs_path] = doc
        logger.debug("[Loader] Loaded and cached: %s", abs_path)
        return doc

    @classmethod
    def load_directory(cls, path: str) -> list[KnowledgeDocument]:
        """
        Recursively load all ``.md`` files in the given directory.
        Silently skips non-existent directories.

        Parameters
        ----------
        path : str
            Absolute or relative path to a directory.

        Returns
        -------
        list[KnowledgeDocument]
            All successfully parsed documents in the directory.
        """
        abs_path = os.path.abspath(path)

        if not os.path.isdir(abs_path):
            logger.debug("[Loader] Directory not found, skipping: %s", abs_path)
            return []

        docs = []
        for root, _, files in os.walk(abs_path):
            for filename in sorted(files):  # sorted for deterministic ordering
                if filename.endswith(".md"):
                    doc = cls.load_document(os.path.join(root, filename))
                    if doc:
                        docs.append(doc)

        logger.info("[Loader] Loaded %d document(s) from %s", len(docs), abs_path)
        return docs

    @classmethod
    def clear_cache(cls) -> None:
        """
        Clears the in-memory document cache.
        Useful in tests or when documents change on disk.
        """
        cls._cache.clear()
        logger.debug("[Loader] Cache cleared")
