from app.services.detection.rules.base import DetectionRule
from app.services.detection.rules.powershell_encoded import PowerShellEncodedRule
from app.services.detection.rules.powershell_cmd import PowerShellCmdRule
from app.services.detection.rules.office_spawn import OfficeSpawnRule
from app.services.detection.rules.certutil_download import CertutilDownloadRule
from app.services.detection.rules.suspicious_lolbins import SuspiciousLOLBinsRule
from app.services.detection.rules.lolbin_chain import LOLBinChainRule


class DetectionRegistry:
    """
    Registry for managing and retrieving instantiated detection rules.
    """

    _rules: list[DetectionRule] = []

    @classmethod
    def register(cls, rule: DetectionRule) -> None:
        """
        Register an instantiated DetectionRule.

        Ensures a rule with the same ID is not registered twice.
        """

        if not any(r.id == rule.id for r in cls._rules):
            cls._rules.append(rule)

    @classmethod
    def get_rules(cls) -> list[DetectionRule]:
        """
        Return all registered detection rule instances.
        """

        return list(cls._rules)


# ---------------------------------------------------------
# Production Detection Rules
# ---------------------------------------------------------

DetectionRegistry.register(PowerShellEncodedRule())
DetectionRegistry.register(PowerShellCmdRule())
DetectionRegistry.register(OfficeSpawnRule())
DetectionRegistry.register(CertutilDownloadRule())
DetectionRegistry.register(SuspiciousLOLBinsRule())
DetectionRegistry.register(LOLBinChainRule())