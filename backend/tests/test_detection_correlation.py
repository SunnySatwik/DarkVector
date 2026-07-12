import pytest
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.investigation import Investigation, InvestigationSeverity, InvestigationStatus
from app.models.timeline import TimelineEvent, TimelineEventType
from app.repositories.investigation_repository import InvestigationRepository
from app.services.detection.models import Detection, Severity
from app.services.detection.correlation.models import CorrelatedDetectionGroup
from app.services.detection.correlation.engine import DetectionCorrelationEngine
from app.services.detection.detection_investigation_creator import DetectionInvestigationCreator
from app.services.telemetry.process_tree.models import ProcessTree, ProcessNode
from app.services.telemetry.process_tree.builder import ProcessTreeBuilder

# db_session fixture is provided by tests/conftest.py
# It connects to darkvector_test (not the development darkvector database)
# and rolls back all changes after each test.




def make_test_node(process_name, pid, ppid, create_time, host_id="host-1"):
    guid = f"{host_id}:{pid}:{create_time}"
    return ProcessNode(
        process_guid=guid,
        pid=pid,
        ppid=ppid,
        process_name=process_name,
        exe=None,
        cmdline=[process_name],
        username="SYSTEM",
        cwd=None,
        create_time=create_time,
    )


def test_correlated_detection_group_aggregates():
    # Setup member detections with different metrics
    d1 = Detection(
        id="det-1",
        rule_id="rule-a",
        title="Rule A Match",
        description="Desc A",
        severity=Severity.LOW,
        confidence=50,
        host_id="host-1",
        process_guid="host-1:100:10.0",
        timestamp=10.0,
        mitre_technique="T1059",
        mitre_tactic="Execution",
        recommendations=["Action A"],
        evidence=[],
    )
    d2 = Detection(
        id="det-2",
        rule_id="rule-b",
        title="Rule B Match",
        description="Desc B",
        severity=Severity.HIGH,
        confidence=80,
        host_id="host-1",
        process_guid="host-1:200:12.0",
        timestamp=12.0,
        mitre_technique="T1105",
        mitre_tactic="Command and Control",
        recommendations=["Action B"],
        evidence=[],
    )

    group = CorrelatedDetectionGroup.create([d1, d2])

    assert group.host_id == "host-1"
    assert len(group.detections) == 2
    assert group.first_seen == 10.0
    assert group.last_seen == 12.0
    # Aggregate severity: highest (HIGH > LOW)
    assert group.severity == Severity.HIGH
    # Aggregate confidence: maximum (80 > 50)
    assert group.confidence == 80
    assert "T1059" in group.mitre_techniques
    assert "T1105" in group.mitre_techniques
    assert "Execution" in group.mitre_tactics
    assert "Command and Control" in group.mitre_tactics
    # Primary selection (d2 has higher severity)
    assert group.primary_detection == d2


def test_primary_detection_tie_breaking():
    # 1. Severity tie-breaking (different confidence)
    d1 = Detection(
        id="det-1",
        rule_id="rule-a",
        title="Rule A",
        description="Desc A",
        severity=Severity.HIGH,
        confidence=70,
        host_id="host-1",
        process_guid="host-1:100:10.0",
        timestamp=10.0,
        mitre_technique="T1059",
        mitre_tactic="Execution",
    )
    d2 = Detection(
        id="det-2",
        rule_id="rule-b",
        title="Rule B",
        description="Desc B",
        severity=Severity.HIGH,
        confidence=90,
        host_id="host-1",
        process_guid="host-1:200:12.0",
        timestamp=12.0,
        mitre_technique="T1105",
        mitre_tactic="Execution",
    )
    group1 = CorrelatedDetectionGroup.create([d1, d2])
    assert group1.primary_detection == d2  # d2 has higher confidence (90 > 70)

    # 2. Confidence tie-breaking (different timestamps)
    d3 = Detection(
        id="det-3",
        rule_id="rule-c",
        title="Rule C",
        description="Desc C",
        severity=Severity.HIGH,
        confidence=90,
        host_id="host-1",
        process_guid="host-1:300:15.0",
        timestamp=15.0,
        mitre_technique="T1059",
        mitre_tactic="Execution",
    )
    group2 = CorrelatedDetectionGroup.create([d2, d3])
    assert group2.primary_detection == d2  # d2 has older timestamp (12.0 < 15.0)

    # 3. Timestamp tie-breaking (lexicographical ID tie-breaker)
    d4 = Detection(
        id="det-b",
        rule_id="rule-d",
        title="Rule D",
        description="Desc D",
        severity=Severity.HIGH,
        confidence=90,
        host_id="host-1",
        process_guid="host-1:400:12.0",
        timestamp=12.0,
        mitre_technique="T1059",
        mitre_tactic="Execution",
    )
    d5 = Detection(
        id="det-a",
        rule_id="rule-e",
        title="Rule E",
        description="Desc E",
        severity=Severity.HIGH,
        confidence=90,
        host_id="host-1",
        process_guid="host-1:500:12.0",
        timestamp=12.0,
        mitre_technique="T1059",
        mitre_tactic="Execution",
    )
    group3 = CorrelatedDetectionGroup.create([d4, d5])
    assert group3.primary_detection == d5  # det-a is lexicographically smaller than det-b


