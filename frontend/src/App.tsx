import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import AppLayout from "./layouts/AppLayout";
import Dashboard from "./pages/Dashboard";
import ThreatFeed from "./pages/ThreatFeed";
import Investigations from "./pages/Investigations";
import LiveEvents from "./pages/LiveEvents";
import Models from "./pages/Models";
import Reports from "./pages/Reports";
import InvestigationWorkspace from "./pages/InvestigationWorkspace";
import ThreatGraph from "./pages/ThreatGraph";
import SavedInvestigationWorkspace from "./pages/SavedInvestigationWorkspace";
import InvestigationReportView from "./pages/InvestigationReportView";
import CommandPalette from "./components/CommandPalette";
import ErrorBoundary from "./components/ErrorBoundary";
import { Alert, Workspace } from "./types";
import { MOCK_WORKSPACES } from "./mockData";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // ── Live workspace state ──────────────────────────────────────────────────
  const [activeWorkspaceAlert, setActiveWorkspaceAlert] = useState<Alert | null>(null);
  const [openWorkspaceAlerts, setOpenWorkspaceAlerts] = useState<Alert[]>([]);

  // ── Saved investigation state ─────────────────────────────────────────────
  const [activeInvestigationId, setActiveInvestigationId] = useState<string | null>(null);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);

  // ── Overlays ──────────────────────────────────────────────────────────────
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

  // Workspace interactions
  const handleOpenAlertInWorkspace = (alert: Alert) => {
    if (!openWorkspaceAlerts.find((a) => a.id === alert.id)) {
      setOpenWorkspaceAlerts((prev) => [...prev, alert]);
    }
    setActiveWorkspaceAlert(alert);
  };

  const handleCloseAlertTab = (alertId: string) => {
    const remaining = openWorkspaceAlerts.filter((a) => a.id !== alertId);
    setOpenWorkspaceAlerts(remaining);
    if (activeWorkspaceAlert?.id === alertId) {
      if (remaining.length > 0) {
        setActiveWorkspaceAlert(remaining[0]);
      } else {
        setActiveWorkspaceAlert(null);
      }
    }
  };

  // Subpage router
  const renderContent = () => {
    if (activeReportId) {
      return (
        <InvestigationReportView
          investigationId={activeReportId}
          onClose={() => setActiveReportId(null)}
        />
      );
    }
    if (activeInvestigationId) {
      return (
        <SavedInvestigationWorkspace
          investigationId={activeInvestigationId}
          onCloseWorkspace={() => setActiveInvestigationId(null)}
          onOpenReport={setActiveReportId}
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
          onCloseWorkspace={() => setActiveWorkspaceAlert(null)}
          onOpenReport={setActiveReportId}
        />
      );
    }

    switch (activeTab) {
      case "dashboard":
        return (
          <Dashboard
            onSelectAlert={handleOpenAlertInWorkspace}
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
          />
        );
      case "graph":
        return (
          <ErrorBoundary>
            <ThreatGraph
              activeAlert={activeWorkspaceAlert}
              activeInvestigationId={activeInvestigationId}
            />
          </ErrorBoundary>
        );
      case "investigations":
        return (
          <Investigations
            onOpenInvestigation={(id) => {
              setActiveWorkspaceAlert(null);
              setActiveInvestigationId(id);
            }}
            onOpenReport={setActiveReportId}
          />
        );
      case "live":
        return <LiveEvents />;
      case "models":
        return <Models />;
      case "reports":
        return <Reports onOpenReport={setActiveReportId} />;
      default:
        return (
          <Dashboard
            onSelectAlert={handleOpenAlertInWorkspace}
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
        activeWorkspace={activeWorkspace}
        onOpenSearch={() => setIsCommandPaletteOpen(true)}
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
    </>
  );
}
