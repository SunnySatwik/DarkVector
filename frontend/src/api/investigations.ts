import { api } from "./client";
import {
    Investigation,
    InvestigationDetail,
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