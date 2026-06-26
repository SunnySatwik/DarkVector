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
}: AppLayoutProps) {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-bg text-gray-100 cyber-grid select-none">
      {/* Upper Main Section */}
      <div className="flex-1 flex overflow-hidden h-[calc(100vh-32px)]">
        {/* Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={onSelectTab}
          workspaces={workspaces}
          activeWorkspace={activeWorkspace}
          onSelectWorkspace={onSelectWorkspace}
        />

        {/* Main Panel Content (Top Nav + Main Canvas Grid) */}
        <div className="flex-1 flex flex-col min-w-0 h-full relative">
          <TopNav
            onOpenSearch={onOpenSearch}
            onRefresh={onRefresh}
            isRefreshing={isRefreshing}
            activeWorkspace={activeWorkspace}
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

      {/* 2026 Cybersecurity Analyst OS - Bottom Status Bar */}
      <footer className="h-8 bg-[#0d0f12] border-t border-[#23262F] flex items-center justify-between px-4 text-[10px] font-mono text-gray-400 z-40 select-none shrink-0">
        <div className="flex items-center gap-4">
          {/* Status block */}
          <div className="flex items-center gap-1.5 bg-[#161A22] px-2.5 py-1 rounded text-green-400 border border-green-500/10">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="font-extrabold tracking-wider text-[9px]">LIVE_DAEMON</span>
          </div>

          <div className="flex items-center gap-1">
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-gray-500">CLUSTER:</span>
            <span className="text-gray-200 font-bold">{activeWorkspace.name}</span>
          </div>

          <span className="text-gray-700">|</span>

          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-gray-500">INGEST_RATE:</span>
            <span className="text-blue-400 font-bold">4.8K traces/s</span>
          </div>

          <span className="text-gray-700">|</span>

          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-gray-500">CHROMADB_VECTORS:</span>
            <span className="text-purple-400 font-semibold">1,489,102</span>
          </div>
        </div>

        {/* Shortcuts / Active Context */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2">
            <span className="text-gray-600 font-bold">PANEL:</span>
            <span className="text-gray-300 font-semibold uppercase">{activeTab} WORKBENCH</span>
          </div>

          <span className="hidden md:inline text-gray-700">|</span>

          {/* Quick Shortcuts Indicators */}
          <div className="flex items-center gap-3 text-gray-500">
            <div>
              <span className="bg-black border border-[#23262F] px-1 py-0.2 rounded text-[9px] text-gray-400 mr-1">
                ⌘K
              </span>
              <span>Command Center</span>
            </div>
            <div>
              <span className="bg-black border border-[#23262F] px-1 py-0.2 rounded text-[9px] text-gray-400 mr-1">
                Esc
              </span>
              <span>Close Overlays</span>
            </div>
          </div>

          <span className="text-gray-700">|</span>

          <div className="flex items-center gap-1 text-gray-300 font-semibold bg-[#161A22] px-2 py-0.5 rounded">
            <User className="w-3 h-3 text-purple-400" />
            <span>@sunnysatwik95</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
