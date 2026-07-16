import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  getInvestigation,
  getInvestigations,
  getTimeline,
  updateInvestigationStatus,
  getInvestigationReport,
  getInvestigationWorkspace,
} from "../api/investigations";

export function useInvestigation(investigationId?: string) {
  return useQuery({
    queryKey: ["investigation", investigationId],

    queryFn: () => getInvestigation(investigationId!),

    enabled: !!investigationId,

    staleTime: Infinity,
  });
}

export function useInvestigationWorkspace(investigationId?: string) {
  return useQuery({
    queryKey: ["investigation-workspace", investigationId],

    queryFn: () => getInvestigationWorkspace(investigationId!),

    enabled: !!investigationId,

    staleTime: 30000,
  });
}

export function useInvestigations(includeArchived: boolean = false) {
  return useQuery({
    queryKey: ["investigations", includeArchived],

    queryFn: () => getInvestigations(includeArchived),

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

export function useUpdateInvestigationStatus(investigationId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status: string) =>
      updateInvestigationStatus(investigationId!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["investigation", investigationId],
      });
      queryClient.invalidateQueries({
        queryKey: ["investigation-workspace", investigationId],
      });
      queryClient.invalidateQueries({
        queryKey: ["timeline", investigationId],
      });
      queryClient.invalidateQueries({
        queryKey: ["investigations"],
      });
      queryClient.invalidateQueries({
        queryKey: ["report", investigationId],
      });
    },
  });
}

export function useInvestigationReport(investigationId?: string) {
  return useQuery({
    queryKey: ["report", investigationId],
    queryFn: () => getInvestigationReport(investigationId!),
    enabled: !!investigationId,
    staleTime: 30000,
  });
}