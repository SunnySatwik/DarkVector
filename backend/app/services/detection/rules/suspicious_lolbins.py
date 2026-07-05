from app.services.detection.models import Detection, Severity
from app.services.detection.rules.base import DetectionRule
from app.services.telemetry.process_tree.models import ProcessTree


class SuspiciousLOLBinsRule(DetectionRule):
    """
    Detects execution of highly suspicious LOLBins (Living Off the Land Binaries).
    """

    SUSPICIOUS_LOLBINS = {
        "mshta.exe",
        "rundll32.exe",
        "regsvr32.exe",
        "installutil.exe",
        "wmic.exe",
        "certutil.exe",
    }

    @property
    def id(self) -> str:
        return "suspicious_lolbins"

    @property
    def name(self) -> str:
        return "Suspicious LOLBins"

    @property
    def description(self) -> str:
        return (
            "Detection of execution of highly suspicious native Windows binaries (LOLBins) "
            "often leveraged by adversaries to bypass application controls or execute untrusted code."
        )

    @property
    def severity(self) -> str:
        return Severity.MEDIUM

    @property
    def mitre_technique(self) -> str:
        return "T1218"

    @property
    def mitre_tactic(self) -> str:
        return "Defense Evasion"

    @property
    def confidence(self) -> int:
        return 75

    @property
    def recommendations(self) -> list[str]:
        return ["Inspect execution context", "Review parent process", "Validate executable path"]

    @property
    def tags(self) -> list[str]:
        return ["lolbin", "defense_evasion", "suspicious"]

    def evaluate(self, tree: ProcessTree) -> list[Detection]:
        detections = []
        for node in tree.nodes_by_guid.values():
            proc_name = node.process_name.lower()
            if proc_name in self.SUSPICIOUS_LOLBINS:
                evidence = [self._get_node_evidence(node)]
                det = self._create_detection(
                    node=node,
                    host_id=tree.host_id,
                    matched_keywords=[],
                    matched_processes=[node.process_name],
                    evidence=evidence,
                )
                detections.append(det)
        return detections
