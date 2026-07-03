"""
threat_intelligence.py

Deterministic threat-intelligence enrichment based on alert source identifier
and optional IP address.  No external API calls are made.

Classification logic:
- Public IP addresses in known malicious / suspicious ranges → malicious / suspicious
- RFC-1918 private addresses                                  → internal / clean
- Known internal source hostname patterns (srv-, db-, corp-)  → internal source
- Default / unknown                                           → unknown

Reputation levels: "malicious" | "suspicious" | "unknown" | "clean"
"""

from __future__ import annotations

import ipaddress


# ---------------------------------------------------------------------------
# Data type
# ---------------------------------------------------------------------------

class ThreatIntelInfo:
    __slots__ = ("reputation", "confidence", "category", "summary")

    def __init__(
        self,
        reputation: str,
        confidence: int,
        category: str,
        summary: str,
    ) -> None:
        self.reputation = reputation
        self.confidence = confidence
        self.category   = category
        self.summary    = summary

    def to_dict(self) -> dict:
        return {
            "reputation": self.reputation,
            "confidence": self.confidence,
            "category":   self.category,
            "summary":    self.summary,
        }


# ---------------------------------------------------------------------------
# IP classification helpers
# ---------------------------------------------------------------------------

def _is_private_ip(ip: str) -> bool:
    """Return True if the IP is an RFC-1918 or loopback address."""
    try:
        return ipaddress.ip_address(ip).is_private
    except ValueError:
        return False


# Known malicious public IP prefixes (hardcoded representative samples).
# In a real deployment these would come from threat-intel feeds.
_MALICIOUS_PREFIXES: list[str] = [
    "194.26.",    # Known C2 hosting range (matches mock data AL-8491)
    "185.190.",   # Known scanning/abuse range (matches mock data AL-7410)
    "91.92.",
    "45.33.",
    "104.21.",
]

_SUSPICIOUS_PREFIXES: list[str] = [
    "80.241.",    # VPN exit nodes (matches mock data AL-7982)
    "5.188.",
    "23.19.",
]


def _classify_ip(ip: str | None) -> tuple[str, int, str]:
    """
    Return (reputation, confidence, category) based on IP address.
    Returns ("unknown", 0, "") if ip is None or unclassifiable.
    """
    if not ip:
        return "unknown", 0, ""

    if _is_private_ip(ip):
        return "clean", 85, "Internal Network"

    for prefix in _MALICIOUS_PREFIXES:
        if ip.startswith(prefix):
            return "malicious", 92, "Known Threat Actor Infrastructure"

    for prefix in _SUSPICIOUS_PREFIXES:
        if ip.startswith(prefix):
            return "suspicious", 71, "Anonymisation / VPN Exit Node"

    return "unknown", 40, "Unclassified Public Address"


# ---------------------------------------------------------------------------
# Source hostname classification helpers
# ---------------------------------------------------------------------------

_SOURCE_RULES: list[tuple[list[str], ThreatIntelInfo]] = [
    (
        ["corp-ad", "corp-"],
        ThreatIntelInfo(
            "suspicious",
            78,
            "Active Directory Infrastructure",
            "Activity originated from an Active Directory controller; "
            "lateral movement or credential attacks are common in this context.",
        ),
    ),
    (
        ["db-", "postgres", "mysql", "mongo"],
        ThreatIntelInfo(
            "suspicious",
            74,
            "Database Server",
            "Anomalous traffic from a database host may indicate exfiltration "
            "or unauthorized query execution.",
        ),
    ),
    (
        ["srv-k8s", "srv-linux", "k8s", "kube"],
        ThreatIntelInfo(
            "suspicious",
            70,
            "Container / Kubernetes Node",
            "Container orchestration nodes are high-value targets; "
            "unusual process or network activity warrants immediate investigation.",
        ),
    ),
    (
        ["srv-", "server"],
        ThreatIntelInfo(
            "suspicious",
            65,
            "Internal Server",
            "Activity from an internal server that deviates from its expected "
            "communication pattern.",
        ),
    ),
    (
        ["aws-", "gcp-", "azure-", "s3-", "ec2-"],
        ThreatIntelInfo(
            "suspicious",
            72,
            "Cloud Infrastructure",
            "Cloud resource exhibiting anomalous behaviour; possible IAM abuse "
            "or misconfigured access policy.",
        ),
    ),
    (
        ["api-gateway", "api-gw", "gateway"],
        ThreatIntelInfo(
            "suspicious",
            60,
            "API Gateway",
            "Elevated error rates or unusual traffic patterns at the API gateway "
            "may indicate reconnaissance or abuse.",
        ),
    ),
    (
        ["workstation", "laptop", "desktop", "pc-", "mac-"],
        ThreatIntelInfo(
            "suspicious",
            55,
            "Endpoint / Workstation",
            "Endpoint-originated activity outside normal user patterns; "
            "possible insider threat or compromised user device.",
        ),
    ),
]

_DEFAULT_INTEL = ThreatIntelInfo(
    "unknown",
    30,
    "Unclassified Source",
    "No threat intelligence match found for this source. "
    "Manual investigation recommended.",
)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def lookup(alert: dict) -> dict:
    """
    Return threat intelligence enrichment for the given alert.

    Checks the alert's ``details.ipAddress`` first, then falls back to
    heuristic matching on the ``source`` hostname.

    Args:
        alert: The alert dictionary.

    Returns:
        dict with keys: reputation, confidence, category, summary
    """
    source  = (alert.get("source") or "").lower()
    details = alert.get("details") or {}
    ip      = details.get("ipAddress") if isinstance(details, dict) else None

    # ── 1. IP-based classification (highest priority) ────────────────────────
    if ip:
        reputation, confidence, category = _classify_ip(ip)

        if reputation == "malicious":
            return ThreatIntelInfo(
                "malicious",
                confidence,
                category,
                f"Source IP {ip} is associated with known threat actor "
                "infrastructure. Block and isolate immediately.",
            ).to_dict()

        if reputation == "suspicious":
            return ThreatIntelInfo(
                "suspicious",
                confidence,
                category,
                f"Source IP {ip} resolves to an anonymisation service or "
                "VPN provider commonly used for obfuscation.",
            ).to_dict()

        if reputation == "clean":
            # Internal IP – fall through to source-name classification
            # so we can still report the more specific internal category
            pass

    # ── 2. Source hostname heuristic ────────────────────────────────────────
    for prefixes, info in _SOURCE_RULES:
        if any(p in source for p in prefixes):
            # If we already know the IP is internal/clean, downgrade to "clean"
            if ip and _is_private_ip(ip):
                return ThreatIntelInfo(
                    "clean",
                    info.confidence,
                    info.category,
                    info.summary.replace(
                        "anomalous", "elevated"
                    ),  # soften language for internal clean IPs
                ).to_dict()
            return info.to_dict()

    # ── 3. Email / user account source ──────────────────────────────────────
    if "@" in source:
        return ThreatIntelInfo(
            "unknown",
            50,
            "User Account",
            f"Activity attributed to user account '{source}'. "
            "Verify whether the account has been compromised.",
        ).to_dict()

    return _DEFAULT_INTEL.to_dict()
