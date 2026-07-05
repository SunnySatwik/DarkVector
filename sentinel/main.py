# main.py
"""
DV Sentinel — entry point.

Run with:
    python main.py

Environment overrides (see config.py):
    DV_SERVER_URL          Backend base URL  (default: http://localhost:8000)
    DV_API_KEY             Bearer auth token (default: empty)
    DV_HEARTBEAT_INTERVAL  Seconds between heartbeats (default: 30)
    DV_LOG_LEVEL           DEBUG | INFO | WARNING | ERROR (default: INFO)
"""

from __future__ import annotations

import signal
import sys
import time

import config
from collector.heartbeat import HeartbeatCollector
from transport.api_transport import APITransport
from utils.logger import setup_logger

logger = setup_logger("sentinel.main", config.LOG_LEVEL)

# ── Graceful shutdown flag ────────────────────────────────────────────────────
_running: bool = True


def _handle_signal(signum: int, _frame: object) -> None:
    """Set the shutdown flag on SIGINT / SIGTERM."""
    global _running
    logger.info(
        "Shutdown signal received — stopping after current cycle",
        extra={"signal": signum},
    )
    _running = False


def main() -> None:
    logger.info(
        "DV Sentinel starting",
        extra={
            "version": config.AGENT_VERSION,
            "server": config.SERVER_URL,
            "heartbeat_interval_s": config.HEARTBEAT_INTERVAL,
            "log_level": config.LOG_LEVEL,
        },
    )

    # Register graceful shutdown handlers
    signal.signal(signal.SIGINT, _handle_signal)
    signal.signal(signal.SIGTERM, _handle_signal)

    heartbeat_collector = HeartbeatCollector()
    transport = APITransport()

    try:
        while _running:
            try:
                event = heartbeat_collector.collect()
                delivered = transport.send(event)

                if not delivered:
                    logger.warning(
                        "Heartbeat delivery failed after all retries — continuing",
                        extra={"event_id": event.id},
                    )

            except Exception as exc:
                logger.error(
                    "Unexpected error in main loop",
                    extra={"error": str(exc)},
                    exc_info=True,
                )

            # Sleep in 1-second ticks so SIGINT is processed promptly
            for _ in range(config.HEARTBEAT_INTERVAL):
                if not _running:
                    break
                time.sleep(1)

    finally:
        transport.close()
        logger.info("HTTP transport closed.")

    logger.info("DV Sentinel stopped cleanly.")
    sys.exit(0)


if __name__ == "__main__":
    main()
