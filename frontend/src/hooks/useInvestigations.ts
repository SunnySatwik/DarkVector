import { useQuery } from "@tanstack/react-query";

import { getInvestigations } from "../api/investigations";

export function useInvestigations() {
    return useQuery({
        queryKey: ["investigations"],

        queryFn: getInvestigations,

        staleTime: 30000,
    });
}