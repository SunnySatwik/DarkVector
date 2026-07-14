import { motion } from "motion/react";
import { SPRINGS } from "../lib/motion";

import {
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  FileText,
  Cpu,
  Layers,
  Network,
} from "lucide-react";
import { Workspace } from "../types";

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  activeWorkspace: Workspace;
  isCollapsed: boolean;
  onToggleCollapse: (collapsed: boolean) => void;
}

export default function Sidebar({
  activeTab,
  onSelectTab,
  activeWorkspace,
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const menuItems = [
    { id: "dashboard", label: "Mission Control", icon: LayoutDashboard },
    { id: "investigations", label: "Investigate", icon: Cpu },
    { id: "graph", label: "Evidence Graph", icon: Network },
    { id: "reports", label: "Reports", icon: FileText },
    { id: "models", label: "Models", icon: Cpu },
  ];

  return (
    <motion.aside
      id="main-sidebar"
      animate={{ width: isCollapsed ? 68 : 240 }}
      transition={SPRINGS.gentle}
      className="bg-surface border-r border-border-custom flex flex-col justify-between h-screen shrink-0 relative z-30"
    >
      {/* Sidebar Toggle Button */}
      <motion.button
        onClick={() => onToggleCollapse(!isCollapsed)}
        whileTap={{ scale: 0.94 }}
        className="absolute -right-3 top-12 bg-elevated border border-border-custom text-gray-400 hover:text-gray-200 rounded-full p-1 cursor-pointer shadow-md transition-colors"
      >
        {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </motion.button>

      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        {/* Brand Logo & Name */}
        <div className="p-4 border-b border-border-custom/60 flex items-center justify-between h-16 shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800 flex items-center justify-center shadow-lg shadow-blue-500/10 shrink-0">
              <svg
                className="w-4 h-4 text-white"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" />
                <path
                  d="M2 17L12 22L22 17M2 12L12 17L22 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            {!isCollapsed && (
              <motion.div
                key="brand-text"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.12, ease: "easeInOut" }}
                className="flex flex-col shrink-0"
              >
                <span className="font-sans font-semibold text-sm tracking-wide text-gray-100">
                  DarkVector
                </span>
                <span className="text-caption font-mono font-medium text-primary-blue/80 tracking-wider">
                  AI security platform
                </span>
              </motion.div>
            )}
          </div>
        </div>

        {/* Workspace Selector - Static */}
        <div className="p-3 border-b border-border-custom/40 relative shrink-0">
          {isCollapsed ? (
            <div className="flex justify-center">
              <div
                className="p-2 rounded bg-black/40 border border-border-custom text-blue-400"
                title={activeWorkspace.name}
              >
                <Layers className="w-4 h-4" />
              </div>
            </div>
          ) : (
            <div className="w-full flex items-center justify-between p-2 bg-black/30 border border-border-custom rounded-lg text-left">
              <div className="flex items-center gap-2 min-w-0">
                <Layers className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-caption font-mono text-gray-500">
                    Workspace
                  </div>
                  <div className="text-secondary-body font-sans font-medium text-gray-300 truncate">
                    DV-PROD-GLOBAL
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="p-3 space-y-1">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <motion.button
                key={item.id}
                id={`sidebar-item-${item.id}`}
                onClick={() => onSelectTab(item.id)}
                whileTap={{ scale: 0.985 }}
                className={`w-full flex items-center justify-between rounded-lg p-2.5 text-left cursor-pointer relative transition-colors duration-120 ${isActive
                  ? "text-blue-400 font-medium"
                  : "text-gray-400 hover:text-gray-200 hover:bg-[#161A22]/20"
                  }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebarActiveBackground"
                    className="absolute inset-0 bg-blue-500/5 rounded-lg active-navigation-trace z-0"
                    transition={SPRINGS.snappy}
                  />
                )}

                <div className="flex items-center gap-3 min-w-0 relative z-10">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${isActive ? "text-blue-400" : "text-gray-500"}`}
                  />
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-body font-sans truncate"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </div>
              </motion.button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-border-custom/60">
        {isCollapsed ? (
          <div className="flex justify-center items-center text-gray-500 relative">
            <span className="relative flex h-1.5 w-1.5 shrink-0 absolute -top-1 right-2">
              <span className="telemetry-pulse-outer absolute inline-flex h-full w-full rounded-full bg-emerald-500/60 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-mono">v1.2</span>
          </div>
        ) : (
          <div className="flex items-center justify-between text-caption font-sans text-gray-500">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="telemetry-pulse-outer absolute inline-flex h-full w-full rounded-full bg-emerald-500/60 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span>Agent Active</span>
            </div>
            <span className="font-mono text-gray-600">v1.2.4</span>
          </div>
        )}
      </div>
    </motion.aside>
  );
}
