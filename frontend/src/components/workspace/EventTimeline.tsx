/**
 * EventTimeline
 *
 * Vertical chronological timeline of events for a given alert.
 * Used in the left column of InvestigationWorkspace.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, ChevronUp, CheckCircle2, Cpu, Network, ShieldAlert } from "lucide-react";
import type { Alert } from "../../types";

interface TimelineEvent {
  title: string;
  desc: string;
  status: "normal" | "warning" | "error" | "critical";
  icon: React.ComponentType<{ className?: string }>;
  meta: string;
  time: string;
}

function buildTimeline(alert: Alert): TimelineEvent[] {
  return [
    {
      title: "System baseline established",
      desc: `Pod initialization on ${alert.source} — all parameters within normal operating range.`,
      status: "normal",
      icon: CheckCircle2,
      meta: "Baseline",
      time: "–4 min",
    },
    {
      title: "Anomalous process spawn",
      desc: `${alert.details.processPath || "Unknown binary"} spawned outside of expected execution path.`,
      status: "warning",
      icon: Cpu,
      meta: alert.details.parentProcess || "Unknown parent",
      time: "–2 min",
    },
    {
      title: "Outbound connection attempt",
      desc: `Socket opened to ${alert.details.ipAddress || "external host"} on port ${
        alert.details.port || 443
      }.`,
      status: "error",
      icon: Network,
      meta: alert.details.ipAddress || "Unknown IP",
      time: "–90 sec",
    },
    {
      title: "Isolation Forest alarm",
      desc: `Deviation score ${alert.score}% — exceeds critical threshold. Alert raised.`,
      status: "critical",
      icon: ShieldAlert,
      meta: `Score ${alert.score}%`,
      time: "Now",
    },
  ];
}

const DOT_CLASSES: Record<TimelineEvent["status"], string> = {
  normal: "bg-emerald-500 border-emerald-500/30",
  warning: "bg-yellow-500 border-yellow-500/30",
  error: "bg-orange-500 border-orange-500/30",
  critical: "bg-red-500 border-red-500/30",
};

const TITLE_CLASSES: Record<TimelineEvent["status"], string> = {
  normal: "text-emerald-400",
  warning: "text-yellow-400",
  error: "text-orange-400",
  critical: "text-red-400",
};

interface EventTimelineProps {
  alert: Alert;
}

export function EventTimeline({ alert }: EventTimelineProps) {
  const events = buildTimeline(alert);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({ 0: true, 3: true });

  const toggle = (i: number) =>
    setExpanded((prev) => ({ ...prev, [i]: !prev[i] }));

  return (
    <div className="space-y-0">
      {events.map((evt, i) => {
        const Icon = evt.icon;
        const isOpen = expanded[i];
        const isLast = i === events.length - 1;

        return (
          <div key={i} className="relative flex gap-3">
            {/* Track */}
            <div className="flex flex-col items-center">
              <div
                className={`w-2 h-2 rounded-full mt-2.5 shrink-0 ${DOT_CLASSES[evt.status]} ${
                  evt.status === "critical" ? "animate-pulse" : ""
                }`}
              />
              {!isLast && <div className="w-px flex-1 bg-[#23262F]/60 mt-1 mb-1" />}
            </div>

            <div className="flex-1 pb-3 min-w-0">
              <button onClick={() => toggle(i)} className="w-full text-left">
                <div className="flex items-start justify-between gap-1">
                  <span
                    className={`text-[11px] font-medium leading-snug ${TITLE_CLASSES[evt.status]}`}
                  >
                    {evt.title}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-3 h-3 text-gray-600 mt-0.5 shrink-0" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-gray-600 mt-0.5 shrink-0" />
                  )}
                </div>
                <span className="text-[10px] text-gray-600 font-mono">{evt.time}</span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="text-[10px] text-gray-500 leading-relaxed mt-1.5 pr-1">
                      {evt.desc}
                    </p>
                    <span className="inline-block mt-1 text-[9px] font-mono text-gray-600 bg-black/30 border border-[#23262F]/40 px-1.5 py-0.5 rounded">
                      {evt.meta}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        );
      })}
    </div>
  );
}
