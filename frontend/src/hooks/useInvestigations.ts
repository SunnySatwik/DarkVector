import { useQuery } from "@tanstack/react-query";

import {
    getInvestigation,
    getInvestigations,
    getTimeline,
} from "../api/investigations";

export function useInvestigation(
    investigationId?: string
) {
    return useQuery({
        queryKey: [
            "investigation",
            investigationId,
        ],

        queryFn: () =>
            getInvestigation(
                investigationId!
            ),

        enabled: !!investigationId,

        staleTime: Infinity,
    });
}

export function useInvestigations() {
    return useQuery({
        queryKey: ["investigations"],

        queryFn: getInvestigations,

        staleTime: 30000,
    });
}

export function useTimeline(investigationId?: string) {
    return useQuery({
        queryKey: ["timeline", investigationId],

        queryFn: () => getTimeline(investigationId!),

        enabled: !!investigationId,

        staleTime: 10000,
    });
}