# DV Sentinel

**DV Sentinel** is the lightweight endpoint telemetry agent for the DarkVector security platform.

It runs on monitored hosts, collects system-level health metrics, and securely pushes structured telemetry events to the DarkVector backend over HTTPS.

---

## Architecture

```
sentinel/
├── main.py                     # Entry point — heartbeat loop & graceful shutdown
├── config.py                   # Configuration — environment-variable overrides
├── requirements.txt            # Python dependencies
│
├── models/
│   └── telemetry.py            # TelemetryEvent dataclass
│
├── collector/
│   └── heartbeat.py            # HeartbeatCollector — system health metrics
│
├── transport/
│   └── api_transport.py        # APITransport — HTTP POST with retry backoff
│
└── utils/
    └── logger.py               # Structured JSON logger
```

---

## Quick Start

### 1. Create a virtual environment

```bash
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure (optional)

All configuration is handled via environment variables. Defaults work out of the box against a local DarkVector backend.

| Variable                  | Default                     | Description                                    |
|---------------------------|-----------------------------|------------------------------------------------|
| `DV_SERVER_URL`           | `http://localhost:8000`     | Base URL of the DarkVector backend.            |
| `DV_API_KEY`              | _(empty)_                   | Bearer token for API authentication.           |
| `DV_HEARTBEAT_INTERVAL`   | `30`                        | Seconds between heartbeat events.              |
| `DV_LOG_LEVEL`            | `INFO`                      | Logging verbosity: DEBUG / INFO / WARNING / ERROR. |

### 4. Run

```bash
python main.py
```

To run against a remote backend:

```bash
DV_SERVER_URL=https://darkvector.example.com \
DV_API_KEY=your-api-key-here \
DV_HEARTBEAT_INTERVAL=60 \
python main.py
```

---

## Telemetry Event Schema

Every event posted to `POST /api/v1/telemetry` follows this JSON structure:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "host_id": "deterministic-uuid5-from-hostname",
  "hostname": "my-workstation",
  "agent_version": "0.1.0",
  "timestamp": "2026-07-05T05:30:00.000000+00:00",
  "event_type": "heartbeat",
  "severity": "info",
  "source": "sentinel.collector.heartbeat",
  "data": {
    "hostname": "my-workstation",
    "os": "Windows",
    "os_version": "10.0.22631",
    "architecture": "AMD64",
    "cpu_usage_percent": 12.4,
    "memory_total_bytes": 17179869184,
    "memory_used_bytes": 8589934592,
    "memory_usage_percent": 50.0,
    "uptime_seconds": 86400,
    "ip_address": "192.168.1.42",
    "collected_at": "2026-07-05T05:30:00.000000+00:00"
  }
}
```

---

## Extending Sentinel

### Adding a new collector

1. Create `collector/your_collector.py`.
2. Implement a class with a `collect() -> TelemetryEvent` method.
3. Import and call it in `main.py`.

The `TelemetryEvent` dataclass and `APITransport.send()` remain unchanged — the new collector just sets a different `event_type` and `data` payload.

### Future roadmap

- Process monitoring
- Filesystem change events
- Network connection telemetry
- User activity events
- Detection rules engine

---

## Transport Retry Policy

`APITransport` implements exponential back-off retry on transient network errors and 5xx responses:

| Attempt | Wait before next |
|---------|-----------------|
| 1       | 2 s             |
| 2       | 4 s             |
| 3       | 8 s             |
| 4       | 16 s            |
| 5       | _(final, fail)_ |

4xx responses (auth errors, bad payloads) are **not** retried — the event is dropped and an error is logged.

---

## Logging

DV Sentinel emits structured JSON logs to stdout for compatibility with log aggregators:

```json
{
  "timestamp": "2026-07-05T05:30:00.123456+00:00",
  "level": "INFO",
  "logger": "sentinel.main",
  "message": "DV Sentinel starting",
  "version": "0.1.0",
  "server": "http://localhost:8000",
  "heartbeat_interval_s": 30
}
```

---

## Graceful Shutdown

Send `SIGINT` (Ctrl+C) or `SIGTERM` to stop the agent cleanly after the current cycle completes.