def test_correlation_engine_scenarios():
    tree = ProcessTree("host-1")
    # Tree: Explorer(100) -> CMD(200) -> PowerShell(300)
    explorer = make_test_node("explorer.exe", 100, 0, 10.0)
    cmd = make_test_node("cmd.exe", 200, 100, 20.0)
    powershell = make_test_node("powershell.exe", 300, 200, 30.0)

    cmd.parent = explorer
    explorer.children.append(cmd)
    powershell.parent = cmd
    cmd.children.append(powershell)

    tree.nodes_by_guid = {
        explorer.process_guid: explorer,
        cmd.process_guid: cmd,
        powershell.process_guid: powershell,
    }

    # Detections
    d_explorer = Detection(
        id="det-explorer",
        rule_id="lolbin",
        title="LOLBin explorer",
        description="",
        severity=Severity.LOW,
        confidence=50,
        host_id="host-1",
        process_guid=explorer.process_guid,
        timestamp=10.0,
        mitre_technique="",
        mitre_tactic="",
    )
    d_powershell = Detection(
        id="det-powershell",
        rule_id="encoded_ps",
        title="Encoded PS",
        description="",
        severity=Severity.HIGH,
        confidence=90,
        host_id="host-1",
        process_guid=powershell.process_guid,
        timestamp=30.0,
        mitre_technique="",
        mitre_tactic="",
    )
    # Outside temporal window (>300s)
    d_late = Detection(
        id="det-late",
        rule_id="lolbin",
        title="Late LOLBin",
        description="",
        severity=Severity.LOW,
        confidence=40,
        host_id="host-1",
        process_guid=powershell.process_guid,
        timestamp=500.0,
        mitre_technique="",
        mitre_tactic="",
    )
    # Different Host
    d_host2 = Detection(
        id="det-host2",
        rule_id="lolbin",
        title="Host 2 Match",
        description="",
        severity=Severity.MEDIUM,
        confidence=60,
        host_id="host-2",
        process_guid="host-2:100:10.0",
        timestamp=10.0,
        mitre_technique="",
        mitre_tactic="",
    )

    # 1. Parent-Child & Ancestor-Descendant correlate
    groups = DetectionCorrelationEngine.correlate([d_explorer, d_powershell], tree)
    assert len(groups) == 1
    assert len(groups[0].detections) == 2

    # 2. Outside time window remains separate
    groups = DetectionCorrelationEngine.correlate([d_explorer, d_late], tree)
    assert len(groups) == 2

    # 3. Different hosts never correlate
    groups = DetectionCorrelationEngine.correlate([d_explorer, d_host2], tree)
    assert len(groups) == 2

    # 4. Transitive correlation (A -> B, B -> C correlates A -> C)
    d_cmd = Detection(
        id="det-cmd",
        rule_id="lolbin",
        title="CMD LOLBin",
        description="",
        severity=Severity.MEDIUM,
        confidence=70,
        host_id="host-1",
        process_guid=cmd.process_guid,
        timestamp=20.0,
        mitre_technique="",
        mitre_tactic="",
    )
    # Run pairwise checks with explorer, cmd, and powershell
    groups = DetectionCorrelationEngine.correlate([d_explorer, d_cmd, d_powershell], tree)
    assert len(groups) == 1
    assert len(groups[0].detections) == 3


