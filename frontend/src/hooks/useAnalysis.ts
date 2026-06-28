import { useQuery } from "@tanstack/react-query";
import { analyzeEvent } from "../api/analysis";
import { Alert } from "../types";

export function useAnalysis(alert: Alert | null | undefined) {
  return useQuery({
    queryKey: ["analysis", alert?.id],
    queryFn: async () => {
      if (!alert) throw new Error("No alert selected");
      return analyzeEvent(alert);
    },
    enabled: !!alert?.id,
    staleTime: Infinity,
  });
}