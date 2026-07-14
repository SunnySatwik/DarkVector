import { Severity } from "../types";
import {
  Investigation,
  AnalyzeRequest,
  AnalyzeResponse,
  BehavioralDetection,
  Correlation,
  ProcessEvidence,
  MitreMapping,
  TimelineEvent,
  InvestigationWorkspace,
} from "../api/types";

export interface WorkspaceViewModel {
  investigation: Investigation;
  legacyAlert: AnalyzeRequest | null;
  legacyAnalysis: AnalyzeResponse | null;
  isBehavioral: boolean;
  detections: BehavioralDetection[];
  primaryDetection: BehavioralDetection | null;
  correlation: Correlation | null;
  processes: ProcessEvidence[];
  mitreMappings: MitreMapping[];
  recommendations: string[];
  timeline: TimelineEvent[];
}

export function mapWorkspaceResponse(
  workspace: InvestigationWorkspace
): WorkspaceViewModel {
  return {
    investigation: {
      ...workspace.investigation,
      severity: workspace.investigation.severity
        ? (workspace.investigation.severity.toLowerCase() as Severity)
        : "medium",
      confidence: workspace.investigation.confidence !== null && workspace.investigation.confidence !== undefined
        ? (workspace.investigation.confidence <= 1.0 ? workspace.investigation.confidence * 100 : workspace.investigation.confidence)
        : null,
    },
    legacyAlert: workspace.alert
      ? {
          ...workspace.alert,
          severity: workspace.alert.severity
            ? (workspace.alert.severity.toLowerCase() as Severity)
            : "medium",
        }
      : null,
    legacyAnalysis: workspace.analysis
      ? {
          ...workspace.analysis,
          analysis: {
            ...workspace.analysis.analysis,
            severity: workspace.analysis.analysis.severity
              ? (workspace.analysis.analysis.severity.toLowerCase() as Severity)
              : "medium",
            confidence: workspace.analysis.analysis.confidence <= 1.0
              ? workspace.analysis.analysis.confidence * 100
              : workspace.analysis.analysis.confidence,
          },
        }
      : null,
    isBehavioral: workspace.is_behavioral,
    detections: (workspace.behavioral_detections || []).map((det) => ({
      ...det,
      severity: det.severity ? (det.severity.toLowerCase() as Severity) : "medium",
    })),
    primaryDetection: workspace.primary_detection
      ? {
          ...workspace.primary_detection,
          severity: workspace.primary_detection.severity
            ? (workspace.primary_detection.severity.toLowerCase() as Severity)
            : "medium",
        }
      : null,
    correlation: workspace.correlation
      ? {
          ...workspace.correlation,
          aggregate_severity: workspace.correlation.aggregate_severity
            ? (workspace.correlation.aggregate_severity.toLowerCase() as Severity)
            : "medium",
        }
      : null,
    processes: workspace.process_evidence || [],
    mitreMappings: workspace.mitre_mappings || [],
    recommendations: workspace.recommendations || [],
    timeline: workspace.timeline || [],
  };
}
