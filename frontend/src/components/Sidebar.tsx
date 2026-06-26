import { useState } from "react";
import { motion } from "motion/react";
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
}

export default function Sidebar({
  activeTab,
  onSelectTab,
  workspaces,
  activeWorkspace,
  onSelectWorkspace,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);

  const menuItems = [
    { id: "dashboard", label: "Forensic Studio", icon: LayoutDashboard, badge: null },
    { id: "explorer", label: "Threat Explorer", icon: SearchCode, badge: null },
    { id: "graph", label: "Threat Graph", icon: Network, badge: null },
    { id: "threats", label: "Vector Timeline", icon: ShieldAlert, badge: "8" },
    { id: "investigations", label: "Case Records", icon: LogAlert, badge: "3" },
    { id: "knowledge", label: "Knowledge Base", icon: BookOpen, badge: null },
    { id: "live", label: "Socket Terminal", icon: Radio, badge: "LIVE" },
    { id: "models", label: "Neural Tuning", icon: Cpu, badge: null },
    { id: "reports", label: "Forensic Audits", icon: FileText, badge: null },
    { id: "settings", label: "Sensor Config", icon: Settings, badge: null },
  ];

  return (
    <motion.aside
      id="main-sidebar"
      animate={{ width: isCollapsed ? 68 : 240 }}
      transition={{ type: "spring", damping: 28, stiffness: 260 }}
      className="bg-[#111317] border-r border-[#23262F] flex flex-col justify-between h-screen shrink-0 relative z-30"
    >
      {/* Sidebar Toggle Button */}
      <motion.button
        onClick={() => setIsCollapsed(!isCollapsed)}
        whileTap={{ scale: 0.94 }}
        className="absolute -right-3 top-12 bg-[#161A22] border border-[#23262F] text-gray-400 hover:text-gray-200 rounded-full p-1 cursor-pointer shadow-md transition-colors"
      >
        {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </motion.button>

      <div>
        {/* Brand Logo & Name */}
        <div className="p-4 border-b border-[#23262F]/60 flex items-center justify-between h-16">
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
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col"
              >
                <span className="font-display font-bold text-sm tracking-wide text-gray-100 uppercase">
                  DarkVector
                </span>
                <span className="text-[9px] font-mono font-medium text-blue-400 tracking-widest uppercase">
                  AI SEC PLATFORM
                </span>
              </motion.div>
            )}
          </div>
        </div>

        {/* Workspace Selector */}
        <div className="p-3 border-b border-[#23262F]/40 relative">
          {isCollapsed ? (
            <div className="flex justify-center">
              <button
                onClick={() => setIsCollapsed(false)}
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
                    <div className="text-[10px] font-mono font-semibold text-gray-500 tracking-wider">
                      WORKSPACE
                    </div>
                    <div className="text-xs font-semibold text-gray-300 truncate group-hover:text-white transition-colors">
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
                      className={`w-full flex flex-col p-2 text-left rounded-md transition-colors ${
                        ws.id === activeWorkspace.id
                          ? "bg-blue-500/10 text-blue-400"
                          : "text-gray-400 hover:bg-[#23262F]/60"
                      }`}
                    >
                      <span className="text-xs font-semibold">{ws.name}</span>
                      <span className="text-[9px] font-mono text-gray-500 mt-0.5">
                        {ws.region} • {ws.sensorsActive} sensors
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
                className={`w-full flex items-center justify-between rounded-lg p-2.5 text-left cursor-pointer relative transition-colors duration-200 ${
                  isActive
                    ? "text-blue-400 font-medium"
                    : "text-gray-400 hover:text-gray-200 hover:bg-[#161A22]/20"
                }`}
              >
                {/* Gliding premium background indicator */}
                {isActive && (
                  <motion.div
                    layoutId="sidebarActiveBackground"
                    className="absolute inset-0 bg-blue-500/10 rounded-lg border-l-2 border-blue-500 z-0"
                    transition={{ type: "spring", damping: 28, stiffness: 320 }}
                  />
                )}

                <div className="flex items-center gap-3 min-w-0 relative z-10">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${isActive ? "text-blue-400" : "text-gray-500"}`}
                  />
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs font-sans tracking-wide"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </div>

                {/* Badges */}
                {!isCollapsed && item.badge && (
                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded shrink-0 relative z-10 ${
                      item.badge === "LIVE"
                        ? "bg-red-500/10 text-red-400 border border-red-500/20"
                        : "bg-[#23262F] text-gray-400"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </motion.button>
            );
          })}
        </nav>
      </div>

      {/* Bottom utility controls */}
      <div className="border-t border-[#23262F]/60 p-3 bg-black/10">
        {/* Locked dark mode indicator with subtle toggle style */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-[#161A22]/40 border border-[#23262F]/30 mb-2">
          {isCollapsed ? (
            <div className="w-full flex justify-center">
              <SunMoon className="w-4 h-4 text-purple-400" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <SunMoon className="w-4 h-4 text-purple-400" />
                <span className="text-[10px] font-mono text-gray-400">Tactical Dark Mode</span>
              </div>
              <div className="w-7 h-4 rounded-full bg-purple-500/20 border border-purple-500/30 p-0.5 flex justify-end">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-400" />
              </div>
            </>
          )}
        </div>

        {/* User Profile Trigger */}
        <div className="flex items-center gap-2.5 p-1.5 rounded-lg border border-transparent hover:bg-[#161A22]/60 hover:border-[#23262F]/60 transition-colors duration-150 cursor-pointer">
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80"
            alt="User profile"
            referrerPolicy="no-referrer"
            className="w-7 h-7 rounded-full object-cover border border-purple-500/30 shrink-0"
          />
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col min-w-0"
            >
              <span className="text-xs font-semibold text-gray-200 truncate leading-none">
                sunnysatwik95
              </span>
              <span className="text-[9px] font-mono text-gray-500 truncate mt-0.5">
                Staff Cyber Analyst
              </span>
            </motion.div>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
