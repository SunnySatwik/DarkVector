import { api } from "./client";
import { AnalyzeRequest, AnalyzeResponse } from "./types";

export async function analyzeEvent(
    payload: AnalyzeRequest
): Promise<AnalyzeResponse> {

    const response = await api.post(
        "/analyze/",
        payload
    );

    return response.data;
}