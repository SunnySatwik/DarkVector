import { useState, useRef, useEffect } from "react";
import { Search, Bell, Sun, Moon } from "lucide-react";
import { Workspace } from "../types";
import NotificationPanel from "./NotificationPanel";

interface TopNavProps {
  onOpenSearch: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  activeWorkspace?: Workspace;
  notifications: any[];
  onMarkRead: (id: string) => void;
  onClearAll: () => void;
}

export default function TopNav({
  onOpenSearch,
  notifications,
  onMarkRead,
  onClearAll,
}: TopNavProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const notificationButtonRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

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
            Search threat models, logs, and evidence...{" "}
            <kbd className="font-mono text-[10px] bg-[#161A22] border border-[#23262F] px-1 py-0.2 rounded ml-1 text-gray-400">
              ⌘K
            </kbd>
          </span>
        </button>
      </div>

      {/* Toolbar Controls */}
      <div className="flex items-center gap-4 shrink-0">
        {/* Notification Bell */}
        <div className="relative" ref={notificationButtonRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`p-2 bg-[#161A22] border rounded-lg text-gray-400 hover:text-gray-200 cursor-pointer transition-colors shrink-0 flex items-center justify-center ${
              showNotifications ? "border-blue-500/60" : "border-[#23262F]"
            }`}
            title="Notifications"
          >
            <Bell className="w-3.5 h-3.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1 bg-blue-500 text-[9px] font-mono font-extrabold text-white px-1.5 py-0.2 rounded-full ring-2 ring-[#111317]">
                {unreadCount}
              </span>
            )}
          </button>

          <NotificationPanel
            isOpen={showNotifications}
            onClose={() => setShowNotifications(false)}
            notifications={notifications}
            onMarkRead={onMarkRead}
            onClearAll={onClearAll}
          />
        </div>

        {/* Theme Toggle */}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-2 bg-[#161A22] border border-[#23262F] hover:border-gray-500 rounded-lg text-gray-400 hover:text-gray-200 cursor-pointer transition-colors shrink-0 flex items-center justify-center"
          title="Toggle theme"
        >
          {isDarkMode ? (
            <Moon className="w-3.5 h-3.5 text-blue-400" />
          ) : (
            <Sun className="w-3.5 h-3.5 text-yellow-400" />
          )}
        </button>

        {/* Profile */}
        <div className="flex items-center gap-2.5 p-1 rounded-lg border border-[#23262F] bg-[#161A22]/40 hover:bg-[#161A22]/80 transition-colors duration-150 cursor-pointer shrink-0">
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80"
            alt="User profile"
            referrerPolicy="no-referrer"
            className="w-7 h-7 rounded-full object-cover border border-blue-500/30 shrink-0"
          />
          <div className="hidden sm:flex flex-col min-w-0 pr-1.5">
            <span className="text-xs font-semibold text-gray-200 truncate leading-none">
              sunnysatwik95
            </span>
            <span className="text-[9px] font-mono text-gray-500 truncate mt-0.5">
              Staff analyst
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
