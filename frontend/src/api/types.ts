export interface AnalyzeRequest {
  id: string;
  timestamp: string;
  source: string;
  type: string;
  severity: string;
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
  severity: string;
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

export interface AnalyzeResponse {
  analysis: AnalysisResult;
  explanation: Explanation;
  metadata: Metadata;
}

export interface Investigation {
  investigation_id: string;

  alert_id: string;

  title: string;

  status: string;

  severity: string;

  risk_score: number;

  confidence: number;

  summary: string;

  created_at: string;

  updated_at: string;
}

export interface InvestigationListResponse {
  investigations: Investigation[];
}

export interface InvestigationDetail {
  investigation: Investigation;
  alert: AnalyzeRequest;
  analysis: AnalyzeResponse;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  actor: string;
  event_type: string;
  title: string;
  description: string;
}