import platform
import uuid
import config
from sentinel.models.telemetry import TelemetryEvent
from sentinel.utils.logger import setup_logger
from .snapshot import ProcessSnapshotCollector
from .diff import ProcessDiffEngine
from .models import ProcessSnapshot

logger = setup_logger("sentinel.collector.process", config.LOG_LEVEL)

_HOST_ID = str(uuid.uuid5(uuid.NAMESPACE_DNS, platform.node()))


class ProcessCollector:
    """
    Stateful collector that polls process snapshots, runs diff engine comparisons,
    and constructs TelemetryEvents for started/exited processes.
    """

    def __init__(self) -> None:
        self.previous_snapshot: dict[int, ProcessSnapshot] | None = None

    def collect(self) -> list[TelemetryEvent]:
        """
        Gathers process snapshot, diffs vs previous snapshot, and generates
        events. On the first run, it establishes baseline snapshot state.
        """
        try:
            current_snapshot = ProcessSnapshotCollector.collect()

            if self.previous_snapshot is None:
                # Baseline setup, no events reported on first cycle
                self.previous_snapshot = current_snapshot
                logger.info(
                    "Process telemetry baseline established",
                    extra={
                        "total_running_processes": len(current_snapshot),
                        "number_of_started_processes": 0,
                        "number_of_exited_processes": 0,
                    },
                )
                return []

            started, terminated = ProcessDiffEngine.diff(
                self.previous_snapshot, current_snapshot
            )

            events = []

            for proc in started:
                events.append(
                    TelemetryEvent(
                        host_id=_HOST_ID,
                        hostname=platform.node(),
                        agent_version=config.AGENT_VERSION,
                        event_type="process_start",
                        severity="info",
                        source="sentinel.collector.process",
                        data=proc.to_dict(),
                    )
                )

            for proc in terminated:
                events.append(
                    TelemetryEvent(
                        host_id=_HOST_ID,
                        hostname=platform.node(),
                        agent_version=config.AGENT_VERSION,
                        event_type="process_exit",
                        severity="info",
                        source="sentinel.collector.process",
                        data=proc.to_dict(),
                    )
                )

            logger.info(
                "Process scan completed",
                extra={
                    "total_running_processes": len(current_snapshot),
                    "number_of_started_processes": len(started),
                    "number_of_exited_processes": len(terminated),
                },
            )

            self.previous_snapshot = current_snapshot
            return events

        except Exception as exc:
            logger.error(
                "Process collector error",
                extra={"error": str(exc)},
                exc_info=True,
            )
            return []
