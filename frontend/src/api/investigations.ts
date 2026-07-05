import { Severity } from "../types";
import { api } from "./client";
import {
    Investigation,
    InvestigationDetail,
    TimelineEvent,
} from "./types";

export async function getInvestigations(): Promise<Investigation[]> {
    const response = await api.get("/investigations");
    const raw = response.data.investigations as Investigation[];
    return raw.map((inv) => ({
        ...inv,
        severity: inv.severity.toLowerCase() as Severity,
    }));
}

export async function getInvestigation(
    investigationId: string
): Promise<InvestigationDetail> {
    const response = await api.get(
        `/investigations/${investigationId}`
    );
    const data = response.data as InvestigationDetail;
    return {
        ...data,
        investigation: {
            ...data.investigation,
            severity: data.investigation.severity.toLowerCase() as Severity,
        },
        alert: {
            ...data.alert,
            severity: data.alert.severity.toLowerCase() as Severity,
        },
        analysis: {
            ...data.analysis,
            analysis: {
                ...data.analysis.analysis,
                severity: data.analysis.analysis.severity.toLowerCase() as Severity,
            },
        },
    };
}

export async function getTimeline(
    investigationId: string
): Promise<TimelineEvent[]> {
    const response = await api.get(
        `/investigations/${investigationId}/timeline`
    );
    return response.data;
}

export async function updateInvestigationStatus(
    investigationId: string,
    status: string
): Promise<Investigation> {
    const response = await api.patch(
        `/investigations/${investigationId}/status`,
        { status }
    );
    const inv = response.data as Investigation;
    return {
        ...inv,
        severity: inv.severity.toLowerCase() as Severity,
    };
}

export async function sendChatMessage(
    investigationId: string | undefined,
    message: string,
    history: { sender: string; text: string }[] = [],
    alertId?: string
): Promise<string> {
    const response = await api.post("/chat/", {
        investigation_id: investigationId,
        alert_id: alertId,
        message,
        history,
    });
    return response.data.reply;
}

export async function getInvestigationReport(
    investigationId: string
): Promise<{ report: string }> {
    const response = await api.get(
        `/investigations/${investigationId}/report`
    );
    return response.data;
}