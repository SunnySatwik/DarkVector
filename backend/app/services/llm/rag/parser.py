# parser.py
"""
Parses YAML front matter from markdown documents and hydrates KnowledgeDocument objects.

Document format expected:

    ---
    id: T1059
    title: Command and Scripting Interpreter
    category: mitre
    tags:
      - powershell
      - execution
    summary: Execution through PowerShell.
    authority: official
    source: MITRE ATT&CK
    ---

    # Body text begins here...
"""

import os
import re
import logging

from app.services.llm.rag.models import KnowledgeDocument

logger = logging.getLogger("darkvector.rag.parser")

# Regex to extract the YAML block between the opening and closing --- delimiters.
_FRONT_MATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)


def _parse_yaml_simple(yaml_text: str) -> dict:
    """
    Minimal YAML parser for flat key-value pairs and simple list values.
    Avoids a hard dependency on PyYAML while keeping the format clean.

    Supports:
        key: value
        key:
          - item1
          - item2
    """
    result = {}
    current_key = None
    current_list = None

    for raw_line in yaml_text.splitlines():
        line = raw_line.rstrip()

        # List item under the current key
        if line.startswith("  - ") or line.startswith("- "):
            item = line.lstrip("- ").strip()
            if current_list is not None:
                current_list.append(item)
            continue

        # Key: value pair
        if ":" in line:
            key, _, value = line.partition(":")
            key = key.strip()
            value = value.strip()

            # Commit any in-progress list
            if current_list is not None and current_key:
                result[current_key] = current_list
                current_list = None

            if value:
                result[key] = value
                current_key = key
            else:
                # Value follows as a list on subsequent lines
                current_key = key
                current_list = []

    # Commit trailing list
    if current_list is not None and current_key:
        result[current_key] = current_list

    return result


class DocumentParser:
    """
    Parses a single markdown file (with optional YAML front matter) into a
    KnowledgeDocument. Separation of concern: this class only parses;
    it does not read files or cache results.
    """

    @staticmethod
    def parse(path: str) -> KnowledgeDocument:
        """
        Read ``path`` and return a hydrated KnowledgeDocument.

        Falls back to sensible defaults if any front matter field is absent.

        Parameters
        ----------
        path : str
            Absolute or relative path to a ``.md`` file.

        Returns
        -------
        KnowledgeDocument
        """
        with open(path, encoding="utf-8") as fh:
            raw = fh.read()

        # --- Split front matter from body ---
        match = _FRONT_MATTER_RE.match(raw)
        if match:
            yaml_block = match.group(1)
            body = raw[match.end():]
            meta = _parse_yaml_simple(yaml_block)
        else:
            body = raw
            meta = {}

        # Derive category and fallback id from the file path
        stem = os.path.splitext(os.path.basename(path))[0]
        parent_dir = os.path.basename(os.path.dirname(path))

        doc = KnowledgeDocument(
            id=meta.get("id", stem),
            title=meta.get("title", stem.replace("_", " ").title()),
            category=meta.get("category", parent_dir),
            tags=meta.get("tags", []),
            summary=meta.get("summary", ""),
            authority=meta.get("authority", "community"),
            content=body.strip(),
            source=meta.get("source", path),
        )

        logger.debug("[Parser] Parsed document: id=%s category=%s authority=%s", doc.id, doc.category, doc.authority)
        return doc
