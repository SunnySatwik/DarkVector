from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from app.services.telemetry.telemetry_repository import TelemetryRepository
from app.services.telemetry.process_tree.builder import ProcessTreeBuilder
from app.services.detection.engine import DetectionEngine
from app.services.detection.detection_investigation_creator import (
    DetectionInvestigationCreator,
)

logger = logging.getLogger(__name__)


class DetectionScheduler:
    """
    Executes one complete autonomous detection cycle.

        Telemetry
            ↓
        Process Tree
            ↓
        Detection Engine
            ↓
        Investigation Creator
    """

    @staticmethod
    def run(db: Session) -> int:

        print("1. Querying process events...")

        process_events = TelemetryRepository.get_recent_process_events(
            db,
            limit=5000,
        )

        print(f"2. Process events: {len(process_events)}")

        trees = ProcessTreeBuilder.build(process_events)

        print(f"3. Trees built: {len(trees)}")

        total_detections = 0

        for host_id, tree in trees.items():

            print(
                f"Host {host_id}: "
                f"{len(tree.nodes_by_guid)} nodes"
            )
            print("\n===== PROCESS TREE =====")

            for node in tree.walk_depth_first():
                print(
                    f"{node.process_name} "
                    f"PID={node.pid} "
                    f"PPID={node.ppid}"
                )

                print(node.cmdline)
            detections = DetectionEngine.evaluate(tree)

            print(
                f"Host {host_id}: "
                f"{len(detections)} detections"
            )

            total_detections += len(detections)

            for detection in detections:
                print(
                    "Creating investigation:",
                    detection.id,
                )

                DetectionInvestigationCreator.create(
                    db,
                    detection,
                )

        print("Done")

        return total_detections