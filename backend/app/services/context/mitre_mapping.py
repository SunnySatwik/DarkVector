"""
mitre_mapping.py

Static MITRE ATT&CK lookup table keyed on alert category and type keywords.

All alert types present in the application are covered. A deterministic
fallback is returned for unknown types so the enrichment never returns None.
"""

from __future__ import annotations


# ---------------------------------------------------------------------------
# Data type
# ---------------------------------------------------------------------------

class MitreInfo:
    __slots__ = ("technique_id", "technique_name", "tactic", "description")

    def __init__(
        self,
        technique_id: str,
        technique_name: str,
        tactic: str,
        description: str,
    ) -> None:
        self.technique_id   = technique_id
        self.technique_name = technique_name
        self.tactic         = tactic
        self.description    = description

    def to_dict(self) -> dict:
        return {
            "technique_id":   self.technique_id,
            "technique_name": self.technique_name,
            "tactic":         self.tactic,
            "description":    self.description,
        }


# ---------------------------------------------------------------------------
# Lookup table  (ordered – most-specific keywords first)
# Each entry: (keyword_fragments, MitreInfo)
# The alert type string is lowercased before matching.
# ---------------------------------------------------------------------------

_RULES: list[tuple[list[str], MitreInfo]] = [

    # ── Credential Access ────────────────────────────────────────────────────

    (
        ["kerberoast"],
        MitreInfo(
            "T1558.003",
            "Kerberoasting",
            "Credential Access",
            "Adversaries request service tickets for Kerberos service accounts and "
            "crack them offline to obtain plaintext credentials.",
        ),
    ),
    (
        ["lsass", "credential harvest", "credential dump"],
        MitreInfo(
            "T1003.001",
            "LSASS Memory",
            "Credential Access",
            "Adversaries read the LSASS process memory to extract credential "
            "material such as password hashes and Kerberos tickets.",
        ),
    ),
    (
        ["brute force", "brute-force", "password spray", "failed login", "impossible travel",
         "impossibly fast travel", "anomalous login"],
        MitreInfo(
            "T1110",
            "Brute Force",
            "Credential Access",
            "Attackers attempt to gain access by systematically trying many "
            "passwords or exploiting authentication anomalies such as geographically "
            "impossible login sequences.",
        ),
    ),

    # ── Command and Control ──────────────────────────────────────────────────

    (
        ["dns tunnel", "dns tunneling"],
        MitreInfo(
            "T1071.004",
            "DNS",
            "Command and Control",
            "Adversaries encode data within DNS queries and responses to establish "
            "a covert command-and-control channel through corporate DNS resolvers.",
        ),
    ),

    # ── Privilege Escalation ─────────────────────────────────────────────────

    (
        ["namespace", "container escape", "container exec", "escape to host",
         "unusual namespace"],
        MitreInfo(
            "T1611",
            "Escape to Host",
            "Privilege Escalation",
            "Adversaries break out of a containerised environment to gain access "
            "to the underlying host operating system and its resources.",
        ),
    ),
    (
        ["iam", "privilege escalation", "assumerole", "role escalation"],
        MitreInfo(
            "T1078.004",
            "Cloud Accounts",
            "Privilege Escalation",
            "Adversaries abuse cloud IAM mechanisms such as AssumeRole to obtain "
            "elevated permissions beyond the intended role boundary.",
        ),
    ),

    # ── Exfiltration ─────────────────────────────────────────────────────────

    (
        ["database dump", "db dump", "data dump", "exfil", "multi-source"],
        MitreInfo(
            "T1030",
            "Data Transfer Size Limits",
            "Exfiltration",
            "Adversaries stage and exfiltrate large volumes of data, sometimes "
            "splitting transfers to evade size-based detection thresholds.",
        ),
    ),

    # ── Impact ───────────────────────────────────────────────────────────────

    (
        ["api burst", "api rate", "rate burst", "anomalous api"],
        MitreInfo(
            "T1498",
            "Network Denial of Service",
            "Impact",
            "Adversaries send high volumes of requests to exhaust resources, "
            "degrade service availability, or enumerate hidden endpoints.",
        ),
    ),

    # ── Execution ─────────────────────────────────────────────────────────────

    (
        ["powershell", "encoded command", "encodedcommand", "bypass execution"],
        MitreInfo(
            "T1059.001",
            "PowerShell",
            "Execution",
            "Adversaries abuse PowerShell commands and scripts to execute commands. "
            "Encoded parameters (-EncodedCommand) are commonly used to obfuscate "
            "command-line activity and evade command-line logging.",
        ),
    ),

    # ── Discovery ────────────────────────────────────────────────────────────

    (
        ["scan", "port scan", "network scan", "reconnaissance"],
        MitreInfo(
            "T1046",
            "Network Service Discovery",
            "Discovery",
            "Adversaries enumerate running services and open ports to identify "
            "targets for subsequent exploitation.",
        ),
    ),
    (
        ["command and scripting interpreter", "powershell cmd", "interpreter"],
        MitreInfo(
            "T1059",
            "Command and Scripting Interpreter",
            "Execution",
            "Adversaries may abuse command and scripting interpreters to execute commands, scripts, or binaries.",
        ),
    ),
    (
        ["system binary proxy execution", "lolbin", "suspicious lolbins", "lolbin chain"],
        MitreInfo(
            "T1218",
            "System Binary Proxy Execution",
            "Defense Evasion",
            "Adversaries may bypass process and/or signature-based defenses by proxying execution of malicious code with signed, trusted system binaries.",
        ),
    ),
    (
        ["ingress tool transfer", "certutil download", "tool transfer"],
        MitreInfo(
            "T1105",
            "Ingress Tool Transfer",
            "Command and Control",
            "Adversaries may transfer tools or other files from an external system into a compromised environment.",
        ),
    ),
    (
        ["user execution", "office spawn", "office spawning powershell"],
        MitreInfo(
            "T1204",
            "User Execution",
            "Execution",
            "Adversaries may rely on the actions of a user in order to gain execution of malicious code, such as opening a malicious document or link.",
        ),
    ),
]

