import { useState, useEffect } from "react";
import { Alert, Severity } from "../types";
import { MOCK_ALERTS } from "../mockData";
import { useAnalysis } from "../hooks/useAnalysis";
import { useInvestigations, useUpdateInvestigationStatus } from "../hooks/useInvestigations";
import { AnalyzeResponse } from "../api/types";
import WorkspaceView from "../components/workspace/WorkspaceView";

// ─── Props ────────────────────────────────────────────────────────────────────

interface InvestigationWorkspaceProps {
  activeAlert: Alert;

  openTabs: Alert[];

  onSelectAlert: (alert: Alert) => void;

  onCloseAlertTab: (alertId: string) => void;

  onCloseWorkspace: () => void;

  /**
   * Called once when the ML analysis for the active alert resolves.
   * App.tsx uses this to populate the AiAnalystPanel without owning useAnalysis itself.
   */
  onAnalysisReady?: (alert: Alert, analysis: AnalyzeResponse) => void;
  onOpenReport?: (id: string) => void;
}

// ─── Root Component ───────────────────────────────────────────────────────────

export default function InvestigationWorkspace({
  activeAlert,
  openTabs,
  onSelectAlert,
  onCloseAlertTab,
  onCloseWorkspace,
  onAnalysisReady,
  onOpenReport,
}: InvestigationWorkspaceProps) {
  const [quarantineStatus, setQuarantineStatus] = useState<
    "active" | "quarantining" | "quarantined"
  >("active");
  const [quarantineProgress, setQuarantineProgress] = useState(0);
  const [isBlockApplied, setIsBlockApplied] = useState(false);

  const mutation = useAnalysis();
  const { data: investigations } = useInvestigations();

  const matchedInv = investigations?.find((inv) => inv.alert_id === activeAlert.id);
  const investigationId = matchedInv?.investigation_id;

  const updateStatusMutation = useUpdateInvestigationStatus(investigationId);

  useEffect(() => {
    mutation.reset();
    mutation.mutate(activeAlert);
  }, [activeAlert.id]);

  const analysisData = mutation.data;
  const isPending = mutation.isPending;
  const isError = mutation.isError;
  const refetch = () => {
    mutation.reset();
    mutation.mutate(activeAlert);
  };

  const displayAlert: Alert = analysisData
    ? {
      ...activeAlert,
      score: analysisData.analysis.risk_score,
      severity: analysisData.analysis.severity.toLowerCase() as Severity,
    }
    : activeAlert;

  // Notify parent once analysis resolves so it can feed AiAnalystPanel
  useEffect(() => {
    if (analysisData) {
      onAnalysisReady?.(activeAlert, analysisData);
    }
  }, [analysisData, activeAlert]);

  // Reset remediation state when the active alert changes
  useEffect(() => {
    setQuarantineStatus("active");
    setQuarantineProgress(0);
    setIsBlockApplied(false);
  }, [activeAlert.id]);

  const handleIsolate = () => {
    setQuarantineStatus("quarantining");
    setQuarantineProgress(0);
    const interval = setInterval(() => {
      setQuarantineProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setQuarantineStatus("quarantined");
          // Automatically update investigation status and record timeline event
          updateStatusMutation.mutate("CONTAINED");
          return 100;
        }
        return prev + 20;
      });
    }, 220);
  };

  const relatedAlerts = MOCK_ALERTS.filter(
    (a) => a.id !== activeAlert.id && a.category === activeAlert.category
  ).slice(0, 3);

  return (
    <WorkspaceView
      displayAlert={displayAlert}
      detectionSeverity={activeAlert.severity}
      investigationId={investigationId}
      investigationStatus={matchedInv?.status ?? "NEW"}
      onUpdateStatus={(status) => updateStatusMutation.mutate(status)}
      onOpenReport={onOpenReport}
      analysisContext={analysisData?.context ?? undefined}
      openTabs={openTabs}
      onSelectAlert={onSelectAlert}
      onCloseAlertTab={onCloseAlertTab}
      onCloseWorkspace={onCloseWorkspace}
      quarantineStatus={quarantineStatus}
      quarantineProgress={quarantineProgress}
      isBlockApplied={isBlockApplied}
      handleIsolate={handleIsolate}
      onBlockIp={() => setIsBlockApplied(true)}
      isPending={isPending}
      isError={isError}
      refetch={refetch}
      relatedAlerts={relatedAlerts}
    />
  );
}
