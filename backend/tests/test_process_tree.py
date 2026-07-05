import time
import pytest
from app.services.telemetry.process_tree.builder import ProcessTreeBuilder
from app.services.telemetry.process_tree.serializer import ProcessTreeSerializer


def test_process_tree_basic_assembly():
    # Setup parent and child events on the same host
    events = [
        {
            "host_id": "host-1",
            "event_type": "process_start",
            "data": {
                "pid": 1000,
                "ppid": 0,
                "process_name": "system.exe",
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
    ]

    trees = ProcessTreeBuilder.build(events)
    assert "host-1" in trees
    tree = trees["host-1"]

    assert len(tree.roots) == 1
    root = tree.roots[0]
    assert root.pid == 1000
    assert len(root.children) == 1

    child = root.children[0]
    assert child.pid == 2000
    assert child.parent == root


def test_process_tree_pid_recycling():
    # Setup PID reuse scenario:
    # 1. Explorer (pid: 100) starts at t=10
    # 2. Explorer exits (not processed by tree, but PID becomes free)
    # 3. Chrome (pid: 100) starts at t=50
    # 4. Powershell (pid: 500) starts at t=60, ppid=100 (should map to Chrome, not Explorer)
    events = [
        {
            "host_id": "host-1",
            "event_type": "process_start",
            "data": {
                "pid": 100,
                "ppid": 0,
                "process_name": "explorer.exe",
                "create_time": 10.0,
            },
        },
        {
            "host_id": "host-1",
            "event_type": "process_start",
            "data": {
                "pid": 100,
                "ppid": 0,
                "process_name": "chrome.exe",
                "create_time": 50.0,
            },
        },
        {
            "host_id": "host-1",
            "event_type": "process_start",
            "data": {
                "pid": 500,
                "ppid": 100,
                "process_name": "powershell.exe",
                "create_time": 60.0,
            },
        },
    ]

    trees = ProcessTreeBuilder.build(events)
    tree = trees["host-1"]

    # Verify lookups
    chrome_node = tree.get_node("host-1:100:50.0")
    explorer_node = tree.get_node("host-1:100:10.0")
    powershell_node = tree.get_node("host-1:500:60.0")

    assert chrome_node is not None
    assert explorer_node is not None
    assert powershell_node is not None

    # Powershell parent should be chrome (started closest prior to it)
    assert powershell_node.parent == chrome_node
    assert powershell_node in chrome_node.children
    assert powershell_node not in explorer_node.children


def test_process_tree_host_isolation():
    # Parent-child events split across distinct hosts
    events = [
        {
            "host_id": "host-a",
            "event_type": "process_start",
            "data": {"pid": 100, "ppid": 0, "process_name": "parent-a.exe", "create_time": 10.0},
        },
        {
            "host_id": "host-b",
            "event_type": "process_start",
            "data": {"pid": 100, "ppid": 0, "process_name": "parent-b.exe", "create_time": 10.0},
        },
    ]

    trees = ProcessTreeBuilder.build(events)
    assert "host-a" in trees
    assert "host-b" in trees

    assert len(trees["host-a"].roots) == 1
    assert trees["host-a"].roots[0].process_name == "parent-a.exe"

    assert len(trees["host-b"].roots) == 1
    assert trees["host-b"].roots[0].process_name == "parent-b.exe"


def test_process_tree_missing_parent_graceful():
    # Child refers to missing PPID
    events = [
        {
            "host_id": "host-1",
            "event_type": "process_start",
            "data": {"pid": 500, "ppid": 9999, "process_name": "cmd.exe", "create_time": 10.0},
        }
    ]

    trees = ProcessTreeBuilder.build(events)
    tree = trees["host-1"]
    assert len(tree.roots) == 1
    assert tree.roots[0].pid == 500


def test_process_tree_duplicate_dedup():
    events = [
        {
            "host_id": "host-1",
            "event_type": "process_start",
            "data": {"pid": 100, "ppid": 0, "process_name": "cmd.exe", "create_time": 10.0},
        },
        {
            "host_id": "host-1",
            "event_type": "process_start",
            "data": {"pid": 100, "ppid": 0, "process_name": "cmd.exe", "create_time": 10.0},
        },
    ]

    trees = ProcessTreeBuilder.build(events)
    tree = trees["host-1"]
    assert len(tree.nodes_by_guid) == 1


def test_process_tree_serializers():
    events = [
        {
            "host_id": "host-1",
            "event_type": "process_start",
            "data": {"pid": 100, "ppid": 0, "process_name": "explorer.exe", "create_time": 10.0},
        },
        {
            "host_id": "host-1",
            "event_type": "process_start",
            "data": {"pid": 200, "ppid": 100, "process_name": "cmd.exe", "create_time": 12.0},
        },
    ]

    trees = ProcessTreeBuilder.build(events)
    tree = trees["host-1"]

    # 1. Nested serialization
    nested = ProcessTreeSerializer.serialize_nested(tree)
    assert "roots" in nested
    assert len(nested["roots"]) == 1
    assert nested["roots"][0]["pid"] == 100
    assert len(nested["roots"][0]["children"]) == 1
    assert nested["roots"][0]["children"][0]["pid"] == 200

    # 2. Flat serialization
    flat = ProcessTreeSerializer.serialize_flat(tree)
    assert len(flat) == 2
    assert flat[0]["pid"] == 100
    assert flat[0]["parent"] is None
    assert flat[1]["pid"] == 200
    assert flat[1]["parent"] == flat[0]["process_guid"]


def test_process_tree_performance_scale():
    # Generate 5,000 process start events
    events = []
    # Build a linear tree of 5000 processes to simulate deep hierarchies
    for i in range(5000):
        events.append(
            {
                "host_id": "host-perf",
                "event_type": "process_start",
                "data": {
                    "pid": i + 1,
                    "ppid": i,
                    "process_name": f"proc-{i}.exe",
                    "create_time": float(i),
                },
            }
        )

    start_time = time.perf_counter()
    trees = ProcessTreeBuilder.build(events)
    elapsed_ms = (time.perf_counter() - start_time) * 1000

    print(f"5000 process tree build: {elapsed_ms:.2f} ms")
    assert elapsed_ms < 100.0, f"Performance budget exceeded: {elapsed_ms:.2f} ms > 100 ms"

    tree = trees["host-perf"]
    assert len(tree.nodes_by_guid) == 5000
    assert len(tree.roots) == 1
