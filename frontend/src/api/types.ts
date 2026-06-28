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

export interface AnalyzeResponse {
  anomaly_score: number;
  risk_score: number;
  severity: string;
  is_anomaly: boolean;
}