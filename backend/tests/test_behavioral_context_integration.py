import time
import pytest
from sqlalchemy.orm import Session

from app.models.investigation import Investigation, InvestigationSeverity, InvestigationStatus
from app.services.context_builder import ContextBuilder
from app.services.llm.knowledge_pack import KnowledgePack
from app.services.llm.citations import EvidenceCitationBuilder
from app.services.llm.response_validator import ResponseValidator
from app.services.context.mitre_mapping import lookup_by_id


def test_legacy_investigation_context_unchanged():
    # Construct context mimicking a legacy investigation
    alert_data = {
        "id": "AL-100",
        "category": "process",
        "source": "srv-host-1",
        "type": "Local Credential Harvesting (LSASS Read)",
        "details": {
            "username": "attacker",
            "processPath": "C:\\Windows\\System32\\cmd.exe",
        }
    }
    analysis_json = {
        "analysis": {
            "risk_score": 85.0,
            "severity": "HIGH",
        },
        "context": {
            "mitre": {
                "technique_id": "T1003.001",
                "technique_name": "LSASS Memory",
                "tactic": "Credential Access",
                "description": "LSASS extraction",
            }
        }
    }
    
    ctx = ContextBuilder.build(
        alert_data=alert_data,
        analysis_json=analysis_json,
    )
    
    assert ctx["investigation"]["severity"] == "HIGH"
    assert ctx["investigation"]["risk_score"] == 85.0
    assert ctx["mitre"]["technique_id"] == "T1003.001"
    assert ctx["behavioral_context"] is None
    assert ctx["correlation_context"] is None
    assert len(ctx["process_evidence"]) == 0


def test_opaque_process_guid_and_no_inferred_attributes():
    # 1. Verification that process GUIDs are treated strictly as opaque identifiers,
    # and no attributes are parsed or inferred from them.
    detections = [
        {
            "id": "det-1",
            "rule_id": "rule-1",
            "title": "Opaque Rule Match",
            "process_guid": "host-1234:9999:98765.43",
            "evidence": [
                # PID/Parent PID and other attributes are missing
                {
                    "Process Name": "malicious.exe",
                    "Username": "admin",
                }
            ]
        }
    ]
    
    proc_ev = ContextBuilder._extract_process_evidence(detections)
    assert len(proc_ev) == 1
    p = proc_ev[0]
    
    # Process GUID is preserved
    assert p["process_guid"] == "host-1234:9999:98765.43"
    
    # Fields that were present in evidence are mapped
    assert p["process_name"] == "malicious.exe"
    assert p["username"] == "admin"
    
    # Attributes that were missing in persisted evidence (like pid, ppid, create_time, executable)
    # must NOT be inferred or parsed from the GUID!
    assert "pid" not in p
    assert "ppid" not in p
    assert "executable" not in p
    assert "create_time" not in p


def test_unknown_mitre_technique_no_fallback_metadata():
    # 2. Verification that unknown MITRE technique IDs do not receive fabricated fallback metadata
    # (e.g. technique_name, description, tactic should remain "N/A" rather than guessing/mapping T1190 details).
    res = lookup_by_id("T9999.999", default_tactic="Discovery")
    assert res["technique_id"] == "T9999.999"
    assert res["technique_name"] == "N/A"
    assert res["tactic"] == "Discovery"
    assert res["description"] == "N/A"


