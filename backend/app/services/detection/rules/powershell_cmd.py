from app.services.detection.models import Detection, Severity
from app.services.detection.rules.base import DetectionRule
from app.services.telemetry.process_tree.models import ProcessTree


class PowerShellCmdRule(DetectionRule):
    """
    Detects PowerShell spawning a CMD shell (powershell.exe -> cmd.exe).
    """

    @property
    def id(self) -> str:
        return "powershell_cmd"

    @property
    def name(self) -> str:
        return "PowerShell spawning CMD"

    @property
    def description(self) -> str:
        return "Detection of a CMD process spawned directly by PowerShell, which is common in administrative tasks and post-exploitation."

    @property
    def severity(self) -> str:
        return Severity.MEDIUM

    @property
    def mitre_technique(self) -> str:
        return "T1059"

    @property
    def mitre_tactic(self) -> str:
        return "Execution"

    @property
    def confidence(self) -> int:
        return 85

    @property
    def recommendations(self) -> list[str]:
        return ["Inspect child commands", "Review execution history"]

    @property
    def tags(self) -> list[str]:
        return ["powershell", "cmd", "spawn"]

    def evaluate(self, tree: ProcessTree) -> list[Detection]:
        detections = []
        for node in tree.nodes_by_guid.values():
            if node.process_name.lower() == "cmd.exe" and node.parent:
                if node.parent.process_name.lower() == "powershell.exe":
                    # Evidence: include both child and parent
                    evidence = [
                        self._get_node_evidence(node),
                        self._get_node_evidence(node.parent),
                    ]
                    det = self._create_detection(
                        node=node,
                        host_id=tree.host_id,
                        matched_keywords=[],
                        matched_processes=["powershell.exe", "cmd.exe"],
                        evidence=evidence,
                    )
                    detections.append(det)
        return detections
