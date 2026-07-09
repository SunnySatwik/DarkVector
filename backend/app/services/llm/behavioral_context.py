from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class BehavioralReasoningContext:
    """
    Immutable typed representation of behavioral investigation context for the AI reasoning layer.
    """

    is_behavioral: bool
    correlation_id: str | None
    detection_count: int
    primary_detection: dict[str, Any] | None
    detections: tuple[dict[str, Any], ...]
    process_evidence: tuple[dict[str, Any], ...]
    mitre_mappings: tuple[dict[str, Any], ...]
    recommendations: tuple[str, ...]
    first_seen: float | None
    last_seen: float | None
    duration_seconds: float | None
    aggregate_severity: str | None
    aggregate_confidence: float | None

    @classmethod
    def from_context(cls, context: dict[str, Any]) -> BehavioralReasoningContext:
        """
        Creates a BehavioralReasoningContext from the normalized ContextBuilder dictionary.
        """
        beh = context.get("behavioral_context")
        if not beh:
            return cls(
                is_behavioral=False,
                correlation_id=None,
                detection_count=0,
                primary_detection=None,
                detections=(),
                process_evidence=(),
                mitre_mappings=(),
                recommendations=(),
                first_seen=None,
                last_seen=None,
                duration_seconds=None,
                aggregate_severity=None,
                aggregate_confidence=None,
            )

        # Retrieve normalized detections list
        raw_dets = beh.get("detections") or []
        # Ensure deterministic ordering: sorted by timestamp, then by ID
        sorted_dets = sorted(
            raw_dets, key=lambda d: (d.get("timestamp") or 0.0, d.get("id") or "")
        )

        # Retrieve correlation context
        corr = context.get("correlation_context") or {}
        first_seen = corr.get("first_seen")
        last_seen = corr.get("last_seen")
        duration = corr.get("duration")
        agg_sev = corr.get("aggregate_severity")
        agg_conf = corr.get("aggregate_confidence")

        # Retrieve process evidence list
        raw_proc = context.get("process_evidence") or []
        # Ensure deterministic ordering: sorted by process_guid
        sorted_proc = sorted(raw_proc, key=lambda p: p.get("process_guid") or "")

        # Retrieve MITRE mappings
        raw_mitre = context.get("mitre_mappings") or []
        # Ensure deterministic ordering: sorted by technique_id
        sorted_mitre = sorted(raw_mitre, key=lambda m: m.get("technique_id") or "")

        # Retrieve recommendations
        raw_recs = context.get("recommendations") or []

        return cls(
            is_behavioral=True,
            correlation_id=beh.get("correlation_id") or "N/A",
            detection_count=len(sorted_dets),
            primary_detection=beh.get("primary_detection"),
            detections=tuple(sorted_dets),
            process_evidence=tuple(sorted_proc),
            mitre_mappings=tuple(sorted_mitre),
            recommendations=tuple(raw_recs),
            first_seen=first_seen,
            last_seen=last_seen,
            duration_seconds=duration,
            aggregate_severity=agg_sev,
            aggregate_confidence=agg_conf,
        )
