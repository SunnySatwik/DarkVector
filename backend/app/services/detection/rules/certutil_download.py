from app.services.detection.models import Detection, Severity
from app.services.detection.rules.base import DetectionRule
from app.services.telemetry.process_tree.models import ProcessTree


class CertutilDownloadRule(DetectionRule):
    """
    Detects certutil.exe executions used to download remote files.
    """

    @property
    def id(self) -> str:
        return "certutil_download"

    @property
    def name(self) -> str:
        return "Certutil Download"

    @property
    def description(self) -> str:
        return "Detection of certutil.exe download command line flags (-urlcache -split), which is a common LOLBin method to download payloads."

    @property
    def severity(self) -> str:
        return Severity.HIGH

    @property
    def mitre_technique(self) -> str:
        return "T1105"

    @property
    def mitre_tactic(self) -> str:
        return "Ingress Tool Transfer"

    @property
    def confidence(self) -> int:
        return 95

    @property
    def recommendations(self) -> list[str]:
        return [
            "Inspect downloaded file",
            "Check destination URL",
            "Block outbound connection",
        ]

    @property
    def tags(self) -> list[str]:
        return ["certutil", "download", "lolbin", "ingress"]

    def evaluate(self, tree: ProcessTree) -> list[Detection]:
        detections = []
        for node in tree.nodes_by_guid.values():
            if node.process_name.lower() == "certutil.exe":
                cmdline_str = (
                    " ".join(node.cmdline).lower()
                    if isinstance(node.cmdline, list)
                    else str(node.cmdline).lower()
                )
                has_urlcache = "-urlcache" in cmdline_str or "/urlcache" in cmdline_str
                has_split = "-split" in cmdline_str or "/split" in cmdline_str
                has_http = "http" in cmdline_str

                if has_urlcache and has_split and has_http:
                    # Find matched keywords
                    matched_keywords = []
                    for arg in node.cmdline:
                        if (
                            "urlcache" in arg.lower()
                            or "split" in arg.lower()
                            or "http" in arg.lower()
                        ):
                            matched_keywords.append(arg)

                    evidence = [self._get_node_evidence(node)]
                    det = self._create_detection(
                        node=node,
                        host_id=tree.host_id,
                        matched_keywords=matched_keywords,
                        matched_processes=["certutil.exe"],
                        evidence=evidence,
                    )
                    detections.append(det)
        return detections
