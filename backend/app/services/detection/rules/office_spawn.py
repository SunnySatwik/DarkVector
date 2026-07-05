from app.services.detection.models import Detection, Severity
from app.services.detection.rules.base import DetectionRule
from app.services.telemetry.process_tree.models import ProcessTree


class OfficeSpawnRule(DetectionRule):
    """
    Detects Microsoft Office spawning a PowerShell process.
    """

    OFFICE_PROCESSES = {"winword.exe", "excel.exe", "powerpnt.exe"}

    @property
    def id(self) -> str:
        return "office_spawn"

    @property
    def name(self) -> str:
        return "Office spawning PowerShell"

    @property
    def description(self) -> str:
        return "Detection of a Microsoft Office application spawning PowerShell, highly indicative of malicious macro execution."

    @property
    def severity(self) -> str:
        return Severity.HIGH

    @property
    def mitre_technique(self) -> str:
        return "T1204"

    @property
    def mitre_tactic(self) -> str:
        return "Execution"

    @property
    def confidence(self) -> int:
        return 90

    @property
    def recommendations(self) -> list[str]:
        return ["Inspect Office document", "Review macros", "Quarantine endpoint"]

    @property
    def tags(self) -> list[str]:
        return ["office", "powershell", "macro", "spawn"]

    def evaluate(self, tree: ProcessTree) -> list[Detection]:
        detections = []
        for node in tree.nodes_by_guid.values():
            if node.process_name.lower() == "powershell.exe" and node.parent:
                parent_name = node.parent.process_name.lower()
                if parent_name in self.OFFICE_PROCESSES:
                    evidence = [
                        self._get_node_evidence(node),
                        self._get_node_evidence(node.parent),
                    ]
                    det = self._create_detection(
                        node=node,
                        host_id=tree.host_id,
                        matched_keywords=[],
                        matched_processes=[node.parent.process_name, "powershell.exe"],
                        evidence=evidence,
                    )
                    detections.append(det)
        return detections
