from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from typing import Any

from app.services.detection.models import Detection


@dataclass(frozen=True)
class CorrelatedDetectionGroup:
    """
    Structured, immutable group of correlated detections on a single host.
    """

    group_id: str
    host_id: str
    detections: list[Detection]
    first_seen: float
    last_seen: float
    severity: str
    confidence: int
    process_guids: list[str]
    mitre_techniques: list[str]
    mitre_tactics: list[str]
    primary_detection: Detection
    metadata: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def create(cls, detections: list[Detection]) -> CorrelatedDetectionGroup:
        """
        Creates a CorrelatedDetectionGroup deterministically from a list of detections.
        """
        if not detections:
            raise ValueError(
                "Cannot create a correlation group with empty detections"
            )

        host_id = detections[0].host_id

        # Sort detection IDs to make ID generation order-independent
        sorted_ids = sorted(d.id for d in detections)
        raw_id_str = ",".join(sorted_ids)
        group_hash = hashlib.sha256(raw_id_str.encode()).hexdigest()
        group_id = f"corr_{group_hash}"

        first_seen = min(d.timestamp for d in detections)
        last_seen = max(d.timestamp for d in detections)

        # Severity ranking mapping
        severity_order = {
            "CRITICAL": 4,
            "HIGH": 3,
            "MEDIUM": 2,
            "LOW": 1,
        }

        # Deterministically select primary_detection
        # Priority: highest severity, highest confidence, oldest timestamp, lexicographical ID
        primary_detection = min(
            detections,
            key=lambda d: (
                -severity_order.get(d.severity.upper(), 0),
                -d.confidence,
                d.timestamp,
                d.id,
            ),
        )

        # Severity aggregation: highest severity
        highest_severity = max(
            detections, key=lambda d: severity_order.get(d.severity.upper(), 0)
        ).severity

        # Confidence aggregation: maximum confidence
        highest_confidence = max(d.confidence for d in detections)

        process_guids = sorted(list(set(d.process_guid for d in detections)))
        mitre_techniques = sorted(
            list(
                set(d.mitre_technique for d in detections if d.mitre_technique)
            )
        )
        mitre_tactics = sorted(
            list(set(d.mitre_tactic for d in detections if d.mitre_tactic))
        )

        return cls(
            group_id=group_id,
            host_id=host_id,
            detections=detections,
            first_seen=first_seen,
            last_seen=last_seen,
            severity=highest_severity,
            confidence=highest_confidence,
            process_guids=process_guids,
            mitre_techniques=mitre_techniques,
            mitre_tactics=mitre_tactics,
            primary_detection=primary_detection,
            metadata={
                "detection_count": len(detections),
                "rule_ids": sorted(list(set(d.rule_id for d in detections))),
            },
        )
