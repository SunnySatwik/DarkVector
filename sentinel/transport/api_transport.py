"""
HTTP transport layer for DV Sentinel.

Sends TelemetryEvent payloads to the DarkVector backend REST API.
Implements exponential back-off retry so that transient network issues
or backend restarts do not cause permanent event loss.
"""

from __future__ import annotations

import time
from typing import Optional

import httpx

import config
from models.telemetry import TelemetryEvent
from utils.logger import setup_logger

logger = setup_logger("sentinel.transport.api", config.LOG_LEVEL)


class APITransport:
    """
    Posts TelemetryEvent JSON payloads to POST /api/v1/telemetry.

    Retry policy
    ------------
    Retries are attempted up to MAX_RETRIES times.
    """

    TELEMETRY_ENDPOINT = "/api/v1/telemetry"

    MAX_RETRIES = 5
    BASE_BACKOFF_SECONDS = 2.0
    MAX_BACKOFF_SECONDS = 60.0
    REQUEST_TIMEOUT_SECONDS = 5.0

    def __init__(
        self,
        server_url: Optional[str] = None,
        api_key: Optional[str] = None,
    ) -> None:

        self.server_url = (server_url or config.SERVER_URL).rstrip("/")
        self.api_key = api_key if api_key is not None else config.API_KEY

        self.telemetry_url = (
            f"{self.server_url}{self.TELEMETRY_ENDPOINT}"
        )

        self.client = httpx.Client(
            timeout=self.REQUEST_TIMEOUT_SECONDS
        )

    def _build_headers(self) -> dict[str, str]:
        return {
            "Content-Type": "application/json",
            "User-Agent": f"DV-Sentinel/{config.AGENT_VERSION}",
            "X-Agent-Version": config.AGENT_VERSION,
            "X-API-Key": self.api_key,
        }

    def _backoff(self, attempt: int) -> float:
        return min(
            self.BASE_BACKOFF_SECONDS ** attempt,
            self.MAX_BACKOFF_SECONDS,
        )

    def send(self, event: TelemetryEvent) -> bool:

        payload = event.to_dict()

        for attempt in range(1, self.MAX_RETRIES + 1):

            try:

                response = self.client.post(
                    self.telemetry_url,
                    json=payload,
                    headers=self._build_headers(),
                )

                response.raise_for_status()

                logger.info(
                    "Event delivered",
                    extra={
                        "event_id": event.id,
                        "event_type": event.event_type,
                        "status_code": response.status_code,
                        "attempt": attempt,
                    },
                )

                return True

            except httpx.HTTPStatusError as exc:

                logger.warning(
                    "HTTP error — server rejected the event",
                    extra={
                        "event_id": event.id,
                        "status_code": exc.response.status_code,
                        "attempt": attempt,
                        "max_retries": self.MAX_RETRIES,
                    },
                )

                if 400 <= exc.response.status_code < 500:

                    logger.error(
                        "Non-retryable client error — dropping event",
                        extra={
                            "event_id": event.id,
                            "status_code": exc.response.status_code,
                        },
                    )

                    return False

            except httpx.RequestError as exc:

                logger.warning(
                    "Connection error — will retry",
                    extra={
                        "event_id": event.id,
                        "error": str(exc),
                        "attempt": attempt,
                        "max_retries": self.MAX_RETRIES,
                    },
                )

            if attempt < self.MAX_RETRIES:

                wait = self._backoff(attempt)

                logger.info(
                    f"Retrying in {wait:.1f}s",
                    extra={
                        "event_id": event.id,
                        "next_attempt": attempt + 1,
                    },
                )

                time.sleep(wait)

        logger.error(
            "All retry attempts exhausted — event lost",
            extra={
                "event_id": event.id,
                "attempts": self.MAX_RETRIES,
            },
        )

        return False

    def close(self) -> None:
        """
        Close the persistent HTTP client.
        """

        self.client.close()