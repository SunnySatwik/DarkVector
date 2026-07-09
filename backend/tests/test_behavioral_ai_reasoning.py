import time
import pytest
from unittest.mock import patch

from app.services.llm.behavioral_context import BehavioralReasoningContext
from app.services.llm.rag.query_builder import RetrievalQueryBuilder
from app.services.llm.rag.retriever import KnowledgeRetriever
from app.services.llm.rag.models import KnowledgeDocument
from app.services.llm.prompt.base import BasePromptBuilder
from app.services.llm.prompt.prompt_builder import PromptBuilder
from app.services.llm.prompt.builders.explain_attack import ExplainAttackPromptBuilder
from app.services.llm.prompt.builders.risk_analysis import RiskAnalysisPromptBuilder
from app.services.llm.prompt.builders.remediation import RemediationPromptBuilder
from app.services.llm.prompt.builders.mitre import MitrePromptBuilder
from app.services.llm.prompt.builders.timeline import TimelinePromptBuilder
from app.services.llm.prompt.builders.evidence import EvidencePromptBuilder
from app.services.llm.prompt.builders.general import GeneralPromptBuilder
from app.services.llm.citations import EvidenceCitationBuilder
from app.services.llm.response_validator import ResponseValidator
from app.services.llm.llm_service import LLMService
from app.services.llm.routing.route import PromptRoute


# Dummy models/context data setup
@pytest.fixture
def legacy_context():
    return {
        "investigation": {"investigation_id": "INV-LEGACY", "title": "Anomaly Alert"},
        "alert": {"type": "Legacy alert"},
    }


@pytest.fixture
def behavioral_context_data():
    return {
        "behavioral_context": {
            "correlation_id": "corr-101",
            "primary_detection": {
                "id": "det-1",
                "title": "Encoded PowerShell Rule",
                "rule_id": "rule_ps",
                "severity": "CRITICAL",
                "confidence": 95.0,
                "process_guid": "guid-1",
                "timestamp": 100.0,
                "mitre_technique": "T1059.001",
                "mitre_tactic": "Execution",
            },
            "detections": [
                {
                    "id": "det-1",
                    "title": "Encoded PowerShell Rule",
                    "rule_id": "rule_ps",
                    "severity": "CRITICAL",
                    "confidence": 95.0,
                    "process_guid": "guid-1",
                    "timestamp": 100.0,
                    "mitre_technique": "T1059.001",
                    "mitre_tactic": "Execution",
                },
                {
                    "id": "det-2",
                    "title": "Certutil Download Rule",
                    "rule_id": "rule_certutil",
                    "severity": "LOW",
                    "confidence": 40.0,
                    "process_guid": "guid-2",
                    "timestamp": 120.0,
                    "mitre_technique": "T1105",
                    "mitre_tactic": "Command and Control",
                },
            ],
        },
        "correlation_context": {
            "correlation_id": "corr-101",
            "aggregate_severity": "CRITICAL",
            "aggregate_confidence": 95.0,
            "first_seen": 100.0,
            "last_seen": 120.0,
            "duration": 20.0,
        },
        "process_evidence": [
            {
                "process_guid": "guid-1",
                "process_name": "powershell.exe",
                "cmdline": "powershell.exe -enc XXX",
                "pid": 1234,
            },
            {
                "process_guid": "guid-2",
                "process_name": "certutil.exe",
                "cmdline": "certutil.exe -urlcache -f url file",
                "pid": 5678,
            },
        ],
        "mitre_mappings": [
            {
                "technique_id": "T1059.001",
                "technique_name": "PowerShell",
                "tactic": "Execution",
            },
            {
                "technique_id": "T1105",
                "technique_name": "Ingress Tool Transfer",
                "tactic": "Command and Control",
            },
        ],
        "recommendations": ["Isolate host", "Audit certutil cached files"],
    }


# ====================================================================
# TEST SCENARIOS
# ====================================================================


# 1. Legacy context produces non-behavioral reasoning context
def test_legacy_context_non_behavioral(legacy_context):
    beh_ctx = BehavioralReasoningContext.from_context(legacy_context)
    assert not beh_ctx.is_behavioral
    assert beh_ctx.correlation_id is None
    assert len(beh_ctx.detections) == 0