def test_investigation_creation_and_idempotency(db_session: Session):
    tree = ProcessTree("host-1")
    node = make_test_node("powershell.exe", 100, 0, 10.0)
    tree.nodes_by_guid = {node.process_guid: node}

    det = Detection(
        id="det-1",
        rule_id="ps_enc",
        title="PowerShell Execution",
        description="PowerShell malicious run",
        severity=Severity.HIGH,
        confidence=90,
        host_id="host-1",
        process_guid=node.process_guid,
        timestamp=10.0,
        mitre_technique="T1059",
        mitre_tactic="Execution",
    )

    group = CorrelatedDetectionGroup.create([det])

    # 1. Create new investigation
    inv1 = DetectionInvestigationCreator.create_from_group(db_session, group, tree)
    assert inv1.investigation_id is not None
    assert inv1.alert_id == group.group_id
    assert inv1.severity == InvestigationSeverity.HIGH
    assert inv1.risk_score == 90.0

    # Verify timeline events created (1 ALERT_CREATED + 1 ANALYSIS_COMPLETED)
    events = list(db_session.scalars(select(TimelineEvent).where(TimelineEvent.investigation_id == inv1.investigation_id)))
    assert len(events) == 2
    types = [e.event_type for e in events]
    assert TimelineEventType.ALERT_CREATED in types
    assert TimelineEventType.ANALYSIS_COMPLETED in types

    # 2. Idempotency Check: run again with same group
    inv2 = DetectionInvestigationCreator.create_from_group(db_session, group, tree)
    assert inv2.investigation_id == inv1.investigation_id
    assert inv2.updated_at == inv1.updated_at

    # Verify no duplicate timeline events added
    events2 = list(db_session.scalars(select(TimelineEvent).where(TimelineEvent.investigation_id == inv1.investigation_id)))
    assert len(events2) == 2


def test_alert_id_immutability_and_group_growth(db_session: Session):
    tree = ProcessTree("host-1")
    node_a = make_test_node("powershell.exe", 100, 0, 10.0)
    node_b = make_test_node("certutil.exe", 200, 100, 15.0)
    node_b.parent = node_a
    node_a.children.append(node_b)

    tree.nodes_by_guid = {
        node_a.process_guid: node_a,
        node_b.process_guid: node_b,
    }

    det_a = Detection(
        id="det-a",
        rule_id="ps_rule",
        title="PS Alert",
        description="PS suspicious activity",
        severity=Severity.MEDIUM,
        confidence=70,
        host_id="host-1",
        process_guid=node_a.process_guid,
        timestamp=10.0,
        mitre_technique="T1059",
        mitre_tactic="Execution",
    )

    # Cycle 1: Only A is detected
    group1 = CorrelatedDetectionGroup.create([det_a])
    inv = DetectionInvestigationCreator.create_from_group(db_session, group1, tree)
    initial_alert_id = inv.alert_id
    assert initial_alert_id == group1.group_id

    # Cycle 2: B is detected, correlates with A (group grows)
    det_b = Detection(
        id="det-b",
        rule_id="certutil_rule",
        title="Certutil Alert",
        description="Certutil download activity",
        severity=Severity.HIGH,
        confidence=95,
        host_id="host-1",
        process_guid=node_b.process_guid,
        timestamp=15.0,
        mitre_technique="T1105",
        mitre_tactic="Command and Control",
    )

    group2 = CorrelatedDetectionGroup.create([det_a, det_b])
    updated_inv = DetectionInvestigationCreator.create_from_group(db_session, group2, tree)

    # 1. alert_id must remain immutable after creation
    assert updated_inv.investigation_id == inv.investigation_id
    assert updated_inv.alert_id == initial_alert_id

    # 2. Aggregates must be updated inside the existing investigation
    assert updated_inv.severity == InvestigationSeverity.HIGH  # Promoted from MEDIUM to HIGH
    assert updated_inv.risk_score == 95.0                      # Raised from 70 to 95

    # 3. correlation_id inside detection_json must reflect the new evolving group
    assert updated_inv.detection_json["correlation_id"] == group2.group_id
    assert len(updated_inv.detection_json["detections"]) == 2
    assert updated_inv.detection_json["group_size"] == 2
    assert updated_inv.detection_json["primary_detection"]["id"] == "det-b"  # det-b is primary (HIGH > MEDIUM)

    # 4. Only one timeline event added for det-b
    events = list(db_session.scalars(select(TimelineEvent).where(TimelineEvent.investigation_id == inv.investigation_id)))
    # Chronological history should show: Cycle 1 initial events (2) + Cycle 2 new correlation event (1) = 3 total
    assert len(events) == 3
    corr_events = [e for e in events if e.title == "Behavioral detection correlated"]
    assert len(corr_events) == 1
    assert "certutil_rule" in corr_events[0].description


