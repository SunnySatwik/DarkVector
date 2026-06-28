class FeatureMapper:
    """
    Utility class to map high-level security domain objects (Alerts) 
    into the 41-feature network connection representation (KDD Cup 99 schema)
    expected by the backend Isolation Forest anomaly detection model.
    """

    @staticmethod
    def from_alert(alert: dict) -> dict:
        """
        Translates a domain Alert dictionary into a 41-feature KDD network connection record.
        This isolates ML-specific schema expectations from the frontend client.

        Args:
            alert (dict): The domain Alert object containing type, category, and details.

        Returns:
            dict: A dictionary containing all 41 KDD network features with values mapped
                  to simulate the alert's specific threat type.
        """
        # Base default KDD record with normal baseline values
        kdd = {
            "duration": 0,
            "protocol_type": "tcp",
            "service": "http",
            "flag": "SF",
            "src_bytes": 100,
            "dst_bytes": 100,
            "land": 0,
            "wrong_fragment": 0,
            "urgent": 0,
            "hot": 0,
            "num_failed_logins": 0,
            "logged_in": 1,
            "num_compromised": 0,
            "root_shell": 0,
            "su_attempted": 0,
            "num_root": 0,
            "num_file_creations": 0,
            "num_shells": 0,
            "num_access_files": 0,
            "num_outbound_cmds": 0,
            "is_host_login": 0,
            "is_guest_login": 0,
            "count": 1,
            "srv_count": 1,
            "serror_rate": 0.0,
            "srv_serror_rate": 0.0,
            "rerror_rate": 0.0,
            "srv_rerror_rate": 0.0,
            "same_srv_rate": 1.0,
            "diff_srv_rate": 0.0,
            "srv_diff_host_rate": 0.0,
            "dst_host_count": 1,
            "dst_host_srv_count": 1,
            "dst_host_same_srv_rate": 1.0,
            "dst_host_diff_srv_rate": 0.0,
            "dst_host_same_src_port_rate": 1.0,
            "dst_host_srv_diff_host_rate": 0.0,
            "dst_host_serror_rate": 0.0,
            "dst_host_srv_serror_rate": 0.0,
            "dst_host_rerror_rate": 0.0,
            "dst_host_srv_rerror_rate": 0.0,
        }

        category = alert.get("category", "")
        alert_type = alert.get("type", "").lower()
        details = alert.get("details", {}) or {}

        if category == "process":
            kdd["service"] = "private"
            kdd["logged_in"] = 0
            if "namespace" in alert_type or "privilege" in alert_type or "lsass" in alert_type:
                kdd["root_shell"] = 1
                kdd["su_attempted"] = 1
                kdd["hot"] = 3
                kdd["num_compromised"] = 2
        elif category == "network":
            kdd["protocol_type"] = "tcp"
            kdd["service"] = "domain_u" if "dns" in alert_type else "private"
            kdd["flag"] = "SF"
            kdd["src_bytes"] = details.get("bytesTransferred") or 5000000
            kdd["dst_bytes"] = 0
            kdd["count"] = 250
            kdd["srv_count"] = 250
            kdd["same_srv_rate"] = 0.05
            kdd["diff_srv_rate"] = 0.95
        elif category == "authentication":
            kdd["service"] = "login"
            kdd["logged_in"] = 0
            if "brute" in alert_type or "failed" in alert_type:
                kdd["num_failed_logins"] = 5
            kdd["count"] = 100
            kdd["srv_count"] = 10
            kdd["diff_srv_rate"] = 0.8
        elif category == "system":
            kdd["service"] = "private"
            kdd["logged_in"] = 1
            kdd["root_shell"] = 1
            kdd["num_compromised"] = 1

        return kdd