# 2. Single behavioral detection reasoning context
def test_single_behavioral_reasoning_context():
    context = {
        "behavioral_context": {
            "correlation_id": "det-1",
            "primary_detection": {"id": "det-1", "severity": "HIGH"},
            "detections": [{"id": "det-1", "severity": "HIGH"}],
        }
    }
    beh_ctx = BehavioralReasoningContext.from_context(context)
    assert beh_ctx.is_behavioral
    assert beh_ctx.correlation_id == "det-1"
    assert len(beh_ctx.detections) == 1


# 3. Correlated detection reasoning context
def test_correlated_reasoning_context(behavioral_context_data):
    beh_ctx = BehavioralReasoningContext.from_context(behavioral_context_data)
    assert beh_ctx.is_behavioral
    assert beh_ctx.correlation_id == "corr-101"
    assert beh_ctx.detection_count == 2
    assert beh_ctx.aggregate_severity == "CRITICAL"


# 4. Immutable tuple conversion
def test_immutable_tuple_conversion(behavioral_context_data):
    beh_ctx = BehavioralReasoningContext.from_context(behavioral_context_data)
    assert isinstance(beh_ctx.detections, tuple)
    assert isinstance(beh_ctx.process_evidence, tuple)
    assert isinstance(beh_ctx.mitre_mappings, tuple)
    assert isinstance(beh_ctx.recommendations, tuple)


# 5. Missing optional behavioral fields
def test_missing_optional_behavioral_fields():
    context = {
        "behavioral_context": {
            "correlation_id": "det-1",
            "detections": [{"id": "det-1"}],
        }
    }
    beh_ctx = BehavioralReasoningContext.from_context(context)
    assert beh_ctx.is_behavioral
    assert beh_ctx.primary_detection is None
    assert beh_ctx.first_seen is None
    assert beh_ctx.duration_seconds is None


# 6. Behavioral prompt contains grounding rules
def test_behavioral_prompt_contains_grounding_rules(behavioral_context_data):
    beh_ctx = BehavioralReasoningContext.from_context(behavioral_context_data)
    builder = GeneralPromptBuilder(
        "Knowledge doc text", behavioral_context=beh_ctx
    )
    prompt = builder.build()
    assert "STRICT GROUNDING INSTRUCTIONS:" in prompt
    assert "Separate OBSERVED FACTS from ANALYST INFERENCE." in prompt
    assert "Never claim a process executed unless present in evidence." in prompt


# 7. Legacy prompt remains backward compatible
def test_legacy_prompt_backward_compatible(legacy_context):
    beh_ctx = BehavioralReasoningContext.from_context(legacy_context)
    builder = GeneralPromptBuilder(
        "Knowledge doc text", behavioral_context=beh_ctx
    )
    prompt = builder.build()
    assert "STRICT GROUNDING INSTRUCTIONS:" not in prompt


# 8. Behavioral summary task
def test_behavioral_summary_task(behavioral_context_data):
    beh_ctx = BehavioralReasoningContext.from_context(behavioral_context_data)
    prompt = PromptBuilder.summary("Knowledge doc text", beh_ctx)
    assert "What was detected and how the detections are related" in prompt
    assert "Important process execution evidence" in prompt


# 9. Behavioral report sections
def test_behavioral_report_sections(behavioral_context_data):
    beh_ctx = BehavioralReasoningContext.from_context(behavioral_context_data)
    prompt = PromptBuilder.report("Knowledge doc text", beh_ctx)
    assert "### Executive Summary" in prompt
    assert "### Detection & Correlation Findings" in prompt
    assert "### Process Execution Analysis" in prompt
    assert "### MITRE ATT&CK Assessment" in prompt
    assert "### Evidence Assessment" in prompt
    assert "### Analyst Recommendations" in prompt
    assert "### Investigation Limitations" in prompt


# 10. Explain attack behavioral grounding
def test_explain_attack_grounding(behavioral_context_data):
    beh_ctx = BehavioralReasoningContext.from_context(behavioral_context_data)
    builder = ExplainAttackPromptBuilder(
        "Knowledge doc", behavioral_context=beh_ctx
    )
    prompt = builder.build()
    assert "Reconstruct only the attack sequence" in prompt
    assert "Distinguish observed execution order" in prompt


