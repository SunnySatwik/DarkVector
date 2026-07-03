import { Severity } from "../types";
import { api } from "./client";
import { AnalyzeRequest, AnalyzeResponse } from "./types";

export async function analyzeEvent(
    payload: AnalyzeRequest
): Promise<AnalyzeResponse> {

    const response = await api.post(
        "/analyze/",
        payload
    );

    const data = response.data as AnalyzeResponse;
    return {
        ...data,
        analysis: {
            ...data.analysis,
            severity: data.analysis.severity.toLowerCase() as Severity,
        },
    };
}