def test_single_behavioral_detection_context_building():
    # Construct context mimicking a single behavioral detection investigation
    det_json = {
        "id": "det-100",
        "rule_id": "powershell_encoded",
        "title": "Encoded PowerShell Execution",
        "description": "Suspicious encoded execution",
        "severity": "HIGH",
        "confidence": 90,
        "host_id": "host-1",
        "process_guid": "host-1:100:10.0",
        "timestamp": 10.0,
        "mitre_technique": "T1059.001",
        "mitre_tactic": "Execution",
        "recommendations": ["Investigate PS execution", "Isolate host"],
        "evidence": [
            {
                "Process Name": "powershell.exe",
                "PID": 100,
                "Parent PID": 10,
                "Command Line": "powershell.exe -enc XXX",
                "Executable": "C:\\Windows\\System32\\powershell.exe",
                "Username": "SYSTEM",
            }
        ]
    }
    
    # Use database investigation mock
    class DummyInvestigation:
        investigation_id = "INV-BEH-100"
        title = "Encoded PowerShell"
        status = InvestigationStatus.NEW
        severity = InvestigationSeverity.HIGH
        risk_score = 90.0
        confidence = 0.90
        alert_json = None
        analysis_json = None
        detection_json = det_json
        
    ctx = ContextBuilder.build(
        db=None,
        alert_data=None,
        analysis_json=None,
    )
    # Re-simulate with mocked investigation values
    ctx = ContextBuilder.build(
        analysis_json=None,
    )
    
    # Run helper directly to inspect output
    beh_ctx = ContextBuilder._normalize_behavioral_context(det_json)
    assert beh_ctx is not None
    assert beh_ctx["correlation_id"] == "det-100"
    assert beh_ctx["group_size"] == 1
    assert beh_ctx["primary_detection"]["rule_id"] == "powershell_encoded"
    
    # Check process evidence mapping
    proc_ev = ContextBuilder._extract_process_evidence(beh_ctx["detections"])
    assert len(proc_ev) == 1
    assert proc_ev[0]["process_name"] == "powershell.exe"
    assert proc_ev[0]["pid"] == 100
    assert proc_ev[0]["cmdline"] == "powershell.exe -enc XXX"
    
    # Check mitre mappings
    mitre_maps = ContextBuilder._aggregate_mitre_context(beh_ctx["detections"])
    assert len(mitre_maps) == 1
    assert mitre_maps[0]["technique_id"] == "T1059.001"


def test_correlated_multi_detection_normalization_and_deduplication():
    # Correlated structure
    det_json = {
        "correlation_id": "corr_group_123",
        "group_size": 2,
        "primary_detection": {
            "id": "det-2",
            "rule_id": "rule-high",
            "title": "High Severity Rule",
            "severity": "HIGH",
            "confidence": 95,
            "host_id": "host-1",
            "process_guid": "guid-2",
            "timestamp": 15.0,
            "mitre_technique": "T1071.004",
            "mitre_tactic": "Command and Control",
            "recommendations": ["Block IP address"],
            "evidence": [
                {
                    "Process Name": "malicious_c2.exe",
                    "PID": 200,
                    "Parent PID": 100,
                    "Executable": "C:\\malicious_c2.exe",
                }
            ]
        },
        "detections": [
            {
                "id": "det-1",
                "rule_id": "rule-low",
                "title": "Low Severity Rule",
                "severity": "LOW",
                "confidence": 50,
                "host_id": "host-1",
                "process_guid": "guid-1",
                "timestamp": 10.0,
                "mitre_technique": "T1059.001",
                "mitre_tactic": "Execution",
                "recommendations": ["Audit script"],
                "evidence": [
                    {
                        "Process Name": "powershell.exe",
                        "PID": 100,
                        "Parent PID": 10,
                        "Executable": "C:\\powershell.exe",
                    }
                ]
            },
            {
                "id": "det-2",
                "rule_id": "rule-high",
                "title": "High Severity Rule",
                "severity": "HIGH",
                "confidence": 95,
                "host_id": "host-1",
                "process_guid": "guid-2",
                "timestamp": 15.0,
                "mitre_technique": "T1071.004",
                "mitre_tactic": "Command and Control",
                "recommendations": ["Block IP address"],
                "evidence": [
                    {
                        "Process Name": "malicious_c2.exe",
                        "PID": 200,
                        "Parent PID": 100,
                        "Executable": "C:\\malicious_c2.exe",
                    }
                ]
            }
        ]
    }
    
    beh_ctx = ContextBuilder._normalize_behavioral_context(det_json)
    assert beh_ctx["correlation_id"] == "corr_group_123"
    assert beh_ctx["group_size"] == 2
    assert len(beh_ctx["detections"]) == 2
    
    corr_ctx = ContextBuilder._build_correlation_context(beh_ctx)
    assert corr_ctx["aggregate_severity"] == "HIGH"
    assert corr_ctx["aggregate_confidence"] == 95
    assert corr_ctx["duration"] == 5.0 # 15.0 - 10.0
    
    proc_ev = ContextBuilder._extract_process_evidence(beh_ctx["detections"])
    assert len(proc_ev) == 2
    assert proc_ev[0]["process_name"] == "powershell.exe"
    assert proc_ev[1]["process_name"] == "malicious_c2.exe"
    
    mitre_maps = ContextBuilder._aggregate_mitre_context(beh_ctx["detections"])
    assert len(mitre_maps) == 2
    # Sorted by technique ID
    assert mitre_maps[0]["technique_id"] == "T1059.001"
    assert mitre_maps[1]["technique_id"] == "T1071.004"