# 11. Risk analysis behavioral grounding
def test_risk_analysis_grounding(behavioral_context_data):
    beh_ctx = BehavioralReasoningContext.from_context(behavioral_context_data)
    builder = RiskAnalysisPromptBuilder(
        "Knowledge doc", behavioral_context=beh_ctx
    )
    prompt = builder.build()
    assert "Assess aggregate severity separately" in prompt
    assert "Never convert confidence directly into probability" in prompt


# 12. MITRE behavioral grounding
def test_mitre_grounding(behavioral_context_data):
    beh_ctx = BehavioralReasoningContext.from_context(behavioral_context_data)
    builder = MitrePromptBuilder("Knowledge doc", behavioral_context=beh_ctx)
    prompt = builder.build()
    assert "Discuss every persisted MITRE mapping" in prompt
    assert "Distinguish observed behavior from ATT&CK interpretation" in prompt


# 13. Timeline behavioral grounding
def test_timeline_grounding(behavioral_context_data):
    beh_ctx = BehavioralReasoningContext.from_context(behavioral_context_data)
    builder = TimelinePromptBuilder("Knowledge doc", behavioral_context=beh_ctx)
    prompt = builder.build()
    assert "Use persisted timestamps and timeline events" in prompt
    assert (
        "Distinguish process execution timestamps from investigation timeline events"
        in prompt
    )


# 14. Evidence behavioral grounding
def test_evidence_grounding(behavioral_context_data):
    beh_ctx = BehavioralReasoningContext.from_context(behavioral_context_data)
    builder = EvidencePromptBuilder("Knowledge doc", behavioral_context=beh_ctx)
    prompt = builder.build()
    assert "Categorize evidence into detections" in prompt
    assert "Never fabricate IOCs" in prompt


# 15. Retrieval query from analyst question
def test_retrieval_query_from_question(behavioral_context_data):
    beh_ctx = BehavioralReasoningContext.from_context(behavioral_context_data)
    query = RetrievalQueryBuilder.build("Who ran PowerShell?", beh_ctx)
    assert query.startswith("Who ran PowerShell?")


# 16. Retrieval query from behavioral context
def test_retrieval_query_from_context(behavioral_context_data):
    beh_ctx = BehavioralReasoningContext.from_context(behavioral_context_data)
    query = RetrievalQueryBuilder.build(None, beh_ctx)
    assert "Encoded PowerShell Rule" in query
    assert "rule_ps" in query
    assert "powershell.exe" in query
    assert "T1059.001" in query


# 17. Retrieval query deterministic ordering
def test_query_deterministic_ordering(behavioral_context_data):
    beh_ctx = BehavioralReasoningContext.from_context(behavioral_context_data)
    query_1 = RetrievalQueryBuilder.build("question", beh_ctx)
    query_2 = RetrievalQueryBuilder.build("question", beh_ctx)
    assert query_1 == query_2


# 18. Retrieval query deduplication
def test_query_deduplication(behavioral_context_data):
    beh_ctx = BehavioralReasoningContext.from_context(behavioral_context_data)
    query = RetrievalQueryBuilder.build("rule_ps", beh_ctx)
    # Check that rule_ps is not duplicated in the generated query
    assert query.count("rule_ps") == 1


# 19. Retrieval query 2000-character cap
def test_query_character_cap(behavioral_context_data):
    beh_ctx = BehavioralReasoningContext.from_context(behavioral_context_data)
    long_question = "x" * 3000
    query = RetrievalQueryBuilder.build(long_question, beh_ctx)
    assert len(query) == 2000


# 20. RAG technique ID relevance scoring
def test_rag_technique_relevance_scoring():
    doc_1 = KnowledgeDocument(
        id="playbook_ps",
        title="PowerShell Execution Mitigation",
        category="procedures",
        tags=["T1059.001", "scripting"],
        content="MITRE ATT&CK technique T1059.001 procedures.",
    )
    doc_2 = KnowledgeDocument(
        id="playbook_ping",
        title="ICMP Ping Verification",
        category="procedures",
        tags=["network"],
        content="Verify network activity.",
    )

    query = "Analysis of T1059.001 technique"
    terms = KnowledgeRetriever._normalize_query(query)

    score_1 = KnowledgeRetriever._score_document(doc_1, query, terms)
    score_2 = KnowledgeRetriever._score_document(doc_2, query, terms)

    # doc_1 should score significantly higher due to technique ID match (+10) + word match (+1)
    assert score_1 >= 10.0
    assert score_2 == 0.0


