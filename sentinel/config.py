# config.py
"""
DV Sentinel configuration.

All values can be overridden via environment variables.
"""

import os

# ── Server ────────────────────────────────────────────────────────────────────
SERVER_URL: str = os.getenv("DV_SERVER_URL", "http://localhost:8000")
"""Base URL of the DarkVector backend (no trailing slash)."""

API_KEY: str = os.getenv("DV_API_KEY", "")
"""Bearer token sent in every request. Leave empty to disable auth header."""

# ── Agent identity ────────────────────────────────────────────────────────────
AGENT_VERSION: str = "0.1.0"
"""Semantic version embedded in every telemetry event."""

# ── Timing ───────────────────────────────────────────────────────────────────
HEARTBEAT_INTERVAL: int = int(os.getenv("DV_HEARTBEAT_INTERVAL", "30"))
"""Seconds between heartbeat events."""

# ── Logging ──────────────────────────────────────────────────────────────────
LOG_LEVEL: str = os.getenv("DV_LOG_LEVEL", "INFO").upper()
"""Python logging level: DEBUG | INFO | WARNING | ERROR."""