# ---------------------------------------------------------------------------
# Fallback (returned when no keyword matches)
# ---------------------------------------------------------------------------

_FALLBACK = MitreInfo(
    "T1190",
    "Exploit Public-Facing Application",
    "Initial Access",
    "Adversaries exploit a vulnerability or weakness in an internet-facing "
    "application to gain initial access to a target environment.",
)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def lookup(alert: dict) -> dict:
    """
    Return a MITRE ATT&CK mapping dict for the given alert.

    Matching is done against the lowercased ``type`` field first, then
    falls through to the ``category``-based heuristic, and finally to
    the global fallback.

    Args:
        alert: The alert dictionary (must contain at least ``type`` and
               ``category`` keys).

    Returns:
        dict with keys: technique_id, technique_name, tactic, description
    """
    alert_type = (alert.get("type") or "").lower()

    for keywords, info in _RULES:
        if any(kw in alert_type for kw in keywords):
            return info.to_dict()

    return _FALLBACK.to_dict()


def lookup_by_id(technique_id: str, default_tactic: str = None) -> dict:
    """
    Look up MITRE technique information by technique ID.
    If the technique ID is matched in static rules, return its metadata.
    If not matched, preserve the technique ID and default tactic (if provided)
    but do not add generic fallback names/descriptions.
    """
    if not technique_id or technique_id == "N/A":
        return {
            "technique_id": "N/A",
            "technique_name": "N/A",
            "tactic": default_tactic or "N/A",
            "description": "N/A",
        }
    for _, info in _RULES:
        if info.technique_id == technique_id:
            return info.to_dict()
    if _FALLBACK.technique_id == technique_id:
        return _FALLBACK.to_dict()
    return {
        "technique_id": technique_id,
        "technique_name": "N/A",
        "tactic": default_tactic or "N/A",
        "description": "N/A",
    }


def validate_registered_rules():
    """
    Validation check that runs on import to fail loudly during development
    if any registered DetectionRule references an unknown/unmapped MITRE technique.
    """
    try:
        from app.services.detection.rules import (
            PowerShellEncodedRule,
            PowerShellCmdRule,
            OfficeSpawnRule,
            CertutilDownloadRule,
            SuspiciousLOLBinsRule,
            LOLBinChainRule,
        )
        rules = [
            PowerShellEncodedRule(),
            PowerShellCmdRule(),
            OfficeSpawnRule(),
            CertutilDownloadRule(),
            SuspiciousLOLBinsRule(),
            LOLBinChainRule(),
        ]
        
        registered_ids = {r.mitre_technique for r in rules if r.mitre_technique}
        mapped_ids = {info.technique_id for _, info in _RULES}
        mapped_ids.add(_FALLBACK.technique_id)
        
        for tech_id in registered_ids:
            if tech_id not in mapped_ids:
                raise KeyError(
                    f"DetectionRule references unknown MITRE technique ID '{tech_id}'. "
                    f"Please register it in mitre_mapping.py first."
                )
    except ImportError:
        # Prevent import loop/failure during early DB initialization or test setup
        pass


validate_registered_rules()



