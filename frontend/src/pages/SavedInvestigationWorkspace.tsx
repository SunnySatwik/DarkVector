import { useEffect, useMemo } from "react";
import { Alert, Severity } from "../types";
import { AnalyzeResponse } from "../api/types";
import WorkspaceView from "../components/workspace/WorkspaceView";
import { useInvestigation } from "../hooks/useInvestigations";

interface SavedInvestigationWorkspaceProps {
    investigationId: string;
    onCloseWorkspace: () => void;
    onAnalysisReady?: (alert: Alert, analysis: AnalyzeResponse) => void;
}

export default function SavedInvestigationWorkspace({
    investigationId,
    onCloseWorkspace,
    onAnalysisReady,
}: SavedInvestigationWorkspaceProps) {

    const {
        data,
        isPending,
        isError,
        refetch,
    } = useInvestigation(investigationId);

    // Derived displayAlert - memoized to keep data derivation and side effects separate
    const displayAlert: Alert = useMemo(() => {
        if (!data) return {} as Alert;
        return {
            ...data.alert,
            category: data.alert.category as Alert["category"],
            score: data.analysis.analysis.risk_score,
            severity: data.analysis.analysis.severity.toLowerCase() as Severity,
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
            investigationId={investigationId}

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