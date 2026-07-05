from app.services.detection.models import Detection, Severity
from app.services.detection.rules.base import DetectionRule
from app.services.telemetry.process_tree.models import ProcessTree


class LOLBinChainRule(DetectionRule):
    """
    Detects chains of execution containing multiple suspicious LOLBins.
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
        return "lolbin_chain"

    @property
    def name(self) -> str:
        return "LOLBin Chain"

    @property
    def description(self) -> str:
        return (
            "Detection of a process chain containing two or more suspicious LOLBins in "
            "the same lineage, indicating potential chain-of-trust abuse."
        )

    @property
    def severity(self) -> str:
        return Severity.CRITICAL

    @property
    def mitre_technique(self) -> str:
        return "T1218"

    @property
    def mitre_tactic(self) -> str:
        return "Defense Evasion"

    @property
    def confidence(self) -> int:
        return 98

    @property
    def recommendations(self) -> list[str]:
        return [
            "Immediately isolate endpoint",
            "Capture memory",
            "Acquire forensic artifacts",
            "Begin incident response",
        ]

    @property
    def tags(self) -> list[str]:
        return ["lolbin", "chain", "defense_evasion", "critical"]

    def evaluate(self, tree: ProcessTree) -> list[Detection]:
        detections = []
        for node in tree.nodes_by_guid.values():
            proc_name = node.process_name.lower()
            if proc_name in self.SUSPICIOUS_LOLBINS:
                # Walk up ancestors iteratively to find other LOLBins
                ancestor = node.parent
                lolbin_ancestors = []
                while ancestor:
                    if ancestor.process_name.lower() in self.SUSPICIOUS_LOLBINS:
                        lolbin_ancestors.append(ancestor)
                    ancestor = ancestor.parent

                if lolbin_ancestors:
                    evidence = [self._get_node_evidence(node)]
                    evidence.extend(
                        [self._get_node_evidence(anc) for anc in lolbin_ancestors]
                    )

                    matched_processes = [node.process_name]
                    matched_processes.extend(
                        [anc.process_name for anc in lolbin_ancestors]
                    )

                    det = self._create_detection(
                        node=node,
                        host_id=tree.host_id,
                        matched_keywords=[],
                        matched_processes=matched_processes,
                        evidence=evidence,
                    )
                    detections.append(det)
        return detections
