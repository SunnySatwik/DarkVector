import pytest
from unittest.mock import MagicMock

from app.services.llm.routing.route import PromptRoute
from app.services.llm.policy import (
    PolicyResolver,
    ResponsePolicy,
    ResponseScope,
    RetrievalDecision,
    EvidenceCategory,
)
from app.services.llm.scoping import ContextScoper
from app.services.llm.citations import EvidenceCitationBuilder
from app.services.llm.response_validator import ResponseValidator
from app.services.llm.fallback import FallbackAI
from app.services.llm.rag.models import KnowledgeDocument
from app.services.llm.rag.retriever import KnowledgeRetriever
from app.services.llm.prompt.builders.risk_analysis import RiskAnalysisPromptBuilder


# Dummy canonical context helper
def get_dummy_canonical_context():
    return {
        "investigation": {
            "investigation_id": "INV-TEST-123",
            "title": "PowerShell Encoded Command",
            "status": "NEW",
            "severity": "HIGH",
            "risk_score": 95.0,
            "confidence": 0.95,
        },
        "alert": {"type": "PowerShell Encoded Command", "category": "process"},
        "timeline": [{"title": "Alert Created", "actor": "SYSTEM"}],
        "mitre": {"technique_id": "T1059.001", "technique_name": "PowerShell"},
        "mitre_mappings": [{"technique_id": "T1059.001"}],
        "shap_factors": {"top_factors": [{"feature": "cmdline", "impact": 0.8}]},
        "conversation": {"recent": [{"sender": "user", "text": "hello"}]},
        "recommendations": ["Isolate host"],
        "behavioral_context": {
            "primary_detection": {"rule_id": "powershell_encoded"},
            "detections": [{"rule_id": "powershell_encoded"}],
        },
        "correlation_context": {"aggregate_severity": "HIGH"},
        "process_evidence": [{"process_name": "powershell.exe"}],
    }


# ---------------------------------------------------------------------------
# 1. Context Immutability (Requirement 2)
# ---------------------------------------------------------------------------
def test_canonical_context_immutability():
    """
    Verifies that projecting a scoped context does NOT mutate the original
    canonical context dictionary or its nested structures.
    """
    canonical = get_dummy_canonical_context()
    
    # Resolve a policy that excludes SHAP, timeline, and mitre
    policy = ResponsePolicy(
        route=PromptRoute.RISK_ANALYSIS,
        scope=ResponseScope.FOCUSED,
        retrieval_decision=RetrievalDecision.SKIP,
        required_evidence=frozenset([EvidenceCategory.INVESTIGATION_METADATA]),
        optional_evidence=frozenset(),
        excluded_evidence=frozenset([
            EvidenceCategory.SHAP_EVIDENCE,
            EvidenceCategory.TIMELINE_EVIDENCE,
            EvidenceCategory.MITRE_EVIDENCE,
        ]),
        allowed_sections=frozenset(["Direct Explanation"]),
        forbidden_sections=frozenset(["### Business Impact"]),
    )

    scoped = ContextScoper.project(canonical, policy)

    # Scoped should have empty/stripped values
    assert scoped["shap_factors"] == {}
    assert scoped["timeline"] == []
    assert scoped["mitre"] == {}
    assert scoped["mitre_mappings"] == []

    # Original canonical context MUST remain unmodified (immutability check)
    assert canonical["shap_factors"] == {"top_factors": [{"feature": "cmdline", "impact": 0.8}]}
    assert len(canonical["timeline"]) == 1
    assert canonical["mitre"] == {"technique_id": "T1059.001", "technique_name": "PowerShell"}
    assert len(canonical["mitre_mappings"]) == 1


