from app.services.detection.models import Detection, Severity
from app.services.detection.rules.base import DetectionRule
from app.services.telemetry.process_tree.models import ProcessTree


class PowerShellEncodedRule(DetectionRule):
    """
    Detects PowerShell executions with encoded command parameters.
    """

    @property
    def id(self) -> str:
        return "powershell_encoded"

    @property
    def name(self) -> str:
        return "PowerShell Encoded Command"

    @property
    def description(self) -> str:
        return "Execution of PowerShell with an encoded command string, which is often used to obfuscate malicious scripts."

    @property
    def severity(self) -> str:
        return Severity.HIGH

    @property
    def mitre_technique(self) -> str:
        return "T1059.001"

    @property
    def mitre_tactic(self) -> str:
        return "Execution"

    @property
    def confidence(self) -> int:
        return 95

    @property
    def recommendations(self) -> list[str]:
        return ["Terminate process", "Collect memory", "Review PowerShell logs"]

    @property
    def tags(self) -> list[str]:
        return ["powershell", "obfuscation", "encoded"]

    def evaluate(self, tree: ProcessTree) -> list[Detection]:
        detections = []
        for node in tree.nodes_by_guid.values():
            if node.process_name.lower() == "powershell.exe":
                # Check for encoded flags
                for arg in node.cmdline:
                    arg_lower = arg.lower()
                    if arg_lower.startswith("-") or arg_lower.startswith("/"):
                        flag = arg_lower[1:]
                        if flag == "encodedcommand" or flag.startswith("enc"):
                            evidence = [self._get_node_evidence(node)]
                            det = self._create_detection(
                                node=node,
                                host_id=tree.host_id,
                                matched_keywords=[arg],
                                matched_processes=["powershell.exe"],
                                evidence=evidence,
                            )
                            detections.append(det)
                            break
        return detections
