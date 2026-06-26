import { BellOff, CheckCircle2, AlertTriangle, ShieldCheck, Trash2 } from "lucide-react";
import { motion } from "motion/react";

interface Notification {
  id: string;
  type: "alert" | "success" | "info";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onClearAll: () => void;
}

export default function NotificationPanel({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onClearAll,
}: NotificationPanelProps) {
  if (!isOpen) return null;

  return (
    <motion.div
      id="notification-popover"
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 top-12 w-80 bg-[#161A22] border border-[#23262F] rounded-xl shadow-2xl z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[#23262F] bg-black/20">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono font-semibold tracking-wider text-gray-200 uppercase">
            Platform Notifications
          </span>
          {notifications.some((n) => !n.read) && (
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          )}
        </div>

        {notifications.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-[10px] text-gray-500 hover:text-red-400 font-mono flex items-center gap-1 hover:bg-[#09090B] px-1.5 py-0.5 rounded transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            <span>Dismiss All</span>
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-[280px] overflow-y-auto divide-y divide-[#23262F]/50">
        {notifications.length === 0 ? (
          <div className="py-10 text-center flex flex-col items-center justify-center text-gray-500">
            <BellOff className="w-5 h-5 mb-2 text-gray-600" />
            <span className="text-xs font-mono">No new indicators</span>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => onMarkRead(notif.id)}
              className={`p-3 text-left transition-colors duration-100 cursor-pointer flex gap-3 ${
                notif.read
                  ? "bg-transparent hover:bg-black/20"
                  : "bg-blue-500/5 hover:bg-blue-500/10"
              }`}
            >
              {/* Icon classification */}
              <div className="shrink-0 mt-0.5">
                {notif.type === "alert" && <AlertTriangle className="w-4 h-4 text-red-400" />}
                {notif.type === "success" && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                {notif.type === "info" && <ShieldCheck className="w-4 h-4 text-blue-400" />}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-medium truncate ${notif.read ? "text-gray-400" : "text-gray-200"}`}
                  >
                    {notif.title}
                  </span>
                  <span className="text-[9px] font-mono text-gray-500 shrink-0 ml-1">
                    {notif.time}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 line-clamp-2 mt-0.5 font-sans leading-relaxed">
                  {notif.message}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-[#23262F] bg-black/10 text-center text-[10px] text-gray-500 font-mono">
        Active Environment: DV-PROD-PRIMARY
      </div>
    </motion.div>
  );
}
