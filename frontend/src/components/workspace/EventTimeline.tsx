/**
 * EventTimeline
 *
 * Compact vertical chronological timeline of events for a given alert.
 * Optimised for scanability — all events readable at a glance.
 * Used in the left column of InvestigationWorkspace.
 */

import { CheckCircle2, Cpu, Network, ShieldAlert } from "lucide-react";
import type { Alert } from "../../types";

interface TimelineEvent {
  title: string;
  desc: string;
  status: "normal" | "warning" | "error" | "critical";
  icon: React.ComponentType<{ className?: string }>;
  time: string;
}

function buildTimeline(alert: Alert): TimelineEvent[] {
  return [
    {
      title: "Baseline established",
      desc: `${alert.source} — all parameters within normal range.`,
      status: "normal",
      icon: CheckCircle2,
      time: "–4 min",
    },
    {
      title: "Anomalous process spawn",
      desc: `${alert.details.processPath || "Unknown binary"} spawned outside expected path.`,
      status: "warning",
      icon: Cpu,
      time: "–2 min",
    },
    {
      title: "Outbound connection",
      desc: `Socket to ${alert.details.ipAddress || "external host"}:${alert.details.port || 443}.`,
      status: "error",
      icon: Network,
      time: "–90 s",
    },
    {
      title: "Alert raised",
      desc: `Anomaly score ${alert.score} — exceeded threshold.`,
      status: "critical",
      icon: ShieldAlert,
      time: "Now",
    },
  ];
}

const DOT_CLASSES: Record<TimelineEvent["status"], string> = {
  normal:   "bg-emerald-500",
  warning:  "bg-yellow-500",
  error:    "bg-orange-500",
  critical: "bg-red-500",
};

const TIME_CLASSES: Record<TimelineEvent["status"], string> = {
  normal:   "text-emerald-500/70",
  warning:  "text-yellow-500/70",
  error:    "text-orange-500/70",
  critical: "text-red-500/70",
};

const TITLE_CLASSES: Record<TimelineEvent["status"], string> = {
  normal:   "text-gray-400",
  warning:  "text-yellow-400",
  error:    "text-orange-400",
  critical: "text-red-400",
};

interface EventTimelineProps {
  alert: Alert;
}

export function EventTimeline({ alert }: EventTimelineProps) {
  const events = buildTimeline(alert);

  return (
    <div className="relative space-y-1">
      {events.map((evt, i) => {
        const isLast = i === events.length - 1;
        return (
          <div
            key={i}
            className="group relative flex gap-3 px-2.5 py-1.5 -mx-2.5 rounded-md hover:bg-elevated/12 transition-all duration-120 cursor-default"
          >
            {/* Absolute Track Line */}
            {!isLast && (
              <div className="absolute left-[14px] top-[18px] bottom-0 w-px bg-border-custom/15 pointer-events-none" />
            )}

            {/* Track Dot */}
            <div className="flex flex-col items-center shrink-0" style={{ width: 10 }}>
              <div
                className={`w-1.5 h-1.5 rounded-full mt-[5px] shrink-0 ${DOT_CLASSES[evt.status]} ${
                  evt.status === "critical" ? "animate-pulse" : ""
                }`}
              />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-1">
                <span className={`text-[11px] font-medium leading-tight ${TITLE_CLASSES[evt.status]}`}>
                  {evt.title}
                </span>
                <span className={`text-[9px] font-mono shrink-0 ${TIME_CLASSES[evt.status]}`}>
                  {evt.time}
                </span>
              </div>
              <p className="text-[10px] text-gray-500 leading-snug mt-0.5 pr-1">
                {evt.desc}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
