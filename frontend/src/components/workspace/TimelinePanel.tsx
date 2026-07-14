import { motion } from "motion/react";
import { Shield, Sparkles, Circle, Clock } from "lucide-react";
import { TimelineEvent } from "../../api/types";
import { Skeleton } from "../ui/DesignSystem";
import { parseUtcDate } from "../../lib/timeFormatter";


const fadeIn = (delay = 0) => ({
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.22, delay },
});

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25, delay },
});

function SectionLabel({
  icon: Icon,
  children,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5 mb-3">
      {Icon && <Icon className="w-3.5 h-3.5 text-gray-500" />}
      <h2 className="text-[11px] font-sans font-medium text-gray-500 tracking-wide uppercase">
        {children}
      </h2>
    </div>
  );
}

function getActorIcon(actor: string) {
  const norm = actor.toLowerCase();
  if (norm === "system") return Shield;
  if (norm === "ai") return Sparkles;
  return Circle;
}

function getActorColor(actor: string) {
  const norm = actor.toLowerCase();
  if (norm === "system") return "text-red-400 bg-red-500/10 border-red-500/20";
  if (norm === "ai") return "text-purple-400 bg-purple-500/10 border-purple-500/20";
  return "text-gray-400 bg-gray-500/10 border-gray-500/20";
}

function formatTimestamp(dateStr: string) {
  try {
    const d = parseUtcDate(dateStr);
    return d.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch (e) {
    return dateStr;
  }
}

export function TimelinePanel({
  timeline,
  isPending,
}: {
  timeline?: TimelineEvent[];
  isPending: boolean;
}) {
  if (isPending) {
    return (
      <section className="space-y-4">
        <SectionLabel icon={Clock}>Investigation timeline</SectionLabel>
        <div className="space-y-4 pl-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton circle width={24} height={24} className="shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <Skeleton width="40%" height={10} />
                <Skeleton width="80%" height={14} />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!timeline || timeline.length === 0) {
    return (
      <section className="space-y-4">
        <SectionLabel icon={Clock}>Investigation timeline</SectionLabel>
        <div className="border border-border-custom/12 rounded-xl px-6 py-8 text-center bg-surface/5">
          <p className="text-xs text-gray-500 font-sans">No investigation activity yet.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <SectionLabel icon={Clock}>Investigation timeline</SectionLabel>

      <div className="relative pl-4 space-y-5">
        {/* Continuous Track Line drawing itself */}
        <motion.div 
          initial={{ height: 0 }}
          animate={{ height: "calc(100% - 28px)" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          className="absolute left-[27px] top-[14px] w-px bg-gradient-to-b from-purple-500/40 via-border-custom/25 to-transparent pointer-events-none" 
        />

        {timeline.map((evt, i) => {
          const Icon = getActorIcon(evt.actor);
          const colorClass = getActorColor(evt.actor);

          return (
            <motion.div
              key={evt.id}
              {...fadeIn(i * 0.05)}
              className="group relative flex gap-4 text-left"
            >
              {/* Event node icon */}
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 z-10 ${colorClass}`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>

              {/* Content box */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <span className="text-[13px] font-semibold text-gray-200 leading-tight">
                    {evt.title}
                  </span>
                  <span className="text-[10px] font-mono text-gray-500 shrink-0">
                    {formatTimestamp(evt.timestamp)}
                  </span>
                </div>
                <p className="text-[12px] text-gray-400 leading-relaxed mt-1">
                  {evt.description}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[9px] font-mono text-gray-600 uppercase tracking-wider select-none">
                    Actor:
                  </span>
                  <span className="text-[9px] font-mono text-gray-400 capitalize bg-elevated/45 border border-border-custom/10 px-1 py-0.25 rounded">
                    {evt.actor}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
