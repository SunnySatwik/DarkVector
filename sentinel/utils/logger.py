# utils/logger.py
"""
Structured JSON logging for DV Sentinel.

Every log record is serialised as a single-line JSON object so that log
aggregators (Splunk, Loki, CloudWatch) can parse fields without regex.
"""

from __future__ import annotations

import json
import logging
import sys
from datetime import datetime, timezone


class _StructuredFormatter(logging.Formatter):
    """
    Formats log records as JSON objects.

    Output shape:
        {
          "timestamp": "2026-07-05T05:30:00.123456+00:00",
          "level":     "INFO",
          "logger":    "sentinel.heartbeat",
          "message":   "Heartbeat collected",
          "exception": "..."   // only present when exc_info is set
        }
    """

    def format(self, record: logging.LogRecord) -> str:
        log_obj: dict = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Attach structured extra fields passed by the caller
        for key, value in record.__dict__.items():
            if key not in (
                "name", "msg", "args", "created", "filename", "funcName",
                "levelname", "levelno", "lineno", "module", "msecs",
                "pathname", "process", "processName", "relativeCreated",
                "stack_info", "thread", "threadName", "exc_info", "exc_text",
                "message",
            ):
                log_obj[key] = value

        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_obj, default=str)


def setup_logger(name: str, level: str = "INFO") -> logging.Logger:
    """
    Return a named logger that emits structured JSON to stdout.

    Calling this function multiple times for the same ``name`` is safe —
    handlers are not duplicated.

    Parameters
    ----------
    name  : str  Dotted logger name (e.g. "sentinel.heartbeat").
    level : str  Python log level string. Defaults to "INFO".
    """
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level.upper(), logging.INFO))

    # Prevent duplicate handlers when called multiple times
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(_StructuredFormatter())
        logger.addHandler(handler)

    # Prevent log records from bubbling up to the root logger
    logger.propagate = False
    return logger
