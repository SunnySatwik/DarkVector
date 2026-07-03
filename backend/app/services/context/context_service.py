"""
context_service.py

Facade that combines MITRE ATT&CK and Threat Intelligence enrichment into a
single ``enrich`` call.  Used by InferenceService after ML analysis completes.
"""

from __future__ import annotations

from app.services.context.mitre_mapping import lookup as mitre_lookup
from app.services.context.threat_intelligence import lookup as ti_lookup


class ContextService:
    """Stateless enrichment service — all methods are static."""

    @staticmethod
    def enrich(alert: dict) -> dict:
        """
        Enrich an alert with MITRE ATT&CK and Threat Intelligence context.

        Args:
            alert: The raw alert dictionary (type, category, source, details…).

        Returns:
            dict with keys:
                ``mitre``              – MitreInfo dict
                ``threat_intelligence``– ThreatIntelInfo dict
        """
        return {
            "mitre":               mitre_lookup(alert),
            "threat_intelligence": ti_lookup(alert),
        }
