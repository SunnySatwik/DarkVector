import { useState, useRef, useEffect } from "react";
import { Search, Bell, RotateCw, Sparkles, Sliders, Globe, AlertTriangle } from "lucide-react";
import { Workspace } from "../types";
import NotificationPanel from "./NotificationPanel";

interface TopNavProps {
  onOpenSearch: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  activeWorkspace: Workspace;
  notifications: any[];
  onMarkRead: (id: string) => void;
  onClearAll: () => void;
}

export default function TopNav({
  onOpenSearch,
  onRefresh,
  isRefreshing,
  activeWorkspace,
  notifications,
  onMarkRead,
  onClearAll,
}: TopNavProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [environment, setEnvironment] = useState<"prod" | "staging" | "lab">("prod");
  const notificationButtonRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Handle clicking outside notifications dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        showNotifications &&
        notificationButtonRef.current &&
        !notificationButtonRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifications]);

  return (
    <header
      id="top-nav-bar"
      className="bg-[#111317]/80 backdrop-blur-md border-b border-[#23262F] px-6 h-16 flex items-center justify-between z-20 sticky top-0"
    >
      {/* Search Bar Trigger */}
      <div className="flex-1 max-w-xl pr-4">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center gap-3 px-3 py-1.5 bg-[#09090B] border border-[#23262F] hover:border-blue-500/40 rounded-lg text-left text-gray-500 hover:text-gray-400 transition-colors cursor-pointer text-xs font-sans group"
        >
          <Search className="w-4 h-4 text-gray-500 group-hover:text-blue-400 transition-colors" />
          <span className="flex-1 truncate">
            Search threat models, SHAP parameters or press{" "}
            <kbd className="font-mono text-[10px] bg-[#161A22] border border-[#23262F] px-1 py-0.2 rounded ml-1 text-gray-400">
              ⌘K
            </kbd>
          </span>
        </button>
      </div>

      {/* Toolbar Controls */}
      <div className="flex items-center gap-4 shrink-0">
        {/* Environment Selector Pills */}
        <div className="bg-[#09090B] border border-[#23262F] rounded-lg p-0.5 flex items-center">
          <button
            onClick={() => setEnvironment("prod")}
            className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-all ${
              environment === "prod"
                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            PROD
          </button>
          <button
            onClick={() => setEnvironment("staging")}
            className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-all ${
              environment === "staging"
                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            STAGE
          </button>
          <button
            onClick={() => setEnvironment("lab")}
            className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-all ${
              environment === "lab"
                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            LAB
          </button>
        </div>

        {/* Workspace Quick Label */}
        <div className="hidden md:flex items-center gap-1.5 bg-[#161A22] border border-[#23262F]/80 px-2.5 py-1 rounded-lg text-xs text-gray-300 font-mono">
          <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="truncate max-w-[120px] font-semibold">{activeWorkspace.name}</span>
        </div>

        {/* Refresh Action Trigger */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 bg-[#161A22] border border-[#23262F] hover:border-gray-500 rounded-lg text-gray-400 hover:text-gray-200 cursor-pointer transition-colors shrink-0 flex items-center justify-center disabled:opacity-50"
          title="Refresh Sensor Telemetry"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-400" : ""}`} />
        </button>

        {/* Notification Bell Popover Controller */}
        <div className="relative" ref={notificationButtonRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`p-2 bg-[#161A22] border rounded-lg text-gray-400 hover:text-gray-200 cursor-pointer transition-colors shrink-0 flex items-center justify-center ${
              showNotifications ? "border-blue-500/60" : "border-[#23262F]"
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1 bg-red-500 text-[9px] font-mono font-extrabold text-white px-1.5 py-0.2 rounded-full ring-2 ring-[#111317]">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Popover notifications */}
          <NotificationPanel
            isOpen={showNotifications}
            onClose={() => setShowNotifications(false)}
            notifications={notifications}
            onMarkRead={onMarkRead}
            onClearAll={onClearAll}
          />
        </div>

        {/* Quick Connection Health Indicator */}
        <div className="flex items-center gap-1 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-lg">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] font-mono font-semibold text-green-400 tracking-wider">
            HEALTHY
          </span>
        </div>
      </div>
    </header>
  );
}
