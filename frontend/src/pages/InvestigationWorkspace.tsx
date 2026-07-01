import { useState, useEffect } from "react";
import { Alert, Severity } from "../types";
import { MOCK_ALERTS } from "../mockData";
import { useAnalysis } from "../hooks/useAnalysis";
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
}

// ─── Root Component ───────────────────────────────────────────────────────────

export default function InvestigationWorkspace({
  activeAlert,
  openTabs,
  onSelectAlert,
  onCloseAlertTab,
  onCloseWorkspace,
  onAnalysisReady,
}: InvestigationWorkspaceProps) {
  const [quarantineStatus, setQuarantineStatus] = useState<
    "active" | "quarantining" | "quarantined"
  >("active");
  const [quarantineProgress, setQuarantineProgress] = useState(0);
  const [isBlockApplied, setIsBlockApplied] = useState(false);

  const { data: analysisData, isPending, isError, refetch } = useAnalysis(activeAlert);

  const displayAlert = analysisData
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
  }, [analysisData]);

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
