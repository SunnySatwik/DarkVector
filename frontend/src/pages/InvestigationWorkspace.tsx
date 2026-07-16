import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Alert, Severity } from "../types";
import { MOCK_ALERTS } from "../mockData";
import { useAnalysis } from "../hooks/useAnalysis";
import { useInvestigations, useUpdateInvestigationStatus } from "../hooks/useInvestigations";
import WorkspaceView from "../components/workspace/WorkspaceView";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { triggerContainment } from "../api/investigations";

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
  const queryClient = useQueryClient();

  const triggerContainmentMutation = useMutation({
    mutationFn: () => triggerContainment(investigationId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investigations"] });
      queryClient.invalidateQueries({ queryKey: ["timeline", investigationId] });
      showSuccessToast("Containment playbook dispatched. Monitoring agent status...");
    }
  });

  const handleIsolate = () => {
    if (investigationId) {
      triggerContainmentMutation.mutate();
    } else {
      showSuccessToast("Cannot isolate host: investigation not created yet.");
    }
  };

  // Derive quarantineStatus and progress dynamically from containment job state
  const bContainmentStatus = matchedInv?.containment_status || null;
  const isPolling = bContainmentStatus === "QUEUED" || bContainmentStatus === "EXECUTING";

  useEffect(() => {
    if (!isPolling || !investigationId) return;

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["investigations"] });
      queryClient.invalidateQueries({ queryKey: ["timeline", investigationId] });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPolling, investigationId, queryClient]);

  let quarantineStatus: "active" | "quarantining" | "quarantined" = "active";
  let quarantineProgress = 0;

  if (bContainmentStatus === "QUEUED") {
    quarantineStatus = "quarantining";
    quarantineProgress = 30;
  } else if (bContainmentStatus === "EXECUTING") {
    quarantineStatus = "quarantining";
    quarantineProgress = 70;
  } else if (bContainmentStatus === "COMPLETED") {
    quarantineStatus = "quarantined";
    quarantineProgress = 100;
  }

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

  // Reset remediation block state when the active alert changes
  useEffect(() => {
    setIsBlockApplied(false);
  }, [activeAlert.id]);

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
        explanationSummary={analysisData?.explanation?.summary}
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