# ---------------------------------------------------------------------------
# 2. Intent & Scope Resolution (Requirement 1, 3, 4, 7)
# ---------------------------------------------------------------------------
def test_severity_explanation_resolves_focused_and_skips_rag():
    """
    Checks that asking about severity classification resolves to RISK_ANALYSIS,
    FOCUSED scope, and skips RAG. It must exclude SHAP and playbooks by default.
    """
    context = get_dummy_canonical_context()
    question = "Why was this investigation classified as high severity?"
    
    policy = PolicyResolver.resolve(PromptRoute.RISK_ANALYSIS, question, context)
    
    assert policy.scope == ResponseScope.FOCUSED
    assert policy.retrieval_decision == RetrievalDecision.SKIP
    assert EvidenceCategory.SHAP_EVIDENCE in policy.excluded_evidence
    assert EvidenceCategory.RECOMMENDATION_EVIDENCE in policy.excluded_evidence
    assert "### Business Impact" in policy.forbidden_sections
    assert "### SHAP Feature Attribution" in policy.forbidden_sections


def test_severity_explanation_enables_rag_on_compliance_keywords():
    """
    If the severity explanation explicitly asks about compliance/CIS/OWASP,
    retrieval decision should change to OPTIONAL to permit knowledge lookup.
    """
    context = get_dummy_canonical_context()
    question = "Why is this severity high under CIS compliance guidelines?"
    
    policy = PolicyResolver.resolve(PromptRoute.RISK_ANALYSIS, question, context)
    
    assert policy.scope == ResponseScope.FOCUSED
    # RAG should be allowed since user mentioned compliance/CIS
    assert policy.retrieval_decision == RetrievalDecision.OPTIONAL


def test_comprehensive_risk_query_resolves_comprehensive_scope():
    """
    If the user query requests a full risk assessment, the route remains
    RISK_ANALYSIS but the scope is COMPREHENSIVE and RAG is OPTIONAL.
    """
    context = get_dummy_canonical_context()
    question = "Give me a comprehensive risk assessment of this investigation."
    
    policy = PolicyResolver.resolve(PromptRoute.RISK_ANALYSIS, question, context)
    
    assert policy.scope == ResponseScope.COMPREHENSIVE
    assert policy.retrieval_decision == RetrievalDecision.OPTIONAL
    assert "### Business Impact" not in policy.forbidden_sections


def test_investigation_summary_resolves_standard_and_skips_rag():
    """
    Verifies that a generic summary inquiry ("What happened?") resolves to
    standard scope and skips RAG unless explicitly asked.
    """
    context = get_dummy_canonical_context()
    question = "Summarize this investigation. What happened?"
    
    policy = PolicyResolver.resolve(PromptRoute.GENERAL, question, context)
    
    assert policy.scope == ResponseScope.STANDARD
    # RAG is optional but since no compliance/playbook is mentioned, retriever filters out compliance
    assert policy.retrieval_decision == RetrievalDecision.OPTIONAL


def test_mitre_question_requires_rag():
    """
    A MITRE technique explanation request requires RAG.
    """
    context = get_dummy_canonical_context()
    question = "Explain MITRE technique T1059.001."
    
    policy = PolicyResolver.resolve(PromptRoute.MITRE, question, context)
    
    assert policy.scope == ResponseScope.FOCUSED
    assert policy.retrieval_decision == RetrievalDecision.REQUIRED
    assert EvidenceCategory.MITRE_EVIDENCE in policy.required_evidence


def test_remediation_question_requires_rag_and_remediation_evidence():
    """
    A remediation question requires RAG and required recommendation/playbook evidence.
    """
    context = get_dummy_canonical_context()
    question = "How do I remediate or contain this host?"
    
    policy = PolicyResolver.resolve(PromptRoute.REMEDIATION, question, context)
    
    assert policy.scope == ResponseScope.STANDARD
    assert policy.retrieval_decision == RetrievalDecision.REQUIRED
    assert EvidenceCategory.RECOMMENDATION_EVIDENCE in policy.required_evidence