# 21. RAG tag relevance scoring
def test_rag_tag_relevance_scoring():
    doc = KnowledgeDocument(
        id="doc1", title="Title", category="procedures", tags=["mitre", "ps"]
    )
    score = KnowledgeRetriever._score_document(doc, "mitre", {"mitre"})
    # Match in tags is +4
    assert score == 4.0


# 22. RAG title relevance scoring
def test_rag_title_relevance_scoring():
    doc = KnowledgeDocument(
        id="doc1", title="Suspicious certutil execution", category="procedures"
    )
    score = KnowledgeRetriever._score_document(doc, "certutil", {"certutil"})
    # Match in title is +3
    assert score == 3.0


# 23. RAG deterministic tie-breaking
def test_rag_deterministic_tie_breaking():
    # Two documents with zero relevance scores and equal authority rank (community)
    doc_a = KnowledgeDocument(id="doc_z_last", title="Last Doc", category="procedures")
    doc_b = KnowledgeDocument(id="doc_a_first", title="First Doc", category="procedures")

    with patch(
        "app.services.llm.rag.retriever.MarkdownLoader.load_directory"
    ) as mock_load:
        mock_load.return_value = [doc_a, doc_b]

        # Retrieve documents with no matching query keywords
        retrieved = KnowledgeRetriever.retrieve(
            PromptRoute.GENERAL, query="no_match_query"
        )
        assert len(retrieved) == 2
        # Should sort doc_a_first before doc_z_last lexicographically by ID!
        assert retrieved[0].id == "doc_a_first"
        assert retrieved[1].id == "doc_z_last"


# 24. Unsupported MITRE response rejection
def test_unsupported_mitre_response_rejection():
    knowledge_doc = "Technique T1059.001 (PowerShell) mapped."
    # Mentioning hallucinated technique T9999
    response = "The attacker used T9999 for persistence."
    with pytest.raises(ValueError) as exc:
        ResponseValidator.validate_mitre_consistency(response, knowledge_doc)
    assert "Hallucinated MITRE Technique ID detected" in str(exc.value)


# 25. Supported MITRE response acceptance
def test_supported_mitre_response_acceptance():
    knowledge_doc = "Technique T1059.001 (PowerShell) mapped."
    response = "The attacker used T1059.001."
    # Should not raise exception
    ResponseValidator.validate_mitre_consistency(response, knowledge_doc)


# 26. Unsupported executable claim rejection
def test_unsupported_executable_claim_rejection():
    knowledge_doc = "Process powershell.exe executed command."
    response = "I also observed the execution of netcat.exe."
    with pytest.raises(ValueError) as exc:
        ResponseValidator.validate_process_claims(response, knowledge_doc)
    assert "Unsupported process/file claim detected: 'netcat.exe'" in str(
        exc.value
    )


# 27. Supported process claim acceptance
def test_supported_process_claim_acceptance():
    knowledge_doc = "Process powershell.exe executed command."
    response = "The command was run via powershell.exe."
    ResponseValidator.validate_process_claims(response, knowledge_doc)


# 28. Member severity discussion acceptance
def test_member_severity_discussion_acceptance():
    knowledge_doc = "severity: CRITICAL\nRule certutil matches with severity: LOW."
    response = "The certutil detection rule generated a LOW severity alert, but the overall case is CRITICAL."
    # Should not raise exception because the sentence discusses a local detection
    ResponseValidator.validate_severity_consistency(response, knowledge_doc)


# 29. Incorrect aggregate severity rejection
def test_incorrect_aggregate_severity_rejection():
    knowledge_doc = "severity: CRITICAL\nRule certutil matches with severity: LOW."
    response = "The overall investigation is LOW."
    with pytest.raises(ValueError) as exc:
        ResponseValidator.validate_severity_consistency(response, knowledge_doc)
    assert "Contradicting severity 'LOW' detected for the overall investigation" in str(
        exc.value
    )


