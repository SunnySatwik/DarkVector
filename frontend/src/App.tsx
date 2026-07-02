import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import AppLayout from "./layouts/AppLayout";
import Dashboard from "./pages/Dashboard";
import ThreatFeed from "./pages/ThreatFeed";
import Investigations from "./pages/Investigations";
import LiveEvents from "./pages/LiveEvents";
import Models from "./pages/Models";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import InvestigationWorkspace from "./pages/InvestigationWorkspace";
import ThreatExplorer from "./pages/ThreatExplorer";
import ThreatGraph from "./pages/ThreatGraph";
import KnowledgeBase from "./pages/KnowledgeBase";
import SavedInvestigationWorkspace from "./pages/SavedInvestigationWorkspace";
import CommandPalette from "./components/CommandPalette";
import AiAnalystPanel from "./components/AiAnalystPanel";
import { Alert, Workspace } from "./types";
import { MOCK_WORKSPACES } from "./mockData";
import { AnalyzeResponse } from "./api/types";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // ── Live workspace state ──────────────────────────────────────────────────
  const [activeWorkspaceAlert, setActiveWorkspaceAlert] = useState<Alert | null>(null);
  const [openWorkspaceAlerts, setOpenWorkspaceAlerts] = useState<Alert[]>([]);

  // ── Saved investigation state ─────────────────────────────────────────────
  const [activeInvestigationId, setActiveInvestigationId] = useState<string | null>(null);

  // ── AI Panel state — presentational only, never triggers inference ────────
  // Updated by callbacks from InvestigationWorkspace; cleared on close.
  const [panelAlert, setPanelAlert] = useState<Alert | null>(null);
  const [panelAnalysis, setPanelAnalysis] = useState<AnalyzeResponse | null>(null);

  // ── Overlays ──────────────────────────────────────────────────────────────
  const [isAiPanelOpen, setIsAiPanelOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [prevSidebarState, setPrevSidebarState] = useState<boolean>(false);

  // Auto-collapse sidebar in investigation workspace (Focus Mode)
  useEffect(() => {
    if (activeWorkspaceAlert) {
      setPrevSidebarState(isSidebarCollapsed);
      setIsSidebarCollapsed(true);
    } else {
      setIsSidebarCollapsed(prevSidebarState);
    }
  }, [!!activeWorkspaceAlert]);

  const [activeWorkspace, setActiveWorkspace] = useState<Workspace>(MOCK_WORKSPACES[0]);

  // Seed notification list
  const [notifications, setNotifications] = useState([
    {
      id: "notif-1",
      type: "alert" as const,
      title: "Pod Shell Escape Attempt",
      message: "Critical process bash launched inside kube-system container srv-k8s-api-01.",
      time: "2m ago",
      read: false,
    },
    {
      id: "notif-2",
      type: "info" as const,
      title: "Sensor Heartbeat Updated",
      message: "All 148 global active threat vectors successfully aggregated in ChromaDB.",
      time: "15m ago",
      read: false,
    },
    {
      id: "notif-3",
      type: "success" as const,
      title: "Node Isolation Succeeded",
      message: "Kubernetes network isolation policy successfully deployed for workstation-hr-12.",
      time: "1h ago",
      read: true,
    },
  ]);

  // Support CMD+K hotkey for Command Palette globally
  useEffect(() => {
    function handleGlobalKeys(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleGlobalKeys);
    return () => window.removeEventListener("keydown", handleGlobalKeys);
  }, []);

  // Simulating dashboard refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
  };

  // Notification actions
  const handleMarkRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  // Workspace interactions
  const handleOpenAlertInWorkspace = (alert: Alert) => {
    if (!openWorkspaceAlerts.find((a) => a.id === alert.id)) {
      setOpenWorkspaceAlerts((prev) => [...prev, alert]);
    }
    setActiveWorkspaceAlert(alert);
    // Update panel alert immediately; analysis arrives via onAnalysisReady callback
    setPanelAlert(alert);
    setPanelAnalysis(null);
  };

  const handleCloseAlertTab = (alertId: string) => {
    const remaining = openWorkspaceAlerts.filter((a) => a.id !== alertId);
    setOpenWorkspaceAlerts(remaining);
    if (activeWorkspaceAlert?.id === alertId) {
      if (remaining.length > 0) {
        setActiveWorkspaceAlert(remaining[0]);
        setPanelAlert(remaining[0]);
        setPanelAnalysis(null);
      } else {
        setActiveWorkspaceAlert(null);
        // Clear panel state — no stale alert should linger
        setPanelAlert(null);
        setPanelAnalysis(null);
      }
    }
  };

  // Called by InvestigationWorkspace whenever analysis resolves
  const handleAnalysisReady = (alert: Alert, analysis: AnalyzeResponse) => {
    setPanelAlert(alert);
    setPanelAnalysis(analysis);
  };

  // Subpage router
  const renderContent = () => {
    if (activeInvestigationId) {
      return (
        <SavedInvestigationWorkspace
          investigationId={activeInvestigationId}
          onCloseWorkspace={() => {
            setActiveInvestigationId(null);
            // Clear transient analysis state on workspace close
            setPanelAlert(null);
            setPanelAnalysis(null);
          }}
          onAnalysisReady={handleAnalysisReady}
        />
      );
    }
    if (activeWorkspaceAlert) {
      return (
        <InvestigationWorkspace
          activeAlert={activeWorkspaceAlert}
          openTabs={openWorkspaceAlerts}
          onSelectAlert={handleOpenAlertInWorkspace}
          onCloseAlertTab={handleCloseAlertTab}
          onCloseWorkspace={() => {
            setActiveWorkspaceAlert(null);
            // Clear transient analysis state on workspace close
            setPanelAlert(null);
            setPanelAnalysis(null);
          }}
          onAnalysisReady={handleAnalysisReady}
        />
      );
    }

    switch (activeTab) {
      case "dashboard":
        return (
          <Dashboard
            onSelectAlert={handleOpenAlertInWorkspace}
            onOpenAiPanel={() => setIsAiPanelOpen(true)}
            isRefreshing={isRefreshing}
            onOpenInvestigation={(id) => {
              setActiveWorkspaceAlert(null);
              setActiveInvestigationId(id);
            }}
          />
        );
      case "threats":
        return (
          <ThreatFeed
            onSelectAlert={handleOpenAlertInWorkspace}
            onOpenAiPanel={() => setIsAiPanelOpen(true)}
          />
        );
      case "explorer":
        return <ThreatExplorer />;
      case "graph":
        return <ThreatGraph />;
      case "investigations":
        return (
          <Investigations
            onOpenInvestigation={(id) => {
              setActiveWorkspaceAlert(null);
              setActiveInvestigationId(id);
            }}
          />
        );
      case "knowledge":
        return <KnowledgeBase />;
      case "live":
        return <LiveEvents />;
      case "models":
        return <Models />;
      case "reports":
        return <Reports />;
      case "settings":
        return <Settings />;
      default:
        return (
          <Dashboard
            onSelectAlert={handleOpenAlertInWorkspace}
            onOpenAiPanel={() => setIsAiPanelOpen(true)}
            isRefreshing={isRefreshing}
          />
        );
    }
  };

  return (
    <>
      {/* Master Shell Layout */}
      <AppLayout
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setActiveWorkspaceAlert(null);
        }}
        workspaces={MOCK_WORKSPACES}
        activeWorkspace={activeWorkspace}
        onSelectWorkspace={setActiveWorkspace}
        onOpenSearch={() => setIsCommandPaletteOpen(true)}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        notifications={notifications}
        onMarkRead={handleMarkRead}
        onClearAll={handleClearAll}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebarCollapse={setIsSidebarCollapsed}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeWorkspaceAlert ? `workspace-${activeWorkspaceAlert.id}` : activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-full h-full"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </AppLayout>

      {/* Global Interactive Overlays */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={setActiveTab}
      />

      <AiAnalystPanel
        isOpen={isAiPanelOpen}
        onClose={() => setIsAiPanelOpen(false)}
        selectedAlert={panelAlert}
        analysis={panelAnalysis}
        onIsolateNode={(nodeId) => {
          alert(
            `CRITICAL CONTAINMENT DISPATCHED:\n- Container isolation flag successfully written for [ ${nodeId} ]\n- Network interfaces suspended via gRPC agent daemon.`
          );
          setIsAiPanelOpen(false);
        }}
      />
    </>
  );
}
