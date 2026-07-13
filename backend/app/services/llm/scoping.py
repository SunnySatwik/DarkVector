from __future__ import annotations

from typing import Any

from app.services.llm.policy import EvidenceCategory, ResponsePolicy


class ContextScoper:
    """
    Handles context scoping projections, guaranteeing immutability of the
    canonical context.
    """

    @staticmethod
    def project(
        canonical_context: dict[str, Any],
        policy: ResponsePolicy
    ) -> dict[str, Any]:
        """
        Creates and returns a new scoped context projection dictionary from the
        canonical_context based on the resolved policy.

        Ensures the original canonical_context object is never mutated.
        """
        # Create a new dictionary to serve as the projection
        scoped = dict(canonical_context)

        # Clear or strip excluded categories according to the policy
        if EvidenceCategory.SHAP_EVIDENCE in policy.excluded_evidence:
            scoped["shap_factors"] = {}

        if EvidenceCategory.TIMELINE_EVIDENCE in policy.excluded_evidence:
            scoped["timeline"] = []

        if EvidenceCategory.MITRE_EVIDENCE in policy.excluded_evidence:
            scoped["mitre"] = {}
            scoped["mitre_mappings"] = []

        if EvidenceCategory.CONVERSATION_HISTORY in policy.excluded_evidence:
            scoped["conversation"] = {}

        if EvidenceCategory.RECOMMENDATION_EVIDENCE in policy.excluded_evidence:
            scoped["recommendations"] = []

        if EvidenceCategory.CORRELATION_EVIDENCE in policy.excluded_evidence:
            scoped["correlation_context"] = {}

        if EvidenceCategory.DETECTION_EVIDENCE in policy.excluded_evidence:
            scoped["behavioral_context"] = None

        if EvidenceCategory.PROCESS_EVIDENCE in policy.excluded_evidence:
            scoped["process_evidence"] = []

        if EvidenceCategory.TELEMETRY_EVIDENCE in policy.excluded_evidence:
            scoped["alert"] = None
            scoped["evidence_graph"] = {}

        if EvidenceCategory.INVESTIGATION_METADATA in policy.excluded_evidence:
            scoped["investigation"] = None

        return scoped
