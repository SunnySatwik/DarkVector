import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Alert, Severity } from "../types";
import { MOCK_ALERTS } from "../mockData";
import { useAnalysis } from "../hooks/useAnalysis";
import { useInvestigations, useUpdateInvestigationStatus } from "../hooks/useInvestigations";
import WorkspaceView from "../components/workspace/WorkspaceView";

// ─── Props ────────────────────────────────────────────────────────────────────

interface InvestigationWorkspaceProps {
  activeAlert: Alert;

  openTabs: Alert[];

  onSelectAlert: (alert: Alert) => void;

  onCloseAlertTab: (alertId: string) => void;

  onCloseWorkspace: () => void;

  onOpenReport?: (id: string) => void;
}

// ─── Root Component ───────────────────────────────────────────────────────────

export default function InvestigationWorkspace({
  activeAlert,
  openTabs,
  onSelectAlert,
  onCloseAlertTab,
  onCloseWorkspace,
  onOpenReport,
}: InvestigationWorkspaceProps) {
  const [quarantineStatus, setQuarantineStatus] = useState<
    "active" | "quarantining" | "quarantined"
  >("active");
  const [quarantineProgress, setQuarantineProgress] = useState(0);
  const [isBlockApplied, setIsBlockApplied] = useState(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: "", visible: false });

  const showSuccessToast = (msg: string) => {
    setToast({ message: msg, visible: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

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
          updateStatusMutation.mutate("CONTAINED", {
            onSuccess: () => {
              showSuccessToast("Containment initiated successfully. The affected host has been marked as contained.");
            }
          });
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
    <>
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
      {/* Toast Notification */}
      <AnimatePresence>
        {toast.visible && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[#111317] border border-emerald-500/30 shadow-xl shadow-emerald-500/5 px-4 py-3 rounded-xl text-gray-200 font-sans text-xs"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
            <div className="w-2 h-2 rounded-full bg-emerald-500 absolute left-4 shrink-0" />
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