# ---------------------------------------------------------------------------
# 3. SHAP Handling: Case A, B, C (Requirement 7)
# ---------------------------------------------------------------------------
def test_shap_irrelevant_omits_shap():
    """
    Case A: Non-SHAP question. SHAP is excluded by the resolved policy.
    """
    context = get_dummy_canonical_context()
    question = "Why is severity high?"
    policy = PolicyResolver.resolve(PromptRoute.RISK_ANALYSIS, question, context)
    assert EvidenceCategory.SHAP_EVIDENCE in policy.excluded_evidence


def test_shap_inquiry_with_data_absent_includes_shap_category():
    """
    Case B: User asks about SHAP, but SHAP data is absent in context.
    The policy must still permit SHAP (not exclude it) so the validator or prompt
    builder doesn't fail, allowing Vector to explain the absence.
    """
    context = get_dummy_canonical_context()
    context["shap_factors"] = {} # absent
    question = "What SHAP features contributed?"
    policy = PolicyResolver.resolve(PromptRoute.EVIDENCE, question, context)
    
    assert EvidenceCategory.SHAP_EVIDENCE not in policy.excluded_evidence
    assert EvidenceCategory.SHAP_EVIDENCE in policy.optional_evidence


def test_shap_inquiry_with_data_present_includes_shap():
    """
    Case C: User asks about SHAP, and SHAP data is present. SHAP is allowed.
    """
    context = get_dummy_canonical_context()
    question = "What features contributed to the anomaly score?"
    policy = PolicyResolver.resolve(PromptRoute.EVIDENCE, question, context)
    
    assert EvidenceCategory.SHAP_EVIDENCE not in policy.excluded_evidence


# ---------------------------------------------------------------------------
# 4. RAG Relevance Protection & Category Filtering (Requirement 5, 8)
# ---------------------------------------------------------------------------
def test_retriever_filters_out_unrelated_compliance_frameworks():
    """
    Checks that categories like 'cis' or 'owasp' are filtered out inside the RAG
    layer when the query does not explicitly request compliance information.
    """
    # Simulate a query that has no compliance terms
    query = "powershell.exe launch"
    
    # We call retriever's category filtering logic internally or simulate it
    profile = KnowledgeRetriever.retrieve(PromptRoute.RISK_ANALYSIS, query=query)
    
    # Ensure no CIS or OWASP documents are returned if they had 0 score, or categories are filtered.
    # The retriever should have returned empty or only matched documents (none of the cis/owasp
    # playbooks match "powershell.exe launch" so they get scored 0.0 and filtered).
    for doc in profile:
        assert doc.category not in ["cis", "owasp"]


def test_retriever_rejects_zero_relevance_documents():
    """
    Verifies that the RAG retriever rejects any documents that score exactly
    0.0 against the search query (no false-positive fallback).
    """
    # Create mock document
    doc = KnowledgeDocument(
        id="owasp-a01",
        title="Broken Access Control",
        category="owasp",
        tags=["web", "access"],
        content="OWASP access control procedures...",
    )
    
    # The query "powershell" has no matches in doc
    terms = KnowledgeRetriever._normalize_query("powershell")
    score = KnowledgeRetriever._score_document(doc, "powershell", terms)
    
    assert score == 0.0


# ---------------------------------------------------------------------------
# 5. Citation Scoping (Requirement 8)
# ---------------------------------------------------------------------------
def test_citations_reflect_only_policy_permitted_evidence():
    """
    Verifies that the citation engine only citations permitted by the policy.
    Specifically, conversation history and SHAP must be omitted if excluded.
    """
    scoped_context = get_dummy_canonical_context()
    
    # Policy excludes conversation, SHAP, and timeline
    policy = ResponsePolicy(
        route=PromptRoute.RISK_ANALYSIS,
        scope=ResponseScope.FOCUSED,
        retrieval_decision=RetrievalDecision.SKIP,
        required_evidence=frozenset([EvidenceCategory.DETECTION_EVIDENCE]),
        optional_evidence=frozenset([EvidenceCategory.PROCESS_EVIDENCE]),
        excluded_evidence=frozenset([
            EvidenceCategory.SHAP_EVIDENCE,
            EvidenceCategory.CONVERSATION_HISTORY,
            EvidenceCategory.TIMELINE_EVIDENCE,
        ]),
        allowed_sections=frozenset(["Direct Explanation"]),
        forbidden_sections=frozenset(["### Business Impact"]),
    )

    citations = EvidenceCitationBuilder.build(scoped_context, policy=policy)

    assert "Behavioral Detection Evidence" in citations
    assert "Process Execution Evidence" in citations
    # Excluded categories must NOT be cited
    assert "SHAP Feature Attribution" not in citations
    assert "Conversation History" not in citations
    assert "Investigation Timeline" not in citations


