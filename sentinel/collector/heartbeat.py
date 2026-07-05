# collector/heartbeat.py
"""
Heartbeat telemetry collector.

Gathers a snapshot of system-level health metrics every time ``collect()``
is called. The collected data is returned as a TelemetryEvent so the
transport layer can send it to the DarkVector backend without knowing
anything about the platform APIs.
"""

from __future__ import annotations

import platform
import socket
import time
import uuid
from datetime import datetime, timezone

import psutil

import config
from models.telemetry import TelemetryEvent
from utils.logger import setup_logger

logger = setup_logger("sentinel.collector.heartbeat", config.LOG_LEVEL)

# ── Stable host identifier ────────────────────────────────────────────────────
# Derived deterministically from the fully-qualified hostname so it survives
# agent restarts without needing to persist state to disk.
_HOST_ID: str = str(uuid.uuid5(uuid.NAMESPACE_DNS, platform.node()))


class HeartbeatCollector:
    """
    Collects a point-in-time snapshot of endpoint health metrics.

    Collected fields
    ----------------
    hostname          : str   – System hostname.
    os                : str   – Operating system name (e.g. "Windows", "Linux").
    os_version        : str   – Detailed OS version string.
    architecture      : str   – CPU architecture (e.g. "AMD64", "arm64").
    cpu_usage_percent : float – CPU utilisation across all cores (1-second sample).
    memory_total_bytes: int   – Total physical RAM in bytes.
    memory_used_bytes : int   – In-use physical RAM in bytes.
    memory_usage_pct  : float – Memory utilisation as a percentage.
    uptime_seconds    : int   – Seconds since the system booted.
    ip_address        : str   – Primary network IP address.
    collected_at      : str   – ISO-8601 UTC timestamp of the snapshot.
    """

    def collect(self) -> TelemetryEvent:
        """
        Sample the current system state and return a TelemetryEvent.
        """
        # CPU — block for 1 s to get a meaningful sample
        cpu_percent: float = psutil.cpu_percent(interval=1)

        # Memory
        mem = psutil.virtual_memory()

        # Uptime
        uptime_seconds: int = int(time.time() - psutil.boot_time())

        # Primary IP address
        try:
            ip_address: str = socket.gethostbyname(socket.gethostname())
        except OSError:
            ip_address = "127.0.0.1"

        payload: dict = {
    "hostname": platform.node(),
    "agent_version": config.AGENT_VERSION,
    "os": platform.system(),
    "os_version": platform.version(),
    "architecture": platform.machine(),
    "cpu_usage_percent": cpu_percent,
    "memory_total_bytes": mem.total,
    "memory_used_bytes": mem.used,
    "memory_usage_percent": mem.percent,
    "uptime_seconds": uptime_seconds,
    "ip_address": ip_address,
    "collected_at": datetime.now(timezone.utc).isoformat(),
}

        event = TelemetryEvent(
            host_id=_HOST_ID,
            hostname=platform.node(),
            agent_version=config.AGENT_VERSION,
            event_type="heartbeat",
            severity="info",
            source="sentinel.collector.heartbeat",
            data=payload,
        )

        logger.info(
            "Heartbeat collected",
            extra={
                "host_id": _HOST_ID,
                "cpu_pct": cpu_percent,
                "mem_pct": mem.percent,
                "uptime_s": uptime_seconds,
            },
        )

        return event