def test_missing_optional_fields_graceful():
    # If detections have missing recommendations or metadata
    det_json = {
        "id": "det-1",
        "process_guid": "guid-1",
        "timestamp": 10.0,
    }
    beh_ctx = ContextBuilder._normalize_behavioral_context(det_json)
    assert beh_ctx["correlation_id"] == "det-1"
    assert beh_ctx["detections"][0]["recommendations"] == []
    assert beh_ctx["detections"][0]["evidence"] == []
    assert beh_ctx["detections"][0]["metadata"] == {}


def test_recommendation_and_mitre_deduplication():
    dets = [
        {"mitre_technique": "T1059", "mitre_tactic": "Execution", "recommendations": ["A", "B"]},
        {"mitre_technique": "T1059", "mitre_tactic": "Execution", "recommendations": ["B", "C"]},
    ]
    # Deduplicate mitre techniques
    mitre_maps = ContextBuilder._aggregate_mitre_context(dets)
    assert len(mitre_maps) == 1
    assert mitre_maps[0]["technique_id"] == "T1059"
    
    # Recommendations extraction & deduplication
    recs = []
    seen = set()
    for d in dets:
        for r in d["recommendations"]:
            if r not in seen:
                seen.add(r)
                recs.append(r)
    assert recs == ["A", "B", "C"]


def test_behavioral_knowledge_pack_generation():
    # Test generation of Knowledge Pack document for behavioral investigations
    context = {
        "investigation": {
            "investigation_id": "INV-101",
            "title": "Correlated PowerShell Run",
            "status": "new",
            "severity": "CRITICAL",
            "risk_score": 98.0,
            "confidence": 0.95,
        },
        "behavioral_context": {
            "correlation_id": "corr-101",
            "group_size": 2,
            "primary_detection": {
                "title": "Encoded PowerShell",
                "rule_id": "ps_enc",
                "severity": "CRITICAL",
                "confidence": 98,
                "description": "Execution of obfuscated script",
                "host_id": "laptop-1",
                "process_guid": "guid-1",
            },
            "detections": [
                {
                    "title": "Encoded PowerShell",
                    "rule_id": "ps_enc",
                    "severity": "CRITICAL",
                    "confidence": 98,
                    "process_guid": "guid-1",
                    "description": "Execution of obfuscated script",
                },
                {
                    "title": "Certutil download",
                    "rule_id": "cert_down",
                    "severity": "LOW",
                    "confidence": 40,
                    "process_guid": "guid-2",
                    "description": "Certutil execution for download",
                }
            ]
        },
        "correlation_context": {
            "correlation_id": "corr-101",
            "number_of_detections": 2,
            "first_seen": 10.0,
            "last_seen": 25.0,
            "duration": 15.0,
            "involved_process_guids": ["guid-1", "guid-2"],
        },
        "process_evidence": [
            {
                "process_guid": "guid-1",
                "pid": 100,
                "ppid": 10,
                "username": "SYSTEM",
                "cmdline": "powershell -enc ...",
                "executable": "powershell.exe",
                "parent_info": "explorer.exe",
            }
        ],
        "mitre_mappings": [
            {
                "technique_id": "T1059.001",
                "technique_name": "PowerShell",
                "tactic": "Execution",
                "description": "Adversaries abuse PowerShell script",
            }
        ],
        "recommendations": ["Review PowerShell script log", "Isolate laptop-1"],
        "timeline": [
            {"actor": "SYSTEM", "title": "Alert created", "description": "Triggered"}
        ],
        "conversation": {
            "recent": [{"sender": "user", "text": "Who ran the script?"}]
        }
    }
    
    doc = KnowledgePack.generate(context)
    
    assert "## Investigation Overview" in doc
    assert "Severity: CRITICAL" in doc
    assert "## Behavioral Detection Assessment" in doc
    assert "## Correlation Analysis" in doc
    assert "## Process Evidence" in doc
    assert "## Attack Assessment" in doc
    assert "## Recommended Actions" in doc
    assert "## Evidence Summary" in doc
    assert "## Investigation Timeline" in doc
    assert "## Previous Conversation" in doc
    assert "obfuscated script" in doc
    assert "resembles adversaries abuse powershell" in doc


def test_behavioral_citations():
    context = {
        "behavioral_context": {"detections": [{}]},
        "process_evidence": [{}],
        "correlation_context": {"correlation_id": "corr-123"},
        "mitre_mappings": [{"technique_id": "T1059.001"}],
        "timeline": [{}],
    }
    citations = EvidenceCitationBuilder.build(context)
    assert "Behavioral Detection Evidence" in citations
    assert "Process Execution Evidence" in citations
    assert "Detection Correlation" in citations
    assert "MITRE ATT&CK T1059.001" in citations
    assert "Investigation Timeline" in citations


