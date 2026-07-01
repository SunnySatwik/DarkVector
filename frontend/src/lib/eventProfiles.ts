import { Alert } from "../types";

export interface EventProfile
    extends Omit<Alert, "id" | "timestamp" | "score"> {
    scoreRange: [number, number];
}

export const EVENT_PROFILES: EventProfile[] = [
    {
        source: "srv-k8s-api-01",
        type: "Container Escape",
        severity: "critical",
        scoreRange: [94, 99],
        status: "open",
        category: "process",
        description:
            "A privileged Kubernetes container attempted to escape into the host namespace.",
        details: {
            processPath: "/usr/bin/bash",
            parentProcess: "containerd-shim",
            commandLine:
                "nsenter --target 1 --mount --uts --ipc --net --pid",
            username: "root",
            isolationForestScore: 0.98,
            shapFactors: [
                { factor: "Privileged Container", impact: 0.43 },
                { factor: "Host Namespace Access", impact: 0.34 },
                { factor: "Unexpected Bash Execution", impact: 0.23 },
            ],
        },
    },

    {
        source: "finance-db-02",
        type: "Credential Dump",
        severity: "critical",
        scoreRange: [91, 99],
        status: "open",
        category: "process",
        description:
            "Suspicious access to LSASS memory consistent with credential dumping.",
        details: {
            processPath: "C:\\Windows\\System32\\rundll32.exe",
            parentProcess: "powershell.exe",
            username: "administrator",
            isolationForestScore: 0.96,
            shapFactors: [
                { factor: "LSASS Memory Access", impact: 0.44 },
                { factor: "Privileged Process", impact: 0.31 },
                { factor: "Credential Dump Signature", impact: 0.25 },
            ],
        },
    },

    {
        source: "eng-workstation-17",
        type: "PowerShell Obfuscation",
        severity: "high",
        scoreRange: [78, 89],
        status: "open",
        category: "process",
        description:
            "Encoded PowerShell execution detected with suspicious child process creation.",
        details: {
            processPath:
                "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
            commandLine:
                "powershell.exe -EncodedCommand SQBtAG0AZQBkAGkAYQB0AGUA",
            username: "j.smith",
            isolationForestScore: 0.88,
            shapFactors: [
                { factor: "Encoded Command", impact: 0.42 },
                { factor: "Execution Policy Bypass", impact: 0.34 },
                { factor: "Child Process Spawn", impact: 0.24 },
            ],
        },
    },

    {
        source: "vpn-gateway",
        type: "Impossible Travel",
        severity: "high",
        scoreRange: [76, 87],
        status: "open",
        category: "authentication",
        description:
            "User authenticated from geographically impossible locations within a short period.",
        details: {
            username: "m.chen",
            ipAddress: "203.0.113.1",
            isolationForestScore: 0.84,
            shapFactors: [
                { factor: "Geographic Velocity", impact: 0.46 },
                { factor: "Multiple Countries", impact: 0.31 },
                { factor: "Abnormal Login Pattern", impact: 0.23 },
            ],
        },
    },

    {
        source: "corp-sql-01",
        type: "SQL Injection",
        severity: "high",
        scoreRange: [80, 90],
        status: "open",
        category: "network",
        description:
            "Application firewall detected SQL injection attempts targeting customer records.",
        details: {
            port: 443,
            bytesTransferred: 15820,
            isolationForestScore: 0.89,
            shapFactors: [
                { factor: "Malicious Query Pattern", impact: 0.45 },
                { factor: "WAF Signature Match", impact: 0.32 },
                { factor: "Repeated Requests", impact: 0.23 },
            ],
        },
    },

    {
        source: "dc-01",
        type: "Kerberoasting",
        severity: "high",
        scoreRange: [82, 91],
        status: "open",
        category: "authentication",
        description:
            "Large volume of Kerberos service ticket requests detected.",
        details: {
            username: "svc-backup",
            isolationForestScore: 0.91,
            shapFactors: [
                { factor: "SPN Enumeration", impact: 0.42 },
                { factor: "Abnormal TGS Requests", impact: 0.35 },
                { factor: "Service Account Activity", impact: 0.23 },
            ],
        },
    },

    {
        source: "edge-fw-01",
        type: "DNS Tunneling",
        severity: "medium",
        scoreRange: [58, 73],
        status: "open",
        category: "network",
        description:
            "High entropy DNS requests indicate possible DNS tunneling.",
        details: {
            port: 53,
            bytesTransferred: 524288,
            isolationForestScore: 0.72,
            shapFactors: [
                { factor: "High DNS Entropy", impact: 0.43 },
                { factor: "Large TXT Records", impact: 0.31 },
                { factor: "Beacon Pattern", impact: 0.26 },
            ],
        },
    },

    {
        source: "srv-linux-09",
        type: "Reverse Shell",
        severity: "critical",
        scoreRange: [93, 99],
        status: "open",
        category: "process",
        description:
            "Reverse shell execution detected connecting to an external host.",
        details: {
            processPath: "/bin/bash",
            isolationForestScore: 0.97,
            shapFactors: [
                { factor: "Outbound Shell", impact: 0.41 },
                { factor: "External Connection", impact: 0.35 },
                { factor: "Unexpected Process", impact: 0.24 },
            ],
        },
    },

    {
        source: "hr-workstation-04",
        type: "Privilege Escalation",
        severity: "high",
        scoreRange: [81, 89],
        status: "open",
        category: "system",
        description:
            "Privilege escalation behaviour detected through abnormal token manipulation.",
        details: {
            username: "alice",
            isolationForestScore: 0.87,
            shapFactors: [
                { factor: "Privilege Token Abuse", impact: 0.45 },
                { factor: "Sensitive Process Access", impact: 0.31 },
                { factor: "Unexpected Elevation", impact: 0.24 },
            ],
        },
    },

    {
        source: "proxy-01",
        type: "Beaconing Activity",
        severity: "medium",
        scoreRange: [55, 70],
        status: "open",
        category: "network",
        description:
            "Periodic outbound communication consistent with command-and-control beaconing.",
        details: {
            bytesTransferred: 98304,
            isolationForestScore: 0.69,
            shapFactors: [
                { factor: "Regular Interval Traffic", impact: 0.42 },
                { factor: "Known C2 Pattern", impact: 0.34 },
                { factor: "Low Data Volume", impact: 0.24 },
            ],
        },
    },

    {
        source: "eng-laptop-11",
        type: "Suspicious Scheduled Task",
        severity: "medium",
        scoreRange: [52, 68],
        status: "open",
        category: "system",
        description:
            "A scheduled task was created outside approved maintenance windows.",
        details: {
            username: "developer",
            isolationForestScore: 0.65,
            shapFactors: [
                { factor: "Unexpected Task Creation", impact: 0.42 },
                { factor: "Persistence Behaviour", impact: 0.34 },
                { factor: "User Context", impact: 0.24 },
            ],
        },
    },

    {
        source: "finance-api-01",
        type: "Ransomware Encryption",
        severity: "critical",
        scoreRange: [95, 99],
        status: "open",
        category: "system",
        description:
            "Mass file encryption activity detected with rapid filesystem changes.",
        details: {
            isolationForestScore: 0.99,
            shapFactors: [
                { factor: "Mass File Modification", impact: 0.46 },
                { factor: "Entropy Increase", impact: 0.32 },
                { factor: "Known Encryption Pattern", impact: 0.22 },
            ],
        },
    },
];