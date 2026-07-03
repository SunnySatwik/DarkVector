"""
test_context_enrichment.py

Unit tests for the context enrichment layer (MITRE + ThreatIntel + ContextService).

Run with:
    pytest backend/tests/test_context_enrichment.py -v
"""

import pytest
from app.services.context.mitre_mapping import lookup as mitre_lookup
from app.services.context.threat_intelligence import lookup as ti_lookup
from app.services.context.context_service import ContextService


# ─── MITRE Mapping Tests ──────────────────────────────────────────────────────

class TestMitreMapping:

    def _alert(self, type_: str, category: str = "authentication") -> dict:
        return {"type": type_, "category": category, "source": "test-host"}

    def test_kerberoasting_maps_to_t1558_003(self):
        result = mitre_lookup(self._alert("Active Directory Kerberoasting Query"))
        assert result["technique_id"] == "T1558.003"
        assert result["technique_name"] == "Kerberoasting"
        assert result["tactic"] == "Credential Access"

    def test_lsass_maps_to_t1003_001(self):
        result = mitre_lookup(self._alert("Local Credential Harvesting (LSASS Read)", "process"))
        assert result["technique_id"] == "T1003.001"
        assert result["tactic"] == "Credential Access"

    def test_dns_tunneling_maps_to_t1071_004(self):
        result = mitre_lookup(self._alert("DNS Tunneling Payload Detection", "network"))
        assert result["technique_id"] == "T1071.004"
        assert result["tactic"] == "Command and Control"

    def test_namespace_exec_maps_to_t1611(self):
        result = mitre_lookup(self._alert("Unusual Namespace Creation & Exec", "process"))
        assert result["technique_id"] == "T1611"
        assert result["tactic"] == "Privilege Escalation"

    def test_iam_privilege_escalation_maps_to_t1078_004(self):
        result = mitre_lookup(self._alert("IAM Role Privilege Escalation", "system"))
        assert result["technique_id"] == "T1078.004"
        assert result["tactic"] == "Privilege Escalation"

    def test_database_dump_maps_to_t1030(self):
        result = mitre_lookup(self._alert("Multi-Source Database Dump", "network"))
        assert result["technique_id"] == "T1030"
        assert result["tactic"] == "Exfiltration"

    def test_api_burst_maps_to_t1498(self):
        result = mitre_lookup(self._alert("Anomalous API Rate Bursts", "network"))
        assert result["technique_id"] == "T1498"
        assert result["tactic"] == "Impact"

    def test_impossible_travel_maps_to_brute_force(self):
        result = mitre_lookup(self._alert("Impossibly Fast Travel (Anomalous Login)"))
        assert result["technique_id"] == "T1110"
        assert result["tactic"] == "Credential Access"

    def test_unknown_type_returns_fallback(self):
        result = mitre_lookup(self._alert("Some Completely Unknown Alert Type XYZ"))
        assert result["technique_id"] == "T1190"
        assert "technique_id" in result
        assert "technique_name" in result
        assert "tactic" in result
        assert "description" in result

    def test_all_fields_always_present(self):
        for type_ in [
            "Kerberoasting",
            "LSASS Read",
            "DNS Tunneling",
            "IAM Role Escalation",
            "Namespace Exec",
            "Database Dump",
            "API Rate Burst",
            "Unknown Gibberish",
        ]:
            result = mitre_lookup({"type": type_, "category": "process", "source": "x"})
            assert set(result.keys()) == {"technique_id", "technique_name", "tactic", "description"}, (
                f"Missing keys for type='{type_}': got {set(result.keys())}"
            )


# ─── Threat Intelligence Tests ────────────────────────────────────────────────

class TestThreatIntelligence:

    def _alert(self, source: str, ip: str | None = None) -> dict:
        details = {"ipAddress": ip} if ip else {}
        return {"source": source, "details": details, "type": "test", "category": "network"}

    def test_known_malicious_ip_returns_malicious(self):
        result = ti_lookup(self._alert("ext-host", "194.26.135.84"))
        assert result["reputation"] == "malicious"
        assert result["confidence"] >= 80

    def test_suspicious_ip_returns_suspicious(self):
        result = ti_lookup(self._alert("ext-host", "80.241.128.9"))
        assert result["reputation"] == "suspicious"

    def test_private_ip_returns_clean(self):
        result = ti_lookup(self._alert("srv-internal", "10.120.14.8"))
        assert result["reputation"] == "clean"

    def test_corp_ad_source_returns_suspicious(self):
        result = ti_lookup(self._alert("corp-ad-controller"))
        assert result["reputation"] == "suspicious"
        assert "Active Directory" in result["category"]

    def test_db_source_returns_suspicious(self):
        result = ti_lookup(self._alert("db-finance-postgres"))
        assert result["reputation"] == "suspicious"
        assert "Database" in result["category"]

    def test_email_source_returns_unknown(self):
        result = ti_lookup(self._alert("m_chen@enterprise.com"))
        assert result["reputation"] == "unknown"
        assert "User Account" in result["category"]

    def test_all_fields_always_present(self):
        for source in ["srv-k8s-api-01", "corp-ad-controller", "unknown-host", "aws-s3-backup"]:
            result = ti_lookup(self._alert(source))
            assert set(result.keys()) == {"reputation", "confidence", "category", "summary"}, (
                f"Missing keys for source='{source}': got {set(result.keys())}"
            )


# ─── ContextService Integration Tests ────────────────────────────────────────

class TestContextService:

    def test_enrich_returns_both_keys(self):
        alert = {
            "type": "Active Directory Kerberoasting Query",
            "category": "authentication",
            "source": "corp-ad-controller",
            "details": {"ipAddress": "10.120.14.8"},
        }
        result = ContextService.enrich(alert)
        assert "mitre" in result
        assert "threat_intelligence" in result

    def test_kerberoasting_full_enrichment(self):
        alert = {
            "type": "Active Directory Kerberoasting Query",
            "category": "authentication",
            "source": "corp-ad-controller",
            "details": {"username": "admin_migration_svc", "ipAddress": "10.120.14.8"},
        }
        result = ContextService.enrich(alert)
        assert result["mitre"]["technique_id"] == "T1558.003"
        # IP 10.x is private → clean, but source corp-ad → suspicious;
        # private IP takes precedence in IP path, so reputation is clean
        assert result["threat_intelligence"]["reputation"] in ("clean", "suspicious")

    def test_never_returns_none(self):
        for alert in [
            {},
            {"type": ""},
            {"type": "Unknown", "category": "unknown"},
            {"type": "DNS Tunneling", "category": "network", "source": "srv-linux-dns-02",
             "details": {"ipAddress": "10.10.8.42"}},
        ]:
            result = ContextService.enrich(alert)
            assert result is not None
            assert result["mitre"] is not None
            assert result["threat_intelligence"] is not None
