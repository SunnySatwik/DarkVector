import { useQuery } from "@tanstack/react-query";

import {
    getInvestigation,
    getInvestigations,
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