# ---------------------------------------------------------------------------
# 6. Response Validator & False-Positive Avoidance (Requirement 6, 10, 13)
# ---------------------------------------------------------------------------
def test_validator_detects_explicit_forbidden_section_headings():
    """
    Validator rejects responses containing forbidden section headers like
    '### Business Impact' when excluded, but accepts contextual mentions.
    """
    policy = ResponsePolicy(
        route=PromptRoute.RISK_ANALYSIS,
        scope=ResponseScope.FOCUSED,
        retrieval_decision=RetrievalDecision.SKIP,
        required_evidence=frozenset(),
        optional_evidence=frozenset(),
        excluded_evidence=frozenset([EvidenceCategory.SHAP_EVIDENCE]),
        allowed_sections=frozenset(["Direct Explanation"]),
        forbidden_sections=frozenset([
            "### Business Impact",
            "### Compliance Impact"
        ]),
    )

    # 1. Contains a forbidden header -> MUST FAIL
    bad_text = (
        "This is a focused response.\n\n"
        "### Business Impact\n"
        "The business impact is severe.\n\n"
        "Evidence Used\n- Behavioral Detection Evidence"
    )
    with pytest.raises(ValueError, match="Forbidden section header"):
        ResponseValidator.validate_chat(bad_text, "severity: HIGH", policy=policy)

    # 2. Contextual use of words (e.g. 'persistence' or 'business') -> MUST PASS
    good_text = (
        "The PowerShell execution does not indicate immediate persistence. "
        "We see no business or compliance violations here.\n\n"
        "Evidence Used\n- Behavioral Detection Evidence"
    )
    # Should not raise any exceptions
    ResponseValidator.validate_chat(good_text, "severity: HIGH", policy=policy)


def test_validator_accepts_shap_absence_statements():
    """
    If SHAP is excluded, the validator allows the response to say
    'SHAP feature attribution is unavailable' (or similar), but rejects
    actual SHAP section headers.
    """
    policy = ResponsePolicy(
        route=PromptRoute.RISK_ANALYSIS,
        scope=ResponseScope.FOCUSED,
        retrieval_decision=RetrievalDecision.SKIP,
        required_evidence=frozenset(),
        optional_evidence=frozenset(),
        excluded_evidence=frozenset([EvidenceCategory.SHAP_EVIDENCE]),
        allowed_sections=frozenset(["Direct Explanation"]),
        forbidden_sections=frozenset(["### SHAP Feature Attribution"]),
    )

    # Mentions SHAP absence -> MUST PASS
    good_text = (
        "The severity is high. Note that SHAP evidence is unavailable for this case.\n\n"
        "Evidence Used\n- Behavioral Detection Evidence"
    )
    ResponseValidator.validate_chat(good_text, "severity: HIGH", policy=policy)

    # Contains a SHAP section header -> MUST FAIL
    bad_text = (
        "The severity is high.\n\n"
        "### SHAP Feature Attribution\n"
        "The cmdline contributed 80%.\n\n"
        "Evidence Used\n- Behavioral Detection Evidence"
    )
    with pytest.raises(
        ValueError,
        match="Forbidden section header|Response contains a SHAP section header"
    ):
        ResponseValidator.validate_chat(bad_text, "severity: HIGH", policy=policy)



