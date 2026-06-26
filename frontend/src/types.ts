export type Severity = "critical" | "high" | "medium" | "low";

export interface Alert {
  id: string;
  timestamp: string;
  source: string; // Host or User
  type: string; // e.g., "Brute Force Auth", "SQL Injection", "Unusual Process Execution"
  severity: Severity;
  score: number; // Anomaly score (0 to 100)
  status: "open" | "investigating" | "resolved" | "dismissed";
  category: "authentication" | "network" | "process" | "system";
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
    shapFactors?: { factor: string; impact: number }[];
  };
}

export interface UserRisk {
  username: string;
  role: string;
  department: string;
  riskScore: number;
  incidentCount: number;
  avatar: string;
}

export interface MetricCardData {
  title: string;
  value: string | number;
  change: string;
  isPositive: boolean;
  timeline: number[];
}

export interface Workspace {
  id: string;
  name: string;
  region: string;
  sensorsActive: number;
}
