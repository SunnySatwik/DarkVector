import { Investigation } from "../api/types";
import { Severity } from "../types";
import { formatLocalLocale } from "./timeFormatter";


// ─── View Model ───────────────────────────────────────────────────────────────
// CaseItem is the UI-facing representation of an Investigation summary.
// It is intentionally flat — no nested Alert shell.

export interface CaseItem {
    id: string;
    title: string;
    assignedAnalyst: string;
    status: "new" | "investigating" | "contained" | "resolved";
    severity: Severity;
    riskScore: number;
    summary: string | null;
    createdTime: string;
}

// ─── Status mapping ───────────────────────────────────────────────────────────
// Maps backend InvestigationStatus enum values to the UI status keys.

function mapStatus(
    backendStatus: string
): CaseItem["status"] {
    switch (backendStatus.toUpperCase()) {
        case "NEW":
            return "new";
        case "INVESTIGATING":
            return "investigating";
        case "CONTAINED":
            return "contained";
        case "RESOLVED":
        case "FALSE_POSITIVE":
            return "resolved";
        default:
            return "new";
    }
}

// ─── Severity mapping ─────────────────────────────────────────────────────────

function mapSeverity(backendSeverity: string): Severity {
    const s = backendSeverity.toLowerCase();
    if (s === "critical" || s === "high" || s === "medium" || s === "low") {
        return s as Severity;
    }
    return "medium";
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

export function mapInvestigationToCase(
    investigation: Investigation
): CaseItem {
    return {
        id: investigation.investigation_id,
        title: investigation.title,
        assignedAnalyst: "Unassigned",
        status: mapStatus(investigation.status),
        severity: mapSeverity(investigation.severity),
        riskScore: investigation.risk_score,
        summary: investigation.summary ?? null,
        createdTime: formatLocalLocale(investigation.created_at),
    };
}