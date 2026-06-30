import { Investigation } from "../api/types";
import { Alert } from "../types";

export interface CaseItem {
    id: string;
    title: string;
    assignedAnalyst: string;
    status: "triage" | "review" | "quarantine" | "resolved";
    alert: Alert;
    createdTime: string;
}

export function mapInvestigationToCase(
    investigation: Investigation
): CaseItem {

    return {

        id: investigation.investigation_id,

        title: investigation.title,

        assignedAnalyst: "Unassigned",

        status: "triage",

        alert: {} as Alert,

        createdTime: new Date(
            investigation.created_at
        ).toLocaleString(),

    };

}