def test_validator_still_rejects_contradicting_severity():
    """
    Existing severity consistency checks must still function: rejecting
    an assertion of aggregate LOW severity in a canonical HIGH case.
    """
    policy = ResponsePolicy(
        route=PromptRoute.RISK_ANALYSIS,
        scope=ResponseScope.FOCUSED,
        retrieval_decision=RetrievalDecision.SKIP,
        required_evidence=frozenset(),
        optional_evidence=frozenset(),
        excluded_evidence=frozenset(),
        allowed_sections=frozenset(["Direct Explanation"]),
        forbidden_sections=frozenset(["### Business Impact"]),
    )

    text = "The overall investigation severity is LOW.\n\nEvidence Used\n- Ev"
    with pytest.raises(ValueError, match="explicitly asserts aggregate"):
        ResponseValidator.validate_chat(text, "severity: HIGH", policy=policy)


# ---------------------------------------------------------------------------
# 7. Scoped Fallback AI (Requirement 9)
# ---------------------------------------------------------------------------
def test_fallback_chat_respects_focused_severity_explanation():
    """
    FallbackAI.generate_chat() uses actual investigation metadata and
    emits a concise, focused response instead of a generic report dump
    when policy.scope is FOCUSED.
    """
    class MockInvestigation:
        severity = "HIGH"
        risk_score = 95.0
        status = "NEW"
        alert_json = {
            "type": "PowerShell Encoded Command",
            "source": "srv-host-1",
            "details": {"processPath": "powershell.exe"},
        }
        analysis_json = {
            "context": {
                "mitre": {"technique_id": "T1059.001", "technique_name": "PowerShell"}
            }
        }

    policy = ResponsePolicy(
        route=PromptRoute.RISK_ANALYSIS,
        scope=ResponseScope.FOCUSED,
        retrieval_decision=RetrievalDecision.SKIP,
        required_evidence=frozenset(),
        optional_evidence=frozenset(),
        excluded_evidence=frozenset(),
        allowed_sections=frozenset(["Direct Explanation"]),
        forbidden_sections=frozenset(["### Business Impact"]),
    )

    reply = FallbackAI.generate_chat(
        MockInvestigation(),
        timeline=[],
        message="Why was this classified as high severity?",
        policy=policy,
    )

    assert "classified as HIGH severity with a risk score of 95.0%" in reply
    assert "matched the behavioral pattern for 'PowerShell Encoded Command'" in reply
    assert "MITRE ATT&CK T1059.001" in reply
    # Should contain the uncertainty caveat
    assert "does not by itself establish malicious intent" in reply
    # Must not contain generic template details
    assert "Broken Access Control" not in reply
    assert "### Business Impact" not in reply


# ---------------------------------------------------------------------------
# 8. Policy Invariants Validation (Requirement 12)
# ---------------------------------------------------------------------------
def test_policy_invariants_overlap_fails_early():
    """
    Verifies that PolicyResolver/ResponsePolicy fails early if required
    and excluded categories overlap.
    """
    with pytest.raises(ValueError, match="simultaneously REQUIRED and EXCLUDED"):
        ResponsePolicy(
            route=PromptRoute.GENERAL,
            scope=ResponseScope.STANDARD,
            retrieval_decision=RetrievalDecision.SKIP,
            required_evidence=frozenset([EvidenceCategory.SHAP_EVIDENCE]),
            optional_evidence=frozenset(),
            excluded_evidence=frozenset([EvidenceCategory.SHAP_EVIDENCE]), # overlap
            allowed_sections=frozenset(["Executive Summary"]),
            forbidden_sections=frozenset(["### Business Impact"]),
        )


def test_policy_invariants_focused_requires_forbidden_sections():
    """
    FOCUSED scope requires explicitly defined forbidden sections.
    """
    with pytest.raises(ValueError, match="FOCUSED scope requires explicitly defined"):
        ResponsePolicy(
            route=PromptRoute.GENERAL,
            scope=ResponseScope.FOCUSED,
            retrieval_decision=RetrievalDecision.SKIP,
            required_evidence=frozenset(),
            optional_evidence=frozenset(),
            excluded_evidence=frozenset(),
            allowed_sections=frozenset(["Executive Summary"]),
            forbidden_sections=frozenset(), # empty forbidden sections for FOCUSED
        )


