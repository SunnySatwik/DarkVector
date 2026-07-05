import React from "react";
import Sidebar from "../components/Sidebar";
import TopNav from "../components/TopNav";
import { Workspace } from "../types";

interface AppLayoutProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  children: React.ReactNode;
  activeWorkspace: Workspace;
  onOpenSearch: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebarCollapse: (collapsed: boolean) => void;
}

export default function AppLayout({
  activeTab,
  onSelectTab,
  children,
  activeWorkspace,
  onOpenSearch,
  isSidebarCollapsed,
  onToggleSidebarCollapse,
}: AppLayoutProps) {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-bg text-gray-100 animate-theme-transition">
      {/* Upper Main Section */}
      <div className="flex-1 flex overflow-hidden h-full">
        {/* Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={onSelectTab}
          activeWorkspace={activeWorkspace}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={onToggleSidebarCollapse}
        />

        {/* Main Panel Content (Top Nav + Main Canvas Grid) */}
        <div className="flex-1 flex flex-col min-w-0 h-full relative">
          <TopNav
            onOpenSearch={onOpenSearch}
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

