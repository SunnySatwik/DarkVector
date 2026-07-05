from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Generator


@dataclass
class ProcessNode:
    """
    Represents a single process node inside the execution tree.
    The parent and children properties are mutable to support dynamic tree link building.
    """

    process_guid: str
    pid: int
    ppid: int
    process_name: str
    exe: str | None
    cmdline: list[str]
    username: str | None
    cwd: str | None
    create_time: float
    metadata: dict[str, Any] = field(default_factory=dict)
    parent: ProcessNode | None = field(default=None, repr=False, compare=False)
    children: list[ProcessNode] = field(default_factory=list, repr=False, compare=False)


class ProcessTree:
    """
    Maintains a host-isolated process tree state with mappings to resolve recycled PIDs.
    """

    def __init__(self, host_id: str) -> None:
        self.host_id: str = host_id
        self.nodes_by_guid: dict[str, ProcessNode] = {}
        self.nodes_by_pid: dict[int, list[ProcessNode]] = {}
        self.roots: list[ProcessNode] = []

    def get_roots(self) -> list[ProcessNode]:
        """
        Return the top-level root processes.
        """
        return self.roots

    def get_node(self, process_guid: str) -> ProcessNode | None:
        """
        Lookup a specific node by its globally unique GUID.
        """
        return self.nodes_by_guid.get(process_guid)

    def get_latest_node_by_pid(self, pid: int) -> ProcessNode | None:
        """
        Lookup the most recently created process node sharing a given PID.
        """
        nodes = self.nodes_by_pid.get(pid, [])
        if not nodes:
            return None
        return max(nodes, key=lambda n: n.create_time)

    def walk_depth_first(self) -> Generator[ProcessNode, None, None]:
        """
        Depth-First Search traversal generator across all trees.
        """
        visited = set()

        def _dfs(node: ProcessNode) -> Generator[ProcessNode, None, None]:
            if node.process_guid in visited:
                return
            visited.add(node.process_guid)
            yield node
            for child in node.children:
                yield from _dfs(child)

        for root in self.roots:
            yield from _dfs(root)

    def walk_breadth_first(self) -> Generator[ProcessNode, None, None]:
        """
        Breadth-First Search traversal generator across all trees.
        """
        from collections import deque

        visited = set()
        queue = deque(self.roots)

        while queue:
            node = queue.popleft()
            if node.process_guid in visited:
                continue
            visited.add(node.process_guid)
            yield node
            for child in node.children:
                queue.append(child)