# 30. Improper confidence certainty rejection
def test_improper_confidence_rejection():
    response = "This detection has 100% confirmed compromise."
    with pytest.raises(ValueError) as exc:
        ResponseValidator.validate_confidence_semantics(response)
    assert "Prohibited absolute certainty claim detected" in str(exc.value)


# 31. Evidence uncertainty acceptance
def test_evidence_uncertainty_acceptance():
    # Shorthand rule check. "cannot determine" should no longer raise ValueError
    ResponseValidator.validate_placeholders(
        "I cannot determine attacker intent from available evidence."
    )


# 32. Behavioral chat orchestration
@patch("app.services.llm.llm_service.LLMService._generate")
@patch("app.services.context_builder.ContextBuilder.build")
def test_behavioral_chat_orchestration(mock_ctx_build, mock_generate, behavioral_context_data):
    mock_ctx_build.return_value = {
        "investigation": {"investigation_id": "INV-101", "status": "new", "severity": "CRITICAL"},
        **behavioral_context_data,
    }
    mock_generate.return_value = "Vector analysis reply.\n\nEvidence Used\n• Behavioral Detection Evidence"

    reply = LLMService.chat(None, "INV-101", "Describe the behavior.")
    assert "Vector analysis reply" in reply
    assert "Evidence Used" in reply
    mock_generate.assert_called_once()


# 33. Behavioral summary orchestration
@patch("app.services.llm.llm_service.LLMService._generate")
@patch("app.services.context_builder.ContextBuilder.build")
def test_behavioral_summary_orchestration(mock_ctx_build, mock_generate, behavioral_context_data):
    mock_ctx_build.return_value = {
        "investigation": {"investigation_id": "INV-101", "status": "new", "severity": "CRITICAL"},
        **behavioral_context_data,
    }
    mock_generate.return_value = "Vector summary reply.\n\nEvidence Used\n• Behavioral Detection Evidence"

    reply = LLMService.generate_summary({}, 95.0, "CRITICAL", 0.0)
    assert "Vector summary" in reply
    mock_generate.assert_called_once()


# 34. Behavioral report orchestration
@patch("app.services.llm.llm_service.LLMService._generate")
@patch("app.services.context_builder.ContextBuilder.build")
def test_behavioral_report_orchestration(mock_ctx_build, mock_generate, behavioral_context_data):
    # Enforce behavioral context header in mock doc
    mock_ctx_build.return_value = {
        "investigation": {"investigation_id": "INV-101", "status": "new", "severity": "CRITICAL"},
        **behavioral_context_data,
    }
    # Mocking generate to return all behavioral markdown report sections
    mock_generate.return_value = (
        "### Executive Summary\nSummary\n"
        "### Detection & Correlation Findings\nFindings\n"
        "### Process Execution Analysis\nAnalysis\n"
        "### MITRE ATT&CK Assessment\nMITRE\n"
        "### Evidence Assessment\nEvidence\n"
        "### Analyst Recommendations\nRecs\n"
        "### Investigation Limitations\nLimitations\n\n"
        "Evidence Used\n• Behavioral Detection Evidence"
    )

    class DummyInvestigation:
        alert_json = {}
        analysis_json = {}
        risk_score = 95.0
        severity = "CRITICAL"

    reply = LLMService.generate_report(None, DummyInvestigation(), [])
    assert "Executive Summary" in reply
    assert "Detection & Correlation Findings" in reply
    assert "Process Execution Analysis" in reply
    mock_generate.assert_called_once()


# 35. Legacy investigation regression
@patch("app.services.llm.llm_service.LLMService._generate")
@patch("app.services.context_builder.ContextBuilder.build")
def test_legacy_investigation_regression(mock_ctx_build, mock_generate, legacy_context):
    mock_ctx_build.return_value = legacy_context
    mock_generate.return_value = (
        "### Executive Summary\nSummary\n"
        "### Technical Findings\nFindings\n"
        "### Business Impact\nImpact\n"
        "### Recommendations\nRecs\n\n"
        "Evidence Used\n• Timeline"
    )

    class DummyInvestigation:
        alert_json = {}
        analysis_json = {}
        risk_score = 80.0
        severity = "HIGH"

    reply = LLMService.generate_report(None, DummyInvestigation(), [])
    assert "Technical Findings" in reply
    assert "Business Impact" in reply
    assert "Detection & Correlation Findings" not in reply


