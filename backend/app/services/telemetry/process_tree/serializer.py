from app.services.telemetry.process_tree.models import ProcessNode, ProcessTree


class ProcessTreeSerializer:
    """
    Serializes a ProcessTree into nested tree models or flat lists suitable
    for visualization systems.
    """

    @staticmethod
    def serialize_nested(tree: ProcessTree) -> dict:
        """
        Produce a hierarchical, parent-child JSON structure.
        """

        def _serialize_node(node: ProcessNode) -> dict:
            return {
                "process_guid": node.process_guid,
                "pid": node.pid,
                "ppid": node.ppid,
                "name": node.process_name,
                "process_name": node.process_name,
                "exe": node.exe,
                "cmdline": node.cmdline,
                "username": node.username,
                "cwd": node.cwd,
                "create_time": node.create_time,
                "metadata": node.metadata,
                "children": [_serialize_node(child) for child in node.children],
            }

        return {"roots": [_serialize_node(root) for root in tree.get_roots()]}

    @staticmethod
    def serialize_flat(tree: ProcessTree) -> list[dict]:
        """
        Produce a flat JSON list with parent GUID references.
        """
        flat_list = []
        # Traverses all nodes in the tree
        for node in tree.walk_breadth_first():
            flat_list.append(
                {
                    "process_guid": node.process_guid,
                    "parent": node.parent.process_guid if node.parent else None,
                    "pid": node.pid,
                    "ppid": node.ppid,
                    "name": node.process_name,
                    "process_name": node.process_name,
                    "exe": node.exe,
                    "cmdline": node.cmdline,
                    "username": node.username,
                    "cwd": node.cwd,
                    "create_time": node.create_time,
                    "metadata": node.metadata,
                }
            )
        return flat_list