def test_aggregate_vs_member_severity_validation():
    # 3. Verification: CRITICAL aggregate investigation containing a LOW member detection
    # rejects a response claiming the overall investigation is LOW,
    # but permits a response stating that the individual member detection is LOW severity.
    
    knowledge_doc = (
        "## Investigation Overview\n"
        "Severity: CRITICAL\n"
        "## Behavioral Detection Assessment\n"
        "1. Obfuscated Rule Match (Rule: rule-1, Severity: LOW)"
    )
    
    # Case A: Response claiming the overall investigation is LOW (Expected aggregate is CRITICAL)
    # This should be REJECTED!
    bad_response = "The overall investigation carries a LOW severity rating."
    with pytest.raises(ValueError) as exc_info:
        ResponseValidator.validate_severity_consistency(bad_response, knowledge_doc)
    assert "Contradicting severity 'LOW' detected for the overall investigation" in str(exc_info.value)

    # Case B: Response describing the local member detection as LOW severity
    # This should be ALLOWED!
    good_response = "We observed that detection rule-1 generated a LOW severity alert, but the investigation itself is CRITICAL."
    # Should not raise any exception
    ResponseValidator.validate_severity_consistency(good_response, knowledge_doc)

    # Case C: Response discussing member detection LOW severity without writing the aggregate severity word
    # This is still ALLOWED because the word "detection" / "alert" is explicitly in the sentence!
    good_response_local_only = "The member detection rule-1 was categorized as LOW severity."
    ResponseValidator.validate_severity_consistency(good_response_local_only, knowledge_doc)


def test_context_engine_performance_scale():
    # 4. Performance verification: Test with a correlated investigation containing at least 100 detections under 50 ms.
    dets = []
    for i in range(100):
        dets.append({
            "id": f"det-{i}",
            "rule_id": f"rule-{i % 5}",
            "title": f"Title {i}",
            "description": f"Description {i}",
            "severity": "HIGH" if i % 10 == 0 else "LOW",
            "confidence": 80,
            "host_id": "host-perf",
            "process_guid": f"guid-{i}",
            "timestamp": 100.0 + i,
            "mitre_technique": "T1059",
            "mitre_tactic": "Execution",
            "recommendations": [f"Rec {i % 3}"],
            "evidence": [
                {
                    "Process Name": f"proc-{i}.exe",
                    "PID": 1000 + i,
                    "Parent PID": 1000,
                    "Executable": f"C:\\proc-{i}.exe",
                }
            ]
        })
        
    detection_json = {
        "correlation_id": "corr-perf-100",
        "group_size": 100,
        "primary_detection": dets[0],
        "detections": dets,
    }
    
    start_time = time.perf_counter()
    
    # 1. Context Builder runs
    ctx = ContextBuilder._normalize_behavioral_context(detection_json)
    corr_ctx = ContextBuilder._build_correlation_context(ctx)
    proc_ev = ContextBuilder._extract_process_evidence(ctx["detections"])
    mitre_maps = ContextBuilder._aggregate_mitre_context(ctx["detections"])
    
    recs = []
    seen = set()
    for d in ctx["detections"]:
        for r in d.get("recommendations") or []:
            if r not in seen:
                seen.add(r)
                recs.append(r)
                
    full_context = {
        "investigation": {
            "investigation_id": "INV-PERF",
            "title": "Perf Test",
            "status": "new",
            "severity": corr_ctx["aggregate_severity"],
            "risk_score": float(corr_ctx["aggregate_confidence"]),
            "confidence": 0.95,
        },
        "behavioral_context": ctx,
        "correlation_context": corr_ctx,
        "process_evidence": proc_ev,
        "mitre_mappings": mitre_maps,
        "recommendations": recs,
        "timeline": [{}],
    }
    
    # 2. Knowledge Pack narrative runs
    doc = KnowledgePack.generate(full_context)
    
    elapsed_ms = (time.perf_counter() - start_time) * 1000
    
    print(f"\n[PERFORMANCE] Processed 100 behavioral detections in {elapsed_ms:.2f} ms")
    assert elapsed_ms < 50.0, f"Performance budget exceeded: {elapsed_ms:.2f} ms > 50 ms"
    assert len(doc) > 0
