# models.py
from dataclasses import dataclass, field


# Authority ranking — lower value = higher authority
AUTHORITY_RANK = {
    "official": 0,
    "internal": 1,
    "community": 2,
}


@dataclass
class KnowledgeDocument:
    """
    Represents a single knowledge base document loaded from a markdown file.
    
    Fields
    ------
    id          Unique identifier (derived from YAML front matter or filename stem).
    title       Human-readable display title.
    category    Knowledge category — e.g. "mitre", "playbooks", "cis", "owasp", "procedures".
    tags        List of search/filter keywords.
    summary     Short one-line description of the document's content.
    authority   Provenance tier: "official" | "internal" | "community".
    content     Full markdown body (text after the front matter block).
    source      Original file path or external reference (e.g. "MITRE ATT&CK").
    """

    id: str
    title: str
    category: str
    tags: list[str] = field(default_factory=list)
    summary: str = ""
    authority: str = "community"
    content: str = ""
    source: str = ""

    @property
    def authority_rank(self) -> int:
        """Lower rank number = higher authority. Used for sorting retrieval results."""
        return AUTHORITY_RANK.get(self.authority.lower(), 99)
