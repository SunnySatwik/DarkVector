from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any

from app.services.llm.routing.route import PromptRoute


class ResponseScope(Enum):
    FOCUSED = "focused"
    STANDARD = "standard"
    COMPREHENSIVE = "comprehensive"


class RetrievalDecision(Enum):
    SKIP = "skip"
    OPTIONAL = "optional"
    REQUIRED = "required"


class EvidenceCategory(Enum):
    INVESTIGATION_METADATA = "investigation_metadata"
    DETECTION_EVIDENCE = "detection_evidence"
    PROCESS_EVIDENCE = "process_evidence"
    CORRELATION_EVIDENCE = "correlation_evidence"
    TIMELINE_EVIDENCE = "timeline_evidence"
    MITRE_EVIDENCE = "mitre_evidence"
    SHAP_EVIDENCE = "shap_evidence"
    TELEMETRY_EVIDENCE = "telemetry_evidence"
    RECOMMENDATION_EVIDENCE = "recommendation_evidence"
    CONVERSATION_HISTORY = "conversation_history"
    KNOWLEDGE_BASE_EVIDENCE = "knowledge_base_evidence"
    CONFIDENCE_EVIDENCE = "confidence_evidence"


@dataclass(frozen=True)
class ResponsePolicy:
    route: PromptRoute
    scope: ResponseScope
    retrieval_decision: RetrievalDecision
    required_evidence: frozenset[EvidenceCategory]
    optional_evidence: frozenset[EvidenceCategory]
    excluded_evidence: frozenset[EvidenceCategory]
    allowed_sections: frozenset[str]
    forbidden_sections: frozenset[str]

    def __post_init__(self) -> None:
        """
        Validate policy invariants.
        Fails early if any rules are violated.
        """
        # 1. Required and Excluded cannot overlap
        overlap = self.required_evidence & self.excluded_evidence
        if overlap:
            raise ValueError(
                f"[Policy Invariant] Evidence categories cannot be simultaneously "
                f"REQUIRED and EXCLUDED: {[o.value for o in overlap]}"
            )

        # 2. Required and Optional cannot overlap
        overlap_opt = self.required_evidence & self.optional_evidence
        if overlap_opt:
            raise ValueError(
                f"[Policy Invariant] Evidence categories cannot be simultaneously "
                f"REQUIRED and OPTIONAL: {[o.value for o in overlap_opt]}"
            )

        # 3. Optional and Excluded cannot overlap
        overlap_opt_ex = self.optional_evidence & self.excluded_evidence
        if overlap_opt_ex:
            raise ValueError(
                f"[Policy Invariant] Evidence categories cannot be simultaneously "
                f"OPTIONAL and EXCLUDED: {[o.value for o in overlap_opt_ex]}"
            )

        # 4. Allowed and Forbidden sections cannot overlap
        overlap_sections = self.allowed_sections & self.forbidden_sections
        if overlap_sections:
            raise ValueError(
                f"[Policy Invariant] Allowed and Forbidden sections cannot overlap: {list(overlap_sections)}"
            )

        # 5. FOCUSED scope should have bounded section expectations (forbidden sections must be defined)
        if self.scope == ResponseScope.FOCUSED and not self.forbidden_sections:
            raise ValueError(
                "[Policy Invariant] FOCUSED scope requires explicitly defined forbidden_sections."
            )

    def to_log_dict(self) -> dict[str, Any]:
        """
        Safe structured dictionary for logging/observability.
        Guarantees zero leakage of actual investigation command lines, payloads, or context.
        """
        return {
            "route": self.route.value,
            "scope": self.scope.value,
            "retrieval_decision": self.retrieval_decision.value,
            "required_evidence": sorted([e.value for e in self.required_evidence]),
            "optional_evidence": sorted([e.value for e in self.optional_evidence]),
            "excluded_evidence": sorted([e.value for e in self.excluded_evidence]),
            "allowed_sections": sorted(list(self.allowed_sections)),
            "forbidden_sections": sorted(list(self.forbidden_sections)),
        }


