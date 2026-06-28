import { useMutation } from "@tanstack/react-query";

import { analyzeEvent } from "../api/analysis";

export function useAnalysis() {

    return useMutation({

        mutationFn: analyzeEvent,

    });

}