import logging
from app.services.telemetry.process_tree.models import ProcessNode, ProcessTree

logger = logging.getLogger(__name__)


class ProcessTreeBuilder:
    """
    Groups process telemetry by host, filters supported events, de-duplicates records,
    and builds host-specific ProcessTrees.
    """

    SUPPORTED_EVENTS = {"process_start"}

    @staticmethod
    def build(events: list) -> dict[str, ProcessTree]:
        """
        Group events by host and build ProcessTree objects.
        Returns:
            dict[str, ProcessTree] mapping host_id to its ProcessTree.
        """
        # 1. Group events by host_id
        events_by_host = {}
        for event in events:
            # Flexible attribute/dict fallback access
            e_type = getattr(event, "event_type", None) or getattr(event, "type", None)
            if not e_type and isinstance(event, dict):
                e_type = event.get("event_type") or event.get("type")

            if e_type not in ProcessTreeBuilder.SUPPORTED_EVENTS:
                continue

            host_id = getattr(event, "host_id", None)
            if not host_id and isinstance(event, dict):
                host_id = event.get("host_id")

            if not host_id:
                continue

            events_by_host.setdefault(host_id, []).append(event)

        trees = {}
        total_duplicates_skipped = 0
        total_nodes = 0
        total_roots = 0
        total_orphans = 0
        max_depth_all = 0
        largest_tree_size = 0
        depth_sum = 0
        root_count = 0

        # 2. Build tree for each host
        for host_id, host_events in events_by_host.items():
            tree = ProcessTree(host_id)
            seen_guids = set()

            # Pass A: Instantiate nodes and populate lookup dicts
            for event in host_events:
                # Resolve details payload dictionary
                data = getattr(event, "payload", None) or getattr(event, "data", None)
                if not data and isinstance(event, dict):
                    data = event.get("payload") or event.get("data") or {}

                # Access details
                pid = data.get("pid")
                ppid = data.get("ppid")
                name = data.get("process_name") or data.get("name", "Unknown")
                exe = data.get("exe")
                cmdline = data.get("cmdline") or []
                username = data.get("username")
                cwd = data.get("cwd")
                create_time = data.get("create_time", 0.0)

                if pid is None or ppid is None:
                    continue

                # Generate global unique guid
                guid = f"{host_id}:{pid}:{create_time}"
                if guid in seen_guids:
                    total_duplicates_skipped += 1
                    continue
                seen_guids.add(guid)

                node = ProcessNode(
                    process_guid=guid,
                    pid=pid,
                    ppid=ppid,
                    process_name=name,
                    exe=exe,
                    cmdline=cmdline,
                    username=username,
                    cwd=cwd,
                    create_time=create_time,
                )

                tree.nodes_by_guid[guid] = node
                tree.nodes_by_pid.setdefault(pid, []).append(node)

            # Pass B: Reconstruct parent-child links
            for node in list(tree.nodes_by_guid.values()):
                if node.ppid == 0:
                    tree.roots.append(node)
                else:
                    candidates = tree.nodes_by_pid.get(node.ppid, [])
                    # Pick temporal parent candidate: started before or at child start time
                    parent_candidates = [c for c in candidates if c.create_time <= node.create_time]
                    if parent_candidates:
                        # Parent candidate with maximum create_time (closest to child start time)
                        parent = max(parent_candidates, key=lambda c: c.create_time)
                        node.parent = parent
                        parent.children.append(node)
                    else:
                        # Fallback to root if parent is missing
                        tree.roots.append(node)
                        total_orphans += 1

            # Compute statistics for this tree using iterative memoization to avoid RecursionError
            node_depths = {}
            for node in tree.nodes_by_guid.values():
                path = []
                curr = node
                while curr and curr.process_guid not in node_depths:
                    path.append(curr)
                    curr = curr.parent
                base_d = node_depths[curr.process_guid] if (curr and curr.process_guid in node_depths) else 0
                for n in reversed(path):
                    base_d += 1
                    node_depths[n.process_guid] = base_d

            tree_size = len(tree.nodes_by_guid)
            total_nodes += tree_size
            total_roots += len(tree.roots)
            if tree_size > largest_tree_size:
                largest_tree_size = tree_size

            for r in tree.roots:
                r_depth = node_depths.get(r.process_guid, 0)
                depth_sum += r_depth
                root_count += 1
                if r_depth > max_depth_all:
                    max_depth_all = r_depth

            trees[host_id] = tree

        avg_depth = (depth_sum / root_count) if root_count > 0 else 0.0

        logger.info(
            "Process tree build completed",
            extra={
                "host_count": len(trees),
                "duplicate_events_skipped": total_duplicates_skipped,
                "total_nodes": total_nodes,
                "total_roots": total_roots,
                "max_tree_depth": max_depth_all,
                "orphan_count": total_orphans,
                "largest_tree_size": largest_tree_size,
                "avg_tree_depth": avg_depth,
            },
        )

        return trees
