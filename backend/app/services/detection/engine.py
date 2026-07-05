import logging
import time
from app.services.detection.models import Detection
from app.services.detection.registry import DetectionRegistry
from app.services.telemetry.process_tree.models import ProcessTree

logger = logging.getLogger(__name__)


class DetectionEngine:
    """
    Stateless evaluation engine that runs registered detection rules against a ProcessTree.
    """

    @staticmethod
    def evaluate(tree: ProcessTree) -> list[Detection]:
        """
        Evaluate all registered rules on the provided ProcessTree.
        """
        start_time = time.perf_counter()

        rules = DetectionRegistry.get_rules()
        results = []
        rule_execution_counts = {}
        rule_failures = 0

        # Run each rule with isolation/fault-tolerance
        for rule in rules:
            try:
                rule_detections = rule.evaluate(tree)
                rule_execution_counts[rule.id] = len(rule_detections)
                results.extend(rule_detections)
            except Exception as e:
                rule_failures += 1
                logger.error(
                    f"Rule {rule.id} failed during evaluation: {e}",
                    exc_info=True,
                )
                rule_execution_counts[rule.id] = 0

        # Suppress duplicate detections using their deterministic IDs
        unique_detections = {}
        for det in results:
            unique_detections[det.id] = det

        deduplicated_results = list(unique_detections.values())

        # Sort detections: Severity (CRITICAL > HIGH > MEDIUM > LOW), Confidence (descending), Timestamp (descending)
        severity_order = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}

        sorted_results = sorted(
            deduplicated_results,
            key=lambda d: (
                severity_order.get(d.severity.upper(), 0),
                d.confidence,
                d.timestamp,
            ),
            reverse=True,
        )

        end_time = time.perf_counter()
        execution_time_ms = (end_time - start_time) * 1000.0

        node_count = len(tree.nodes_by_guid)
        throughput = (
            (node_count / (execution_time_ms / 1000.0))
            if execution_time_ms > 0
            else 0.0
        )

        # Logging all metrics
        logger.info(
            f"Detection engine executed {len(rules)} rules on {node_count} process nodes "
            f"in {execution_time_ms:.2f}ms. Generated {len(sorted_results)} detections. "
            f"Throughput: {throughput:.2f} nodes/sec. Failures: {rule_failures}.",
            extra={
                "rules_executed": [rule.id for rule in rules],
                "execution_time_ms": execution_time_ms,
                "detections_generated": len(sorted_results),
                "rule_execution_counts": rule_execution_counts,
                "rule_failures": rule_failures,
                "engine_throughput_nodes_per_sec": throughput,
            },
        )

        return sorted_results
