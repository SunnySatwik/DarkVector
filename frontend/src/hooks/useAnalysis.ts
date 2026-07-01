import { useMutation, useQueryClient } from "@tanstack/react-query";
import { analyzeEvent } from "../api/analysis";
import { Alert } from "../types";
import { AnalyzeResponse } from "../api/types";

export function useAnalysis() {
  const queryClient = useQueryClient();

  return useMutation<AnalyzeResponse, Error, Alert>({
    mutationFn: async (alert: Alert) => {
      return analyzeEvent(alert);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["investigations"],
      });
    },
  });
}