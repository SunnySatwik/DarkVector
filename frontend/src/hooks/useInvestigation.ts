import { useQuery } from "@tanstack/react-query";

import { getInvestigation } from "../api/investigations";

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