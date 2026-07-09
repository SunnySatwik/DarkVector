from __future__ import annotations

import logging
from app.services.detection.models import Detection
from app.services.detection.correlation.models import CorrelatedDetectionGroup
from app.services.telemetry.process_tree.models import ProcessTree, ProcessNode

logger = logging.getLogger(__name__)


class UnionFind:
    """
    Disjoint Set Union (Union-Find) with path compression.
    Uses detection IDs as keys because frozen Detection objects are unhashable
    when they contain mutable list/dict fields (evidence, recommendations, metadata).
    """

    def __init__(self, elements: list[Detection]) -> None:
        self.parent = {el.id: el.id for el in elements}

    def find(self, x_id: str) -> str:
        if self.parent[x_id] != x_id:
            self.parent[x_id] = self.find(self.parent[x_id])
        return self.parent[x_id]

    def union(self, x_id: str, y_id: str) -> None:
        root_x = self.find(x_id)
        root_y = self.find(y_id)
        if root_x != root_y:
            self.parent[root_x] = root_y


def are_nodes_related(node_a: ProcessNode, node_b: ProcessNode) -> bool:
    """
    Returns True if node_a is an ancestor of node_b, node_b is an ancestor
    of node_a, or if they share the same process_guid.
    Traces parent links iteratively to avoid stack overflow recursion.
    """
    if node_a.process_guid == node_b.process_guid:
        return True

    # Check if node_a is ancestor of node_b
    curr = node_b.parent
    while curr:
        if curr.process_guid == node_a.process_guid:
            return True
        curr = curr.parent

    # Check if node_b is ancestor of node_a
    curr = node_a.parent
    while curr:
        if curr.process_guid == node_a.process_guid:
            # Cycle safety check
            break
        if curr.process_guid == node_b.process_guid:
            return True
        curr = curr.parent

    return False


def should_correlate(
    d1: Detection,
    d2: Detection,
    tree: ProcessTree,
    time_window: float = 300.0,
) -> bool:
    """
    Returns True if two detections belong to the same host, fall within
    the time window, and share a process tree lineage.
    """
    if d1.host_id != d2.host_id:
        return False

    if abs(d1.timestamp - d2.timestamp) > time_window:
        return False

    node_1 = tree.get_node(d1.process_guid)
    node_2 = tree.get_node(d2.process_guid)

    if node_1 and node_2:
        return are_nodes_related(node_1, node_2)

    return d1.process_guid == d2.process_guid


class DetectionCorrelationEngine:
    """
    Stateless engine to correlate behavioral detections on a single host.
    """

    @staticmethod
    def correlate(
        detections: list[Detection],
        tree: ProcessTree,
        time_window: float = 300.0,
    ) -> list[CorrelatedDetectionGroup]:
        """
        Correlate behavioral detections using temporal and process-tree lineage metrics.
        Returns:
            list[CorrelatedDetectionGroup]
        """
        if not detections:
            return []

        # Group detections by host_id to avoid unnecessary cross-host comparison checks
        by_host = {}
        for d in detections:
            by_host.setdefault(d.host_id, []).append(d)

        uf = UnionFind(detections)

        # Pairwise compare detections within each host
        for host_id, host_dets in by_host.items():
            for i in range(len(host_dets)):
                for j in range(i + 1, len(host_dets)):
                    d1 = host_dets[i]
                    d2 = host_dets[j]
                    if should_correlate(d1, d2, tree, time_window):
                        uf.union(d1.id, d2.id)

        # Collect partitioning groups from UnionFind
        groups_map = {}
        for d in detections:
            root_id = uf.find(d.id)
            groups_map.setdefault(root_id, []).append(d)

        correlated_groups = []
        for member_dets in groups_map.values():
            # Sort member detections deterministically (by timestamp first, then id)
            member_dets_sorted = sorted(
                member_dets, key=lambda d: (d.timestamp, d.id)
            )
            correlated_groups.append(
                CorrelatedDetectionGroup.create(member_dets_sorted)
            )

        # Sort groups deterministically (e.g. by first_seen, then group_id)
        return sorted(correlated_groups, key=lambda g: (g.first_seen, g.group_id))