def test_cross_cycle_historical_correlation(db_session: Session):
    """
    Checks that Cycle 2 {B} connects with Cycle 1 {A} through lineage context in the ProcessTree,
    even if A is not regenerated/passed to the creator in Cycle 2.
    """
    tree = ProcessTree("host-1")
    node_a = make_test_node("powershell.exe", 100, 0, 10.0)
    node_b = make_test_node("certutil.exe", 200, 100, 15.0)
    node_b.parent = node_a
    node_a.children.append(node_b)

    tree.nodes_by_guid = {
        node_a.process_guid: node_a,
        node_b.process_guid: node_b,
    }

    det_a = Detection(
        id="det-a",
        rule_id="ps_rule",
        title="PS Alert",
        description="PS suspicious activity",
        severity=Severity.MEDIUM,
        confidence=70,
        host_id="host-1",
        process_guid=node_a.process_guid,
        timestamp=10.0,
        mitre_technique="T1059",
        mitre_tactic="Execution",
    )

    # Cycle 1: Create Investigation with detection A
    group1 = CorrelatedDetectionGroup.create([det_a])
    inv1 = DetectionInvestigationCreator.create_from_group(db_session, group1, tree)

    # Cycle 2: Only B is detected and passed.
    det_b = Detection(
        id="det-b",
        rule_id="certutil_rule",
        title="Certutil Alert",
        description="Certutil download activity",
        severity=Severity.HIGH,
        confidence=95,
        host_id="host-1",
        process_guid=node_b.process_guid,
        timestamp=15.0,
        mitre_technique="T1105",
        mitre_tactic="Command and Control",
    )

    group2 = CorrelatedDetectionGroup.create([det_b])

    # Tracing the lineage of B will include node_a's process_guid.
    # The repository abstraction must match the existing inv1 because of node_a's process_guid in detection_json
    merged_inv = DetectionInvestigationCreator.create_from_group(db_session, group2, tree)

    assert merged_inv.investigation_id == inv1.investigation_id
    assert len(merged_inv.detection_json["detections"]) == 2
    assert "det-a" in [d["id"] for d in merged_inv.detection_json["detections"]]
    assert "det-b" in [d["id"] for d in merged_inv.detection_json["detections"]]


def test_conflict_merge_policy(db_session: Session):
    """
    Test that B (connecting A and C) successfully merges their two distinct investigations
    into the oldest investigation, relinks timeline events, and deletes the younger investigation.
    """
    # 1. Initially, processes A and C are unconnected in the process trees (PPID = 0)
    tree = ProcessTree("host-1")
    node_a = make_test_node("powershell.exe", 100, 0, 10.0)
    node_c = make_test_node("certutil.exe", 300, 0, 20.0)

    tree.nodes_by_guid = {
        node_a.process_guid: node_a,
        node_c.process_guid: node_c,
    }

    det_a = Detection(
        id="det-a",
        rule_id="ps_rule",
        title="PS Alert",
        description="A",
        severity=Severity.MEDIUM,
        confidence=70,
        host_id="host-1",
        process_guid=node_a.process_guid,
        timestamp=10.0,
        mitre_technique="T1059",
        mitre_tactic="Execution",
    )

    det_c = Detection(
        id="det-c",
        rule_id="cert_rule",
        title="Cert Alert",
        description="C",
        severity=Severity.HIGH,
        confidence=80,
        host_id="host-1",
        process_guid=node_c.process_guid,
        timestamp=20.0,
        mitre_technique="T1105",
        mitre_tactic="C2",
    )

    # Cycle 1: Create INV1 for {A}
    group1 = CorrelatedDetectionGroup.create([det_a])
    inv1 = DetectionInvestigationCreator.create_from_group(db_session, group1, tree)

    # Cycle 2: Create INV2 for {C} (unrelated since they are in separate process trees)
    group2 = CorrelatedDetectionGroup.create([det_c])
    inv2 = DetectionInvestigationCreator.create_from_group(db_session, group2, tree)

    assert inv1.investigation_id != inv2.investigation_id

    # Cycle 3: B is detected, connecting A and C in the process tree (A -> B -> C)
    node_b = make_test_node("cmd.exe", 200, 100, 15.0)
    node_b.parent = node_a
    node_a.children.append(node_b)

    node_c.ppid = 200
    node_c.parent = node_b
    node_b.children.append(node_c)

    # Register B in the tree
    tree.nodes_by_guid[node_b.process_guid] = node_b

    det_b = Detection(
        id="det-b",
        rule_id="cmd_rule",
        title="CMD Alert",
        description="B",
        severity=Severity.MEDIUM,
        confidence=75,
        host_id="host-1",
        process_guid=node_b.process_guid,
        timestamp=15.0,
        mitre_technique="T1059",
        mitre_tactic="Execution",
    )

    group3 = CorrelatedDetectionGroup.create([det_b])

    # Evaluation should discover both inv1 and inv2, merge inv2 (younger) into inv1 (older),
    # relink all timeline events, and delete inv2.
    merged = DetectionInvestigationCreator.create_from_group(db_session, group3, tree)

    # 1. Verify merged investigation is INV1 (oldest)
    assert merged.investigation_id == inv1.investigation_id

    # 2. Verify INV2 was deleted
    deleted_inv = db_session.get(Investigation, inv2.id)
    assert deleted_inv is None

    # 3. Verify all detections exist in primary investigation
    stored_det_ids = {d["id"] for d in merged.detection_json["detections"]}
    assert stored_det_ids == {"det-a", "det-b", "det-c"}

    # 4. Verify timeline events were relinked to primary investigation
    events = list(db_session.scalars(select(TimelineEvent).where(TimelineEvent.investigation_id == inv1.investigation_id)))
    # Timeline should include INV1 initial events (2), INV2 initial events (2), merge notice (1), and new correlation notice (1) = 6 total
    assert len(events) == 6
    relinked_events = [e for e in events if e.title == "Behavior analysis completed" and "cert_rule" in e.description]
    assert len(relinked_events) == 1
    assert relinked_events[0].investigation_id == inv1.investigation_id


