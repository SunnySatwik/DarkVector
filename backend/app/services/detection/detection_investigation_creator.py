from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.investigation import (
    Investigation,
    InvestigationSeverity,
    InvestigationStatus,
)
from app.models.timeline import (
    TimelineActor,
    TimelineEvent,
    TimelineEventType,
)
from app.repositories.investigation_repository import InvestigationRepository
from app.repositories.timeline_repository import TimelineRepository
from app.services.detection.models import Detection
from app.services.detection.correlation.models import CorrelatedDetectionGroup
from app.services.telemetry.process_tree.models import ProcessTree
from app.services.timeline_service import TimelineService
from app.services.investigation_service import InvestigationService


class DetectionInvestigationCreator:
    """
    Converts Detection and CorrelatedDetectionGroup objects into DarkVector investigations.

    This keeps the Behavior Detection pipeline independent from the
    ML Alert Analysis pipeline while reusing the existing Investigation,
    Timeline, and Mission Control infrastructure.
    """

    @staticmethod
    def create(
        db: Session,
        detection: Detection,
    ) -> Investigation:

        # Idempotency
        existing = InvestigationRepository.get_by_alert_id(
            db,
            detection.id,
        )

        if existing:
            return existing

        investigation = Investigation(
            investigation_id=InvestigationService._generate_investigation_id(),
            alert_id=detection.id,
            title=detection.title,
            status=InvestigationStatus.NEW,
            severity=InvestigationSeverity[detection.severity],
            risk_score=float(detection.confidence),
            confidence=float(detection.confidence),
            summary=detection.description,
            alert_json=None,
            analysis_json=None,
            detection_json={
                "id": detection.id,
                "rule_id": detection.rule_id,
                "title": detection.title,
                "description": detection.description,
                "severity": detection.severity,
                "confidence": detection.confidence,
                "host_id": detection.host_id,
                "process_guid": detection.process_guid,
                "timestamp": detection.timestamp,
                "mitre_technique": detection.mitre_technique,
                "mitre_tactic": detection.mitre_tactic,
                "recommendations": detection.recommendations,
                "evidence": detection.evidence,
                "metadata": detection.metadata,
            },
        )

        created = InvestigationRepository.create(
            db,
            investigation,
        )

        timeline_repo = TimelineRepository(db)

        timeline_service = TimelineService(
            timeline_repo,
        )

        timeline_service.add_event(
            investigation_id=created.investigation_id,
            event_type=TimelineEventType.ALERT_CREATED,
            actor=TimelineActor.SYSTEM,
            title="Behavioral detection received",
            description=(
                f"Detection '{created.title}' automatically "
                f"created a new investigation."
            ),
        )

        timeline_service.add_event(
            investigation_id=created.investigation_id,
            event_type=TimelineEventType.ANALYSIS_COMPLETED,
            actor=TimelineActor.SYSTEM,
            title="Behavior analysis completed",
            description=(
                f"Rule '{detection.rule_id}' generated a "
                f"{created.severity.value} severity detection "
                f"with {created.confidence:.0f}% confidence."
            ),
        )

        return created

    @staticmethod
    def create_from_group(
        db: Session,
        group: CorrelatedDetectionGroup,
        tree: ProcessTree,
    ) -> Investigation:
        """
        Creates or updates an Investigation from a CorrelatedDetectionGroup.
        Implements merging and conflict resolution based on detection ID and
        process tree lineage history.
        """
        # Trace the entire connected process tree component for all group detections
        related_guids = set()
        for det in group.detections:
            related_guids.add(det.process_guid)
            node = tree.get_node(det.process_guid)
            if node:
                # Find root
                root = node
                while root.parent:
                    root = root.parent
                # Walk down BFS to collect all GUIDs in the same tree component
                queue = [root]
                while queue:
                    curr = queue.pop(0)
                    related_guids.add(curr.process_guid)
                    for child in curr.children:
                        queue.append(child)

        detection_ids = [d.id for d in group.detections]

        # Abstracted lookup search via InvestigationRepository
        matches = InvestigationRepository.find_by_detection_ids_or_process_guids(
            db=db,
            detection_ids=detection_ids,
            process_guids=list(related_guids),
        )

        timeline_repo = TimelineRepository(db)
        timeline_service = TimelineService(timeline_repo)

        # -------------------------------------------------------------
        # Conflict / Merge Policy:
        # If B connects A (in INV1) and C (in INV2), merge all into the
        # oldest (primary) and delete younger secondary records.
        # -------------------------------------------------------------
        if len(matches) > 1:
            matches_sorted = sorted(matches, key=lambda inv: inv.created_at)
            primary_inv = matches_sorted[0]
            secondary_invs = matches_sorted[1:]

            primary_json = primary_inv.detection_json or {}
            if "id" in primary_json and "detections" not in primary_json:
                primary_dets = [primary_json]
            else:
                primary_dets = primary_json.get("detections", [])

            primary_det_ids = {d["id"] for d in primary_dets}

            # Relink secondary detections and timeline events to primary
            for sec_inv in secondary_invs:
                sec_json = sec_inv.detection_json or {}
                if "id" in sec_json and "detections" not in sec_json:
                    sec_dets = [sec_json]
                else:
                    sec_dets = sec_json.get("detections", [])

                for det_dict in sec_dets:
                    if det_dict["id"] not in primary_det_ids:
                        primary_dets.append(det_dict)
                        primary_det_ids.add(det_dict["id"])

                # Relink timeline events using ORM relationships to prevent delete-orphan cascade
                for event in list(sec_inv.timeline):
                    sec_inv.timeline.remove(event)
                    event.investigation = primary_inv
                    primary_inv.timeline.append(event)
                    db.add(event)

                # Delete secondary investigation from DB
                InvestigationRepository.delete(db, sec_inv)

            # Build updated detection state
            primary_inv.detection_json = {
                "correlation_id": group.group_id,
                "detections": primary_dets,
                "group_size": len(primary_dets),
                "primary_detection": {
                    "id": group.primary_detection.id,
                    "rule_id": group.primary_detection.rule_id,
                    "title": group.primary_detection.title,
                    "description": group.primary_detection.description,
                    "severity": group.primary_detection.severity,
                    "confidence": group.primary_detection.confidence,
                    "host_id": group.primary_detection.host_id,
                    "process_guid": group.primary_detection.process_guid,
                    "timestamp": group.primary_detection.timestamp,
                    "mitre_technique": group.primary_detection.mitre_technique,
                    "mitre_tactic": group.primary_detection.mitre_tactic,
                    "recommendations": group.primary_detection.recommendations,
                    "evidence": group.primary_detection.evidence,
                    "metadata": group.primary_detection.metadata,
                },
            }

            timeline_service.add_event(
                investigation_id=primary_inv.investigation_id,
                event_type=TimelineEventType.STATUS_CHANGED,
                actor=TimelineActor.SYSTEM,
                title="Investigation merged",
                description=f"Merged {len(secondary_invs)} secondary investigations into this primary investigation.",
            )

            # Proceed by treating primary_inv as the single matched investigation
            matches = [primary_inv]

        # -------------------------------------------------------------
        # Single Match: Evolving group growth
        # -------------------------------------------------------------
        if len(matches) == 1:
            existing = matches[0]
            existing_json = existing.detection_json or {}

            # Parse list supporting legacy formats
            if "id" in existing_json and "detections" not in existing_json:
                existing_dets = [existing_json]
            else:
                existing_dets = existing_json.get("detections", [])

            existing_det_ids = {d["id"] for d in existing_dets}

            # Filter for genuinely new detections to prevent duplicate events
            new_dets_to_append = []
            for det in group.detections:
                if det.id not in existing_det_ids:
                    new_dets_to_append.append(det)

            if not new_dets_to_append:
                # Fully idempotent check
                return existing

            # Append new detections
            for det in new_dets_to_append:
                existing_dets.append({
                    "id": det.id,
                    "rule_id": det.rule_id,
                    "title": det.title,
                    "description": det.description,
                    "severity": det.severity,
                    "confidence": det.confidence,
                    "host_id": det.host_id,
                    "process_guid": det.process_guid,
                    "timestamp": det.timestamp,
                    "mitre_technique": det.mitre_technique,
                    "mitre_tactic": det.mitre_tactic,
                    "recommendations": det.recommendations,
                    "evidence": det.evidence,
                    "metadata": det.metadata,
                })
                existing_det_ids.add(det.id)

            # Recalculate aggregates across all members
            severity_order = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}
            max_sev = max(
                existing_dets,
                key=lambda d: severity_order.get(d["severity"].upper(), 0),
            )["severity"]
            max_conf = max(d["confidence"] for d in existing_dets)

            # Deterministic selection of updated primary detection
            primary_det_dict = min(
                existing_dets,
                key=lambda d: (
                    -severity_order.get(d["severity"].upper(), 0),
                    -d["confidence"],
                    d["timestamp"],
                    d["id"],
                ),
            )

            # Save updates, preserving original alert_id
            existing.severity = InvestigationSeverity[max_sev]
            existing.risk_score = float(max_conf)
            existing.confidence = float(max_conf)
            existing.detection_json = {
                "correlation_id": group.group_id,
                "detections": existing_dets,
                "group_size": len(existing_dets),
                "primary_detection": primary_det_dict,
            }

            InvestigationRepository.update(db, existing)

            # Timeline log for new additions
            for det in new_dets_to_append:
                timeline_service.add_event(
                    investigation_id=existing.investigation_id,
                    event_type=TimelineEventType.ALERT_CREATED,
                    actor=TimelineActor.SYSTEM,
                    title="Behavioral detection correlated",
                    description=(
                        f"Detection '{det.title}' from rule '{det.rule_id}' "
                        f"correlated into this investigation."
                    ),
                )

            return existing

        # -------------------------------------------------------------
        # New Investigation: Create record from group
        # -------------------------------------------------------------
        primary_det_dict = {
            "id": group.primary_detection.id,
            "rule_id": group.primary_detection.rule_id,
            "title": group.primary_detection.title,
            "description": group.primary_detection.description,
            "severity": group.primary_detection.severity,
            "confidence": group.primary_detection.confidence,
            "host_id": group.primary_detection.host_id,
            "process_guid": group.primary_detection.process_guid,
            "timestamp": group.primary_detection.timestamp,
            "mitre_technique": group.primary_detection.mitre_technique,
            "mitre_tactic": group.primary_detection.mitre_tactic,
            "recommendations": group.primary_detection.recommendations,
            "evidence": group.primary_detection.evidence,
            "metadata": group.primary_detection.metadata,
        }

        if len(group.detections) > 1:
            title = f"Correlated Detections on Host {group.host_id}"
            summary = (
                f"{len(group.detections)} related behavioral detections "
                f"correlated on host {group.host_id}."
            )
        else:
            title = group.detections[0].title
            summary = group.detections[0].description

        investigation = Investigation(
            investigation_id=InvestigationService._generate_investigation_id(),
            alert_id=group.group_id,  # Stable identity key
            title=title,
            status=InvestigationStatus.NEW,
            severity=InvestigationSeverity[group.severity],
            risk_score=float(group.confidence),
            confidence=float(group.confidence),
            summary=summary,
            alert_json=None,
            analysis_json=None,
            detection_json={
                "correlation_id": group.group_id,
                "detections": [
                    {
                        "id": d.id,
                        "rule_id": d.rule_id,
                        "title": d.title,
                        "description": d.description,
                        "severity": d.severity,
                        "confidence": d.confidence,
                        "host_id": d.host_id,
                        "process_guid": d.process_guid,
                        "timestamp": d.timestamp,
                        "mitre_technique": d.mitre_technique,
                        "mitre_tactic": d.mitre_tactic,
                        "recommendations": d.recommendations,
                        "evidence": d.evidence,
                        "metadata": d.metadata,
                    }
                    for d in group.detections
                ],
                "group_size": len(group.detections),
                "primary_detection": primary_det_dict,
            },
        )

        created = InvestigationRepository.create(db, investigation)

        if len(group.detections) > 1:
            timeline_service.add_event(
                investigation_id=created.investigation_id,
                event_type=TimelineEventType.ALERT_CREATED,
                actor=TimelineActor.SYSTEM,
                title="Correlated behavioral detections received",
                description=(
                    f"{len(group.detections)} related behavioral detections "
                    f"were correlated into a single investigation."
                ),
            )
        else:
            timeline_service.add_event(
                investigation_id=created.investigation_id,
                event_type=TimelineEventType.ALERT_CREATED,
                actor=TimelineActor.SYSTEM,
                title="Behavioral detection received",
                description=(
                    f"Detection '{created.title}' automatically "
                    f"created a new investigation."
                ),
            )

        for det in group.detections:
            timeline_service.add_event(
                investigation_id=created.investigation_id,
                event_type=TimelineEventType.ANALYSIS_COMPLETED,
                actor=TimelineActor.SYSTEM,
                title="Behavior analysis completed",
                description=(
                    f"Rule '{det.rule_id}' generated a "
                    f"{det.severity} severity detection "
                    f"with {det.confidence:.0f}% confidence."
                ),
            )

        return created