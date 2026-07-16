import { Severity } from "../types";

export interface AnalyzeRequest {
  id: string;
  timestamp: string;
  source: string;
  type: string;
  severity: Severity;
  category: string;
  description: string;
  details: {
    ipAddress?: string;
    userAgent?: string;
    processPath?: string;
    parentProcess?: string;
    commandLine?: string;
    port?: number;
    bytesTransferred?: number;
    username?: string;
    isolationForestScore?: number;
  };
}

export interface TopFactor {
  feature: string;
  impact: number;
  direction: string;
}

export interface AnalysisResult {
  risk_score: number;
  anomaly_score: number;
  severity: Severity;
  confidence: number;
  is_anomaly: boolean;
}

export interface Explanation {
  summary: string;
  top_factors: TopFactor[];
}

export interface Metadata {
  model_version: string;
  analysis_time_ms: number;
}

export interface MitreInfo {
  technique_id: string;
  technique_name: string;
  tactic: string;
  description: string;
}

export interface ThreatIntelInfo {
  reputation: string;
  confidence: number;
  category: string;
  summary: string;
}

export interface ContextEnrichment {
  mitre: MitreInfo;
  threat_intelligence: ThreatIntelInfo;
}

export interface AnalyzeResponse {
  analysis: AnalysisResult;
  explanation: Explanation;
  metadata: Metadata;
  context?: ContextEnrichment;
}

export interface Investigation {
  investigation_id: string;
  alert_id: string;
  title: string;
  status: string;
  severity: Severity;
  risk_score: number;
  confidence: number | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
  containment_status?: string | null;
  containment_message?: string | null;
}

export interface InvestigationListResponse {
  investigations: Investigation[];
}

export interface InvestigationDetail {
  investigation: Investigation;
  alert: AnalyzeRequest | null;
  analysis: AnalyzeResponse | null;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  actor: string;
  event_type: string;
  title: string;
  description: string;
}

// ─── Behavioral Workspace Interfaces ────────────────────────────────────────

export interface BehavioralDetection {
  id: string;
  rule_id: string;
  title: string;
  description: string;
  severity: Severity;
  confidence: number;
  host_id: string;
  process_guid: string;
  timestamp: number;
  mitre_technique: string | null;
  mitre_tactic: string | null;
  recommendations: string[];
  evidence: Record<string, any>[];
  metadata: Record<string, any>;
}

export interface Correlation {
  correlation_id: string;
  number_of_detections: number;
  first_seen: number;
  last_seen: number;
  duration: number;
  involved_process_guids: string[];
  mitre_techniques: string[];
  mitre_tactics: string[];
  aggregate_severity: Severity;
  aggregate_confidence: number;
}

export interface ProcessEvidence {
  process_guid: string;
  pid: number | null;
  ppid: number | null;
  process_name: string | null;
  executable: string | null;
  cmdline: string[] | string | null;
  username: string | null;
  parent_info: string | Record<string, any> | null;
}

export interface MitreMapping {
  technique_id: string;
  technique_name: string | null;
  tactic: string | null;
  description: string | null;
  [key: string]: any; // supports extra metadata returned by backend
}

export interface ContainmentJob {
  job_id: string;
  status: string;
  executor: string;
  message: string | null;
  started_at: string;
  completed_at: string | null;
  last_update: string;
}

export interface InvestigationWorkspace {
  investigation: Investigation;
  alert: AnalyzeRequest | null;
  analysis: AnalyzeResponse | null;
  is_behavioral: boolean;
  behavioral_detections: BehavioralDetection[];
  primary_detection: BehavioralDetection | null;
  correlation: Correlation | null;
  process_evidence: ProcessEvidence[];
  mitre_mappings: MitreMapping[];
  recommendations: string[];
  timeline: TimelineEvent[];
  containment_job: ContainmentJob | null;
}