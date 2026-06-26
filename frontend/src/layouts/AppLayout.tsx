import React from "react";
import Sidebar from "../components/Sidebar";
import TopNav from "../components/TopNav";
import { Workspace } from "../types";
import { Activity, Cpu, Shield, Globe, Terminal, User } from "lucide-react";

interface AppLayoutProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  children: React.ReactNode;
  workspaces: Workspace[];
  activeWorkspace: Workspace;
  onSelectWorkspace: (ws: Workspace) => void;
  onOpenSearch: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  notifications: any[];
  onMarkRead: (id: string) => void;
  onClearAll: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebarCollapse: (collapsed: boolean) => void;
}

export default function AppLayout({
  activeTab,
  onSelectTab,
  children,
  workspaces,
  activeWorkspace,
  onSelectWorkspace,
  onOpenSearch,
  onRefresh,
  isRefreshing,
  notifications,
  onMarkRead,
  onClearAll,
  isSidebarCollapsed,
  onToggleSidebarCollapse,
}: AppLayoutProps) {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-bg text-gray-100 select-none">
      {/* Upper Main Section */}
      <div className="flex-1 flex overflow-hidden h-full">
        {/* Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={onSelectTab}
          workspaces={workspaces}
          activeWorkspace={activeWorkspace}
          onSelectWorkspace={onSelectWorkspace}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={onToggleSidebarCollapse}
        />

        {/* Main Panel Content (Top Nav + Main Canvas Grid) */}
        <div className="flex-1 flex flex-col min-w-0 h-full relative">
          <TopNav
            onOpenSearch={onOpenSearch}
            notifications={notifications}
            onMarkRead={onMarkRead}
            onClearAll={onClearAll}
          />

          {/* Scrollable Main Content Frame with full workspace width */}
          <main className="flex-1 overflow-y-auto p-4 scrollbar-thin">
            <div className="max-w-[1600px] mx-auto w-full h-full">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