# ---------------------------------------------------------------------------
# 9. Prompt Builder Instruction Grounding & Severity Validation (Requirement 6, 7)
# ---------------------------------------------------------------------------
def test_prompt_builder_risk_analysis_suppresses_shap_and_business_impact():
    """
    Verify RiskAnalysisPromptBuilder hides SHAP and business impact guidelines
    when the policy specifies focused scope.
    """
    policy = ResponsePolicy(
        route=PromptRoute.RISK_ANALYSIS,
        scope=ResponseScope.FOCUSED,
        retrieval_decision=RetrievalDecision.SKIP,
        required_evidence=frozenset(),
        optional_evidence=frozenset(),
        excluded_evidence=frozenset([EvidenceCategory.SHAP_EVIDENCE]),
        allowed_sections=frozenset(["Direct Explanation"]),
        forbidden_sections=frozenset(["### SHAP Feature Attribution", "### Business Impact"]),
    )

    builder = RiskAnalysisPromptBuilder(
        knowledge_doc="Severity: HIGH",
        question="Why was severity HIGH?",
        policy=policy,
    )
    
    sys_prompt = builder.system_instruction
    assert "focused risk analysis" in sys_prompt
    assert "Do NOT generate sections or essays on business impact" in sys_prompt
    assert "Do NOT generate SHAP feature attribution sections" in sys_prompt


# ---------------------------------------------------------------------------
# 10. Golden Behavior Integration Test (Requirement 14)
# ---------------------------------------------------------------------------
def test_golden_behavioral_scoping_integration():
    """
    Primary Sprint 15E acceptance test using the PowerShell Encoded Command scenario.
    Asserts structural/semantic routing and scoping invariants rather than brittle
    exact-string wording.
    """
    canonical_context = get_dummy_canonical_context()
    question = "Why was this investigation classified as high severity?"
    
    # 1. Resolve policy
    policy = PolicyResolver.resolve(PromptRoute.RISK_ANALYSIS, question, canonical_context)
    
    assert policy.route == PromptRoute.RISK_ANALYSIS
    assert policy.scope == ResponseScope.FOCUSED
    assert policy.retrieval_decision == RetrievalDecision.SKIP
    
    # 2. Scope projection
    scoped_context = ContextScoper.project(canonical_context, policy)
    
    # Immutability check
    assert canonical_context["shap_factors"] != {}
    # Scoped projection checks
    assert scoped_context["shap_factors"] == {}
    assert scoped_context["timeline"] == []
    assert scoped_context["conversation"] == {}
    
    # 3. Prompt building
    from app.services.llm.knowledge_pack import KnowledgePack
    from app.services.llm.prompt import PromptBuilder
    from app.services.llm.behavioral_context import BehavioralReasoningContext
    
    beh_ctx = BehavioralReasoningContext.from_context(scoped_context)
    knowledge_doc = KnowledgePack.generate(scoped_context)
    
    prompt = PromptBuilder.chat(
        knowledge_doc, question, PromptRoute.RISK_ANALYSIS,
        behavioral_context=beh_ctx, policy=policy
    )
    
    # Check that prompt suppresses business impact, compliance, and SHAP
    assert "Do NOT generate sections or essays on business impact" in prompt
    assert "Do NOT generate SHAP feature attribution sections" in prompt
    assert "OWASP" not in knowledge_doc
    assert "CIS" not in knowledge_doc
    
    # 4. Citations
    citations = EvidenceCitationBuilder.build(scoped_context, policy=policy)
    assert "Conversation History" not in citations
    assert "Investigation Timeline" not in citations
    assert "SHAP Feature Attribution" not in citations
    assert all("Knowledge:" not in c for c in citations)  # no RAG documents cited

