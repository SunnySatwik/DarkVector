import { api } from "./client";
import {
    Investigation,
    InvestigationDetail,
    TimelineEvent,
} from "./types";

export async function getInvestigations(): Promise<Investigation[]> {
    const response = await api.get("/investigations");

    return response.data.investigations;
}

export async function getInvestigation(
    investigationId: string
): Promise<InvestigationDetail> {

    const response = await api.get(
        `/investigations/${investigationId}`
    );

    return response.data;
}

export async function getTimeline(
    investigationId: string
): Promise<TimelineEvent[]> {
    const response = await api.get(
        `/investigations/${investigationId}/timeline`
    );
    return response.data;
}