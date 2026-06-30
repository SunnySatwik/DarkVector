import { Alert, Severity } from "../types";
import WorkspaceView from "../components/workspace/WorkspaceView";
import { useInvestigation } from "../hooks/useInvestigations";

interface SavedInvestigationWorkspaceProps {
    investigationId: string;
    onCloseWorkspace: () => void;
}

export default function SavedInvestigationWorkspace({
    investigationId,
    onCloseWorkspace,
}: SavedInvestigationWorkspaceProps) {

    const {
        data,
        isPending,
        isError,
        refetch,
    } = useInvestigation(investigationId);

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

    const displayAlert: Alert = {
        ...data.alert,

        category: data.alert.category as Alert["category"],

        score: data.analysis.analysis.risk_score,

        severity:
            data.analysis.analysis.severity.toLowerCase() as Severity,

        status: "investigating",
    };

    return (
        <WorkspaceView
            displayAlert={displayAlert}

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