# 36. Empty RAG result safety
def test_empty_rag_result_safety():
    with patch(
        "app.services.llm.rag.retriever.MarkdownLoader.load_directory"
    ) as mock_load:
        mock_load.return_value = []
        retrieved = KnowledgeRetriever.retrieve(
            PromptRoute.GENERAL, query="some_query"
        )
        assert retrieved == []


# 37. LLM failure fallback safety
@patch("app.services.llm.llm_service.LLMService._generate")
@patch("app.services.context_builder.ContextBuilder.build")
def test_llm_failure_fallback_safety(mock_ctx_build, mock_generate, legacy_context):
    mock_ctx_build.return_value = legacy_context
    # LLM throws error
    mock_generate.side_effect = RuntimeError("API down")

    reply = LLMService.chat(None, "INV-100", "test question")
    # Should fallback gracefully to FallbackAI template
    assert "What would you like to focus on next?" in reply


# 38. Invalid response fallback safety
@patch("app.services.llm.llm_service.LLMService._generate")
@patch("app.services.context_builder.ContextBuilder.build")
def test_invalid_response_fallback_safety(mock_ctx_build, mock_generate, legacy_context):
    mock_ctx_build.return_value = legacy_context
    # Returns raw response without required headings or invalid parameters
    mock_generate.return_value = "Violates validator rule."

    class DummyInvestigation:
        alert_json = {}
        analysis_json = {}
        risk_score = 80.0
        severity = "HIGH"

    reply = LLMService.generate_report(None, DummyInvestigation(), [])
    # Should fallback gracefully
    assert "Executive Summary" in reply
    assert "Business Impact" in reply


# 39. Deterministic citation generation
def test_deterministic_citation_generation(behavioral_context_data):
    # Ensure RAG documents are cited correctly
    doc = KnowledgeDocument(
        id="tech_doc", title="Powershell playbook", category="procedures", source="MITRE"
    )
    behavioral_context_data["retrieved_documents"] = [doc]

    citations = EvidenceCitationBuilder.build(behavioral_context_data)
    assert "Knowledge: Powershell playbook (MITRE)" in citations


# 40. Performance benchmark
def test_performance_benchmark():
    # Preparation context: 100 detections, 500 process evidence entries
    dets = []
    for i in range(100):
        dets.append({
            "id": f"det-{i}",
            "rule_id": f"rule-{i % 5}",
            "title": f"Title {i}",
            "severity": "CRITICAL" if i == 0 else "LOW",
            "confidence": 90.0,
            "process_guid": f"guid-{i}",
            "timestamp": 100.0 + i,
            "mitre_technique": "T1059",
            "mitre_tactic": "Execution",
        })

    processes = []
    for j in range(500):
        processes.append({
            "process_guid": f"guid-{j}",
            "process_name": f"proc-{j}.exe",
            "cmdline": f"proc.exe --param-{j}",
            "pid": 2000 + j,
        })

    context_data = {
        "behavioral_context": {
            "correlation_id": "corr-perf-test",
            "primary_detection": dets[0],
            "detections": dets,
        },
        "correlation_context": {
            "correlation_id": "corr-perf-test",
            "aggregate_severity": "CRITICAL",
            "aggregate_confidence": 90.0,
            "first_seen": 100.0,
            "last_seen": 200.0,
            "duration": 100.0,
        },
        "process_evidence": processes,
        "mitre_mappings": [
            {
                "technique_id": "T1059",
                "technique_name": "Command and Scripting Interpreter",
                "tactic": "Execution",
            }
        ],
        "recommendations": ["Contain"],
    }

    start = time.perf_counter()

    # Perform the preparation operations
    beh_ctx = BehavioralReasoningContext.from_context(context_data)
    query = RetrievalQueryBuilder.build("an analyst question", beh_ctx)

    # RAG docs retrieve mock
    retrieved = KnowledgeRetriever.retrieve(PromptRoute.GENERAL, query)

    # Prompt generation
    PromptBuilder.chat("Knowledge doc", "question", PromptRoute.GENERAL, beh_ctx)

    elapsed_ms = (time.perf_counter() - start) * 1000
    print(f"\n[AI Reasoning Performance] Elapsed: {elapsed_ms:.2f} ms")

    # Assert under 50 ms
    assert elapsed_ms < 50.0
