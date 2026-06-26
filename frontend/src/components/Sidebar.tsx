import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  ShieldAlert,
  SearchCode,
  Radio,
  Cpu,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  SunMoon,
  Workflow,
  Sparkles,
  Layers,
  ChevronDown,
  User,
  ShieldAlert as LogAlert,
  Network,
  BookOpen,
} from "lucide-react";
import { Workspace } from "../types";

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  workspaces: Workspace[];
  activeWorkspace: Workspace;
  onSelectWorkspace: (ws: Workspace) => void;
  isCollapsed: boolean;
  onToggleCollapse: (collapsed: boolean) => void;
}

export default function Sidebar({
  activeTab,
  onSelectTab,
  workspaces,
  activeWorkspace,
  onSelectWorkspace,
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);

  const menuItems = [
    { id: "dashboard", label: "Mission Control", icon: LayoutDashboard },
    { id: "investigations", label: "Investigate", icon: LogAlert },
    { id: "graph", label: "Graph", icon: Network },
    { id: "reports", label: "Reports", icon: FileText },
    { id: "models", label: "Models", icon: Cpu },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <motion.aside
      id="main-sidebar"
      animate={{ width: isCollapsed ? 68 : 240 }}
      transition={{ duration: 0.22, ease: "easeInOut" }}
      className="bg-[#111317] border-r border-[#23262F] flex flex-col justify-between h-screen shrink-0 relative z-30"
    >
      {/* Sidebar Toggle Button */}
      <motion.button
        onClick={() => onToggleCollapse(!isCollapsed)}
        whileTap={{ scale: 0.94 }}
        className="absolute -right-3 top-12 bg-[#161A22] border border-[#23262F] text-gray-400 hover:text-gray-200 rounded-full p-1 cursor-pointer shadow-md transition-colors"
      >
        {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </motion.button>

      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        {/* Brand Logo & Name */}
        <div className="p-4 border-b border-[#23262F]/60 flex items-center justify-between h-16 shrink-0">
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
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.div
                  key="brand-text"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
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
            </AnimatePresence>
          </div>
        </div>

        {/* Workspace Selector */}
        <div className="p-3 border-b border-[#23262F]/40 relative shrink-0">
          {isCollapsed ? (
            <div className="flex justify-center">
              <button
                onClick={() => onToggleCollapse(false)}
                className="p-2 rounded bg-black/40 border border-[#23262F] hover:bg-[#161A22] text-blue-400"
                title={activeWorkspace.name}
              >
                <Workflow className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div>
              <button
                onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
                className="w-full flex items-center justify-between p-2 bg-black/30 border border-[#23262F] hover:bg-black/50 rounded-lg text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Layers className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-caption font-mono text-gray-500">
                      Workspace
                    </div>
                    <div className="text-secondary-body font-sans font-medium text-gray-300 truncate group-hover:text-white transition-colors">
                      {activeWorkspace.name}
                    </div>
                  </div>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${showWorkspaceDropdown ? "rotate-180" : ""}`}
                />
              </button>

              {/* Dropdown list */}
              {showWorkspaceDropdown && (
                <div className="absolute top-full left-3 right-3 bg-[#161A22] border border-[#23262F] rounded-lg mt-1 p-1 shadow-xl z-50">
                  {workspaces.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => {
                        onSelectWorkspace(ws);
                        setShowWorkspaceDropdown(false);
                      }}
                      className={`w-full flex flex-col p-2 text-left rounded-md transition-colors ${ws.id === activeWorkspace.id
                        ? "bg-blue-500/10 text-blue-400"
                        : "text-gray-400 hover:bg-[#23262F]/60"
                        }`}
                    >
                      <span className="text-secondary-body font-medium">{ws.name}</span>
                      <span className="text-caption font-mono text-gray-500 mt-0.5">
                        {ws.region} · {ws.sensorsActive} sensors
                      </span>
                    </button>
                  ))}
                </div>
              )}
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
                {/* Gliding premium background indicator */}
                {isActive && (
                  <motion.div
                    layoutId="sidebarActiveBackground"
                    className="absolute inset-0 bg-blue-500/10 rounded-lg border-l-2 border-blue-500 z-0"
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                  />
                )}

                <div className="flex items-center gap-3 min-w-0 relative z-10">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${isActive ? "text-blue-400" : "text-gray-500"}`}
                  />
                  <AnimatePresence mode="wait">
                    {!isCollapsed && (
                      <motion.span
                        key="nav-label"
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -6 }}
                        transition={{ duration: 0.1, ease: "easeInOut" }}
                        className="text-secondary-body font-sans font-medium tracking-wide shrink-0"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </motion.button>
            );
          })}
        </nav>
      </div>
    </motion.aside>
  );
}
