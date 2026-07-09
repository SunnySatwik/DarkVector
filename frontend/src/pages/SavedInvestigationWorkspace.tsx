import { useEffect, useMemo } from "react";
import {
  useInvestigationWorkspace,
  useUpdateInvestigationStatus,
} from "../hooks/useInvestigations";
import {
  mapWorkspaceResponse,
  WorkspaceViewModel,
} from "../lib/workspaceMapper";
import WorkspaceView from "../components/workspace/WorkspaceView";

interface SavedInvestigationWorkspaceProps {
  investigationId: string;
  onCloseWorkspace: () => void;
  onWorkspaceReady?: (workspace: WorkspaceViewModel) => void;
  onOpenReport?: (id: string) => void;
}

export default function SavedInvestigationWorkspace({
  investigationId,
  onCloseWorkspace,
  onWorkspaceReady,
  onOpenReport,
}: SavedInvestigationWorkspaceProps) {
  const { data, isPending, isError, refetch } =
    useInvestigationWorkspace(investigationId);

  const updateStatusMutation = useUpdateInvestigationStatus(investigationId);

  const viewModel = useMemo(() => {
    if (!data) return null;
    return mapWorkspaceResponse(data);
  }, [data]);

  useEffect(() => {
    if (viewModel && onWorkspaceReady) {
      onWorkspaceReady(viewModel);
    }
  }, [viewModel, onWorkspaceReady]);

  if (isPending) {
    return (
      <div className="p-6 text-gray-400 font-mono text-xs flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <span>Loading investigation workspace...</span>
      </div>
    );
  }

  if (isError || !viewModel) {
    return (
      <div className="p-6 text-red-400 font-mono text-xs flex flex-col gap-2">
        <span>Failed to load investigation workspace.</span>
        <button
          onClick={() => refetch()}
          className="w-fit text-purple-400 hover:text-purple-300 underline cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <WorkspaceView
      viewModel={viewModel}
      investigationId={investigationId}
      investigationStatus={viewModel.investigation.status}
      onUpdateStatus={(status) => updateStatusMutation.mutate(status)}
      onOpenReport={onOpenReport}
      onCloseWorkspace={onCloseWorkspace}
      refetch={refetch}
    />
  );
}