def test_backward_compatibility_with_legacy_single_detection(db_session: Session):
    """
    Verify that our query lookups and parsing merge successfully into investigations created
    by the legacy pipeline (where detection_json is a flat dictionary of a single detection).
    """
    # Create a legacy investigation with flat detection_json
    legacy_inv = Investigation(
        investigation_id="INV-LEGACY",
        alert_id="legacy-alert-id",
        title="Legacy PowerShell Run",
        status=InvestigationStatus.NEW,
        severity=InvestigationSeverity.LOW,
        risk_score=40.0,
        confidence=40.0,
        summary="Flat single detection",
        alert_json=None,
        analysis_json=None,
        detection_json={
            "id": "det-legacy",
            "rule_id": "legacy_rule",
            "title": "Legacy Rule Title",
            "description": "Legacy Description",
            "severity": "LOW",
            "confidence": 40,
            "host_id": "host-1",
            "process_guid": "host-1:100:10.0",
            "timestamp": 10.0,
            "mitre_technique": "",
            "mitre_tactic": "",
        },
    )
    db_session.add(legacy_inv)
    db_session.commit()

    # Now create process tree where new node correlates with legacy process GUID
    tree = ProcessTree("host-1")
    node_legacy = make_test_node("cmd.exe", 100, 0, 10.0)
    node_new = make_test_node("powershell.exe", 200, 100, 12.0)
    node_new.parent = node_legacy
    node_legacy.children.append(node_new)

    tree.nodes_by_guid = {
        node_legacy.process_guid: node_legacy,
        node_new.process_guid: node_new,
    }

    # Generate new detection correlated to the legacy one
    det_new = Detection(
        id="det-new",
        rule_id="ps_rule",
        title="New PS Run",
        description="New Description",
        severity=Severity.HIGH,
        confidence=90,
        host_id="host-1",
        process_guid=node_new.process_guid,
        timestamp=12.0,
        mitre_technique="",
        mitre_tactic="",
    )

    group = CorrelatedDetectionGroup.create([det_new])

    # Run creator - should lookup by legacy process GUID, load legacy investigation,
    # convert flat json to detections list, merge the new detection, and update aggregates
    merged = DetectionInvestigationCreator.create_from_group(db_session, group, tree)

    assert merged.investigation_id == "INV-LEGACY"
    assert merged.severity == InvestigationSeverity.HIGH
    assert merged.risk_score == 90.0
    assert len(merged.detection_json["detections"]) == 2
    assert "det-legacy" in [d["id"] for d in merged.detection_json["detections"]]
    assert "det-new" in [d["id"] for d in merged.detection_json["detections"]]
