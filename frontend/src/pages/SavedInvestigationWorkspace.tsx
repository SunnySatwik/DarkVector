import { useEffect, useMemo } from "react";
import { Alert, Severity } from "../types";
import { AnalyzeResponse } from "../api/types";
import WorkspaceView from "../components/workspace/WorkspaceView";
import { useInvestigation, useUpdateInvestigationStatus } from "../hooks/useInvestigations";

interface SavedInvestigationWorkspaceProps {
    investigationId: string;
    onCloseWorkspace: () => void;
    onAnalysisReady?: (alert: Alert, analysis: AnalyzeResponse) => void;
    onOpenReport?: (id: string) => void;
}

export default function SavedInvestigationWorkspace({
    investigationId,
    onCloseWorkspace,
    onAnalysisReady,
    onOpenReport,
}: SavedInvestigationWorkspaceProps) {

    const {
        data,
        isPending,
        isError,
        refetch,
    } = useInvestigation(investigationId);

    const updateStatusMutation = useUpdateInvestigationStatus(investigationId);

    // Derived displayAlert - memoized to keep data derivation and side effects separate
    const displayAlert: Alert = useMemo(() => {
        if (!data) return {} as Alert;
        return {
            ...data.alert,
            category: data.alert.category as Alert["category"],
            score: data.analysis.analysis.risk_score,
            severity: data.analysis.analysis.severity,
            status: "investigating",
        };
    }, [data]);

    // Side effect to notify parent of analysis once data resolves
    useEffect(() => {
        if (data && onAnalysisReady && displayAlert.id) {
            onAnalysisReady(displayAlert, data.analysis);
        }
    }, [displayAlert, data, onAnalysisReady]);

    if (isPending) {
        return (
            <div className="p-6 text-gray-400">
                Loading investigation...
            </div>
        );
    }

    if (isError || !data) {
        return (
            <div className="p-6 text-red-400">
                Failed to load investigation.
            </div>
        );
    }

    return (
        <WorkspaceView
            displayAlert={displayAlert}
            detectionSeverity={data.alert.severity}
            investigationId={investigationId}
            investigationStatus={data.investigation.status}
            onUpdateStatus={(status) => updateStatusMutation.mutate(status)}
            onOpenReport={onOpenReport}
            analysisContext={data.analysis.context ?? undefined}

            openTabs={[displayAlert]}

            onSelectAlert={() => { }}

            onCloseAlertTab={() => { }}

            onCloseWorkspace={onCloseWorkspace}

            quarantineStatus="active"

            quarantineProgress={0}

            isBlockApplied={false}

            handleIsolate={() => { }}

            onBlockIp={() => { }}

            isPending={false}

            isError={false}

            refetch={refetch}

            relatedAlerts={[]}
        />
    );
}