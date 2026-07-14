/**
 * EventTimeline
 *
 * Compact vertical chronological timeline of events.
 * Optimised for scanability — all events readable at a glance.
 * Used in the left column of InvestigationWorkspace.
 */

import { CheckCircle2, Cpu, Network, ShieldAlert, Sparkles, Circle } from "lucide-react";
import type { Alert } from "../../types";
import { TimelineEvent } from "../../api/types";
import { formatLocalTimeOnly } from "../../lib/timeFormatter";
import { motion } from "motion/react";

interface LeftTimelineEvent {
  title: string;
  desc: string;
  status: "normal" | "warning" | "error" | "critical";
  time: string;
}


function buildTimeline(alert: Alert): LeftTimelineEvent[] {
  return [
    {
      title: "Baseline established",
      desc: `${alert.source} — all parameters within normal range.`,
      status: "normal",
      time: "–4 min",
    },
    {
      title: "Anomalous process spawn",
      desc: `${alert.details.processPath || "Unknown binary"} spawned outside expected path.`,
      status: "warning",
      time: "–2 min",
    },
    {
      title: "Outbound connection",
      desc: `Socket to ${alert.details.ipAddress || "external host"}:${alert.details.port || 443}.`,
      status: "error",
      time: "–90 s",
    },
    {
      title: "Alert raised",
      desc: `Anomaly score ${alert.score} — exceeded threshold.`,
      status: "critical",
      time: "Now",
    },
  ];
}

const DOT_CLASSES: Record<LeftTimelineEvent["status"], string> = {
  normal:   "bg-emerald-500",
  warning:  "bg-yellow-500",
  error:    "bg-orange-500",
  critical: "bg-red-500",
};

const TIME_CLASSES: Record<LeftTimelineEvent["status"], string> = {
  normal:   "text-emerald-500/70",
  warning:  "text-yellow-500/70",
  error:    "text-orange-500/70",
  critical: "text-red-500/70",
};

const TITLE_CLASSES: Record<LeftTimelineEvent["status"], string> = {
  normal:   "text-gray-400",
  warning:  "text-yellow-400",
  error:    "text-orange-400",
  critical: "text-red-400",
};

interface EventTimelineProps {
  alert?: Alert;
  timeline?: TimelineEvent[];
}

export function EventTimeline({ alert, timeline }: EventTimelineProps) {
  const events = timeline
    ? timeline.map((e) => {
        let status: LeftTimelineEvent["status"] = "normal";
        const actor = e.actor.toLowerCase();
        if (actor === "system") {
          status = "critical";
        } else if (actor === "ai") {
          status = "warning";
        }
        return {
          title: e.title,
          desc: e.description,
          status,
          time: formatLocalTimeOnly(e.timestamp),
        };
      })
    : alert
    ? buildTimeline(alert)
    : [];

  return (
    <div className="relative space-y-1">
      {events.map((evt, i) => {
        const isLast = i === events.length - 1;
        return (
          <div
            key={i}
            className="group relative flex gap-3 px-2.5 py-1.5 -mx-2.5 rounded-md hover:bg-elevated/12 transition-all duration-120 cursor-default"
          >
            {/* Absolute Track Line drawing itself */}
            {!isLast && (
              <motion.div 
                initial={{ height: 0 }}
                animate={{ height: "100%" }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: i * 0.05 }}
                className="absolute left-[14px] top-[18px] w-px bg-border-custom/15 pointer-events-none" 
              />
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
              <p className="text-[10px] text-gray-500 leading-snug mt-0.5 pr-1 break-words">
                {evt.desc}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
