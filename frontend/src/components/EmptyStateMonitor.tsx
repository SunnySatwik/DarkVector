/**
 * EmptyStateMonitor
 *
 * Premium empty state for SOC pages.
 * Communicates that the system is actively watching — not just "nothing here".
 *
 * Design: subtle radar ring, monospace status text, action button.
 * No "No items found" — always "Monitoring active".
 */

import { motion } from "motion/react";
import { Shield, Radio, Activity } from "lucide-react";

interface EmptyStateMonitorProps {
  variant?: "investigations" | "events" | "queue" | "generic";
  actionLabel?: string;
  onAction?: () => void;
}

const CONFIG = {
  investigations: {
    icon: Shield,
    title: "No active investigations",
    subtitle: "Endpoint telemetry is being monitored continuously.",
    status: "Monitoring active",
  },
  events: {
    icon: Activity,
    title: "No live events",
    subtitle: "Event stream is connected and listening for telemetry.",
    status: "Stream connected",
  },
  queue: {
    icon: Radio,
    title: "Investigation queue empty",
    subtitle: "All open cases have been resolved or archived.",
    status: "All clear",
  },
  generic: {
    icon: Shield,
    title: "Nothing to show",
    subtitle: "The system is actively monitoring for activity.",
    status: "Monitoring active",
  },
} as const;

export default function EmptyStateMonitor({
  variant = "generic",
  actionLabel,
  onAction,
}: EmptyStateMonitorProps) {
  const cfg = CONFIG[variant];
  const Icon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center py-20 px-8 text-center select-none"
    >
      {/* Radar icon with rings */}
      <div className="relative mb-8">
        {/* Outer pulse ring 1 */}
        <div className="radar-ring absolute inset-0 rounded-full border border-blue-500/20" />
        {/* Outer pulse ring 2 — offset */}
        <div className="radar-ring-2 absolute inset-0 rounded-full border border-blue-500/15" />

        {/* Icon container */}
        <div className="relative w-14 h-14 rounded-2xl bg-blue-500/5 border border-blue-500/15 flex items-center justify-center z-10">
          <Icon className="w-6 h-6 text-blue-400/60" />
        </div>
      </div>

      {/* Status chip */}
      <div className="flex items-center gap-1.5 mb-4">
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="telemetry-pulse-outer absolute inline-flex h-full w-full rounded-full bg-emerald-500/60" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
        </span>
        <span className="text-[10px] font-mono text-emerald-500/80 uppercase tracking-widest">
          {cfg.status}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-[15px] font-semibold text-gray-300 mb-2 font-sans">
        {cfg.title}
      </h3>

      {/* Subtitle */}
      <p className="text-[13px] text-gray-500 font-sans max-w-[280px] leading-relaxed">
        {cfg.subtitle}
      </p>

      {/* Optional action */}
      {actionLabel && onAction && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onAction}
          className="mt-6 px-4 py-2 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 hover:border-blue-500/35 text-blue-400 text-xs font-sans font-medium transition-all duration-150 cursor-pointer"
        >
          {actionLabel}
        </motion.button>
      )}
    </motion.div>
  );
}