class PolicyResolver:
    @staticmethod
    def resolve(
        route: PromptRoute,
        question: str | None,
        context_data: dict[str, Any]
    ) -> ResponsePolicy:
        """
        Resolves the ResponsePolicy based on the PromptRoute and query/question characteristics.
        """
        q = (question or "").lower()

        # Deterministic intent checks based on question keywords
        is_focused_severity = any(
            k in q for k in [
                "why", "reason", "what made", "how come", "why is", "why was",
                "explain"
            ]
        ) and any(
            k in q for k in [
                "severity", "risk", "score", "95", "high", "critical",
                "classification"
            ]
        )
        
        is_comprehensive_risk = any(
            k in q for k in ["comprehensive", "full", "complete", "all"]
        ) and any(
            k in q for k in ["risk", "severity", "assessment", "impact"]
        )

        is_remediation = route == PromptRoute.REMEDIATION or any(
            k in q for k in ["remediate", "mitigate", "contain", "playbook", "action"]
        )
        is_mitre = route == PromptRoute.MITRE or any(
            k in q for k in ["mitre", "technique", "tactic", "att&ck"]
        )
        is_timeline = route == PromptRoute.TIMELINE or any(
            k in q for k in ["timeline", "chronology", "sequence", "order"]
        )
        is_evidence = route == PromptRoute.EVIDENCE or any(
            k in q for k in ["evidence", "proof", "telemetry"]
        )
        is_shap_question = any(
            k in q for k in ["shap", "attribution", "feature", "anomaly"]
        )

        is_confidence_question = any(
            k in q for k in ["confidence", "reliability", "reliable"]
        )

        # Resolve scope, retrieval, and evidence list
        if is_confidence_question:
            scope = ResponseScope.FOCUSED
            retrieval_decision = RetrievalDecision.SKIP
            required_evidence = {
                EvidenceCategory.INVESTIGATION_METADATA,
                EvidenceCategory.CONFIDENCE_EVIDENCE,
            }
            optional_evidence = {
                EvidenceCategory.DETECTION_EVIDENCE,
                EvidenceCategory.PROCESS_EVIDENCE,
                EvidenceCategory.MITRE_EVIDENCE,
                EvidenceCategory.SHAP_EVIDENCE,
            }
            excluded_evidence = {
                EvidenceCategory.KNOWLEDGE_BASE_EVIDENCE,
                EvidenceCategory.TIMELINE_EVIDENCE,
                EvidenceCategory.RECOMMENDATION_EVIDENCE,
                EvidenceCategory.CONVERSATION_HISTORY,
            }
            allowed_sections = {
                "Direct Explanation",
                "Supporting Evidence",
                "Evidence Used",
            }
            forbidden_sections = {
                "### Full Timeline",
                "### Analyst Recommendations",
                "### Full Remediation Plan",
                "OWASP",
                "CIS"
            }
        elif route == PromptRoute.RISK_ANALYSIS or any(k in q for k in ["severity", "risk", "score"]):
            if is_focused_severity:
                scope = ResponseScope.FOCUSED
                retrieval_decision = RetrievalDecision.SKIP
                
                # Exclude compliance unless specifically asked
                has_compliance_keywords = any(
                    k in q for k in [
                        "owasp", "cis", "compliance", "gdpr", "hipaa", "ccpa",
                        "regulatory", "policy", "standard"
                    ]
                )
                if has_compliance_keywords:
                    retrieval_decision = RetrievalDecision.OPTIONAL

                required_evidence = {
                    EvidenceCategory.INVESTIGATION_METADATA,
                    EvidenceCategory.DETECTION_EVIDENCE
                }
                optional_evidence = {
                    EvidenceCategory.PROCESS_EVIDENCE,
                    EvidenceCategory.CORRELATION_EVIDENCE,
                    EvidenceCategory.MITRE_EVIDENCE,
                    EvidenceCategory.CONFIDENCE_EVIDENCE,
                }
                excluded_evidence = {
                    EvidenceCategory.SHAP_EVIDENCE,
                    EvidenceCategory.TIMELINE_EVIDENCE,
                    EvidenceCategory.RECOMMENDATION_EVIDENCE,
                    EvidenceCategory.CONVERSATION_HISTORY,
                }
                
                if is_shap_question:
                    optional_evidence.add(EvidenceCategory.SHAP_EVIDENCE)
                    excluded_evidence.remove(EvidenceCategory.SHAP_EVIDENCE)

                allowed_sections = {
                    "Direct Explanation",
                    "Driving Factors",
                    "Supporting Evidence",
                    "Uncertainty / Caveat",
                    "Evidence Used"
                }
                forbidden_sections = {
                    "### SHAP Feature Attribution",
                    "### Business Impact",
                    "### Compliance Impact",
                    "### Full Timeline",
                    "### Analyst Recommendations",
                    "### Full Remediation Plan",
                    "OWASP",
                    "CIS"
                }
            else:
                # Standard or comprehensive risk inquiry
                scope = ResponseScope.COMPREHENSIVE if is_comprehensive_risk else ResponseScope.STANDARD
                retrieval_decision = RetrievalDecision.OPTIONAL
                required_evidence = {
                    EvidenceCategory.INVESTIGATION_METADATA,
                    EvidenceCategory.DETECTION_EVIDENCE,
                }
                optional_evidence = {
                    EvidenceCategory.PROCESS_EVIDENCE,
                    EvidenceCategory.CORRELATION_EVIDENCE,
                    EvidenceCategory.MITRE_EVIDENCE,
                    EvidenceCategory.TELEMETRY_EVIDENCE,
                    EvidenceCategory.CONFIDENCE_EVIDENCE,
                }
                excluded_evidence = {
                    EvidenceCategory.SHAP_EVIDENCE,
                    EvidenceCategory.TIMELINE_EVIDENCE,
                    EvidenceCategory.RECOMMENDATION_EVIDENCE,
                    EvidenceCategory.CONVERSATION_HISTORY,
                }
                
                if is_shap_question:
                    optional_evidence.add(EvidenceCategory.SHAP_EVIDENCE)
                    excluded_evidence.remove(EvidenceCategory.SHAP_EVIDENCE)

                allowed_sections = {
                    "Executive Summary",
                    "Technical Findings",
                    "Business Impact",
                    "Recommendations",
                    "Evidence Used"
                }
                forbidden_sections = {
                    "### SHAP Feature Attribution"
                }

        elif is_remediation:
            scope = ResponseScope.STANDARD
            retrieval_decision = RetrievalDecision.REQUIRED
            required_evidence = {
                EvidenceCategory.RECOMMENDATION_EVIDENCE
            }
            optional_evidence = {
                EvidenceCategory.PROCESS_EVIDENCE,
                EvidenceCategory.DETECTION_EVIDENCE,
                EvidenceCategory.KNOWLEDGE_BASE_EVIDENCE
            }
            excluded_evidence = {
                EvidenceCategory.SHAP_EVIDENCE,
                EvidenceCategory.TIMELINE_EVIDENCE,
                EvidenceCategory.CONFIDENCE_EVIDENCE,
            }
            if is_shap_question:
                optional_evidence.add(EvidenceCategory.SHAP_EVIDENCE)
                excluded_evidence.remove(EvidenceCategory.SHAP_EVIDENCE)
            allowed_sections = {
                "Executive Summary",
                "Analyst Recommendations",
                "Remediation Directive",
                "Evidence Used"
            }
            forbidden_sections = {
                "### SHAP Feature Attribution",
                "### Technical Findings"
            }

        elif is_mitre:
            scope = ResponseScope.FOCUSED
            retrieval_decision = RetrievalDecision.REQUIRED
            required_evidence = {
                EvidenceCategory.MITRE_EVIDENCE,
                EvidenceCategory.KNOWLEDGE_BASE_EVIDENCE
            }
            optional_evidence = {
                EvidenceCategory.DETECTION_EVIDENCE,
                EvidenceCategory.PROCESS_EVIDENCE
            }
            excluded_evidence = {
                EvidenceCategory.SHAP_EVIDENCE,
                EvidenceCategory.TIMELINE_EVIDENCE,
                EvidenceCategory.CONVERSATION_HISTORY,
                EvidenceCategory.CONFIDENCE_EVIDENCE,
            }
            allowed_sections = {
                "MITRE ATT&CK Mapping",
                "Technique Explanation",
                "Evidence Used"
            }
            forbidden_sections = {
                "### SHAP Feature Attribution",
                "### Business Impact",
                "### Compliance Impact",
                "### Analyst Recommendations"
            }

        elif is_timeline:
            scope = ResponseScope.FOCUSED
            retrieval_decision = RetrievalDecision.SKIP
            required_evidence = {
                EvidenceCategory.TIMELINE_EVIDENCE
            }
            optional_evidence = {
                EvidenceCategory.DETECTION_EVIDENCE,
                EvidenceCategory.PROCESS_EVIDENCE
            }
            excluded_evidence = {
                EvidenceCategory.SHAP_EVIDENCE,
                EvidenceCategory.KNOWLEDGE_BASE_EVIDENCE,
                EvidenceCategory.CONFIDENCE_EVIDENCE,
            }
            allowed_sections = {
                "Timeline Progression",
                "Event Analysis",
                "Evidence Used"
            }
            forbidden_sections = {
                "### SHAP Feature Attribution",
                "### Business Impact",
                "### Compliance Impact",
                "### Analyst Recommendations"
            }

        elif is_evidence or is_shap_question:
            scope = ResponseScope.FOCUSED
            retrieval_decision = RetrievalDecision.SKIP
            required_evidence = {
                EvidenceCategory.DETECTION_EVIDENCE,
                EvidenceCategory.PROCESS_EVIDENCE
            }
            optional_evidence = {
                EvidenceCategory.CORRELATION_EVIDENCE,
                EvidenceCategory.CONFIDENCE_EVIDENCE,
            }
            excluded_evidence = {
                EvidenceCategory.KNOWLEDGE_BASE_EVIDENCE
            }
            
            # Case B & C: Explicit SHAP inquiry matches SHAP_EVIDENCE as optional/required
            has_shap_data = bool(
                context_data.get("shap_factors", {}).get("top_factors")
            )
            if is_shap_question or has_shap_data:
                optional_evidence = set(optional_evidence)
                optional_evidence.add(EvidenceCategory.SHAP_EVIDENCE)
                optional_evidence = frozenset(optional_evidence)
            else:
                excluded_evidence = set(excluded_evidence)
                excluded_evidence.add(EvidenceCategory.SHAP_EVIDENCE)
                excluded_evidence = frozenset(excluded_evidence)

            allowed_sections = {
                "Evidence Overview",
                "Process Parameters",
                "SHAP Feature Attribution",
                "Evidence Used"
            }
            forbidden_sections = {
                "### Business Impact",
                "### Compliance Impact",
                "### Analyst Recommendations"
            }

        else:
            # GENERAL route / fallback default
            scope = ResponseScope.STANDARD
            retrieval_decision = RetrievalDecision.OPTIONAL
            required_evidence = {
                EvidenceCategory.INVESTIGATION_METADATA
            }
            optional_evidence = {
                EvidenceCategory.DETECTION_EVIDENCE,
                EvidenceCategory.PROCESS_EVIDENCE,
                EvidenceCategory.CORRELATION_EVIDENCE,
                EvidenceCategory.MITRE_EVIDENCE,
                EvidenceCategory.TIMELINE_EVIDENCE,
                EvidenceCategory.TELEMETRY_EVIDENCE,
                EvidenceCategory.RECOMMENDATION_EVIDENCE,
                EvidenceCategory.CONVERSATION_HISTORY,
                EvidenceCategory.KNOWLEDGE_BASE_EVIDENCE,
                EvidenceCategory.CONFIDENCE_EVIDENCE,
            }
            excluded_evidence = {
                EvidenceCategory.SHAP_EVIDENCE
            }
            if is_shap_question:
                optional_evidence = set(optional_evidence)
                optional_evidence.add(EvidenceCategory.SHAP_EVIDENCE)
                optional_evidence = frozenset(optional_evidence)
                excluded_evidence = set(excluded_evidence)
                excluded_evidence.remove(EvidenceCategory.SHAP_EVIDENCE)
                excluded_evidence = frozenset(excluded_evidence)

            allowed_sections = {
                "Executive Summary",
                "Technical Findings",
                "Recommendations",
                "Evidence Used"
            }
            forbidden_sections = set()

        # Extra safety enforcement for SHAP questions: never exclude SHAP
        if is_shap_question:
            excluded_set = set(excluded_evidence)
            if EvidenceCategory.SHAP_EVIDENCE in excluded_set:
                excluded_set.remove(EvidenceCategory.SHAP_EVIDENCE)
            excluded_evidence = frozenset(excluded_set)
            
            optional_set = set(optional_evidence)
            optional_set.add(EvidenceCategory.SHAP_EVIDENCE)
            optional_evidence = frozenset(optional_set)

        return ResponsePolicy(
            route=route,
            scope=scope,
            retrieval_decision=retrieval_decision,
            required_evidence=frozenset(required_evidence),
            optional_evidence=frozenset(optional_evidence),
            excluded_evidence=frozenset(excluded_evidence),
            allowed_sections=frozenset(allowed_sections),
            forbidden_sections=frozenset(forbidden_sections),
        )

    @staticmethod
    def filter_retrieved_documents(
        docs: list[Any],
        route: PromptRoute,
        question: str | None
    ) -> list[Any]:
        """
        Post-retrieval filtering defense-in-depth (Requirement 8).
        Ensures compliance documents do not get included if the question is focused on execution/severity.
        """
        if not docs:
            return []
        
        q_lower = (question or "").lower()
        has_compliance = any(
            k in q_lower for k in [
                "owasp", "cis", "compliance", "gdpr", "hipaa", "ccpa",
                "regulation", "policy", "standard"
            ]
        )
        
        filtered = []
        for doc in docs:
            # If document is a compliance framework doc, but the query did not ask about compliance, skip it.
            if doc.category in ["cis", "owasp"] and not has_compliance:
                continue
            filtered.append(doc)
            
        return filtered

