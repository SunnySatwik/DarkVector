/**
 * Mission Control — Overview Page
 *
 * Answers one question: "What should I work on next?"
 *
 * Visual hierarchy:
 *   1. Priority investigation (the thing that matters most)
 *   2. Vector's briefing (AI context, why this matters)
 *   3. Active investigations (what else is open)
 *   4. Recent activity + suggested action (supporting info)
 *
 * Design philosophy:
 *   — Whitespace over borders.
 *   — Typography over decoration.
 *   — The incident is the hero, not the interface.
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAlerts } from "../hooks/useAlerts";
import { formatLocalTimeOnly } from "../lib/timeFormatter";

import { useInvestigations } from "../hooks/useInvestigations";
import { Alert, Severity } from "../types";
import { Investigation } from "../api/types";
import { MOCK_ALERTS } from "../mockData";
import { generateRandomAlert } from "../lib/alertGenerator";
import {
  ChevronRight,
  Sparkles,
  Clock,
  ShieldAlert,
  Activity,
  Zap,
  FlameKindling,
} from "lucide-react";
import { Badge, Skeleton } from "../components/ui/DesignSystem";
import EmptyStateMonitor from "../components/EmptyStateMonitor";

// ─── Props ────────────────────────────────────────────────────────────────────

interface DashboardProps {
  onSelectAlert: (alert: Alert) => void;
  isRefreshing: boolean;
  onOpenInvestigation?: (id: string) => void;
}

// ─── Data ────────────────────────────────────────────────────────────────────

function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  } catch (e) {
    return "recently";
  }
}



// ─── Helpers ──────────────────────────────────────────────────────────────────

function severityVariant(s: Severity): "critical" | "high" | "medium" | "low" | "default" {
  if (s === "critical") return "critical";
  if (s === "high") return "high";
  if (s === "medium") return "medium";
  return "low";
}

function severityDot(s: Severity) {
  if (s === "critical") return "bg-red-500";
  if (s === "high") return "bg-orange-500";
  if (s === "medium") return "bg-yellow-500";
  return "bg-primary-blue";
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.26, delay, ease: [0.16, 1, 0.3, 1] as const },
});

// ─── Inline markdown renderer (bold + backtick) ───────────────────────────────

function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="text-gray-100 font-semibold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code key={i} className="font-mono text-blue-300/80 text-[12px] bg-blue-500/5 px-1 rounded">
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ─── Page header ─────────────────────────────────────────────────────────────

function PageHeader({
  criticalCount,
  onGenerateEvent,
  onSeedDemoAlerts,
  onClearGeneratedAlerts,
  onResetAlerts,
}: {
  criticalCount: number;
  onGenerateEvent?: () => void;
  onSeedDemoAlerts?: () => void;
  onClearGeneratedAlerts?: () => void;
  onResetAlerts?: () => void;
}) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <motion.div {...fadeUp(0)} className="mb-8 font-sans">
      <p className="text-[12px] text-gray-500 mb-1">{greeting}</p>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <h1 className="text-[28px] font-semibold text-gray-100 tracking-tight leading-none">
          What should I work on?
        </h1>
        <div className="flex flex-col items-end gap-2 shrink-0 mb-0.5">
          {onGenerateEvent && (
            <button
              onClick={onGenerateEvent}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/20 hover:border-purple-500/40 text-purple-400 text-xs font-mono font-medium transition-all duration-150 cursor-pointer shadow-sm shadow-purple-500/5"
            >
              <Zap className="w-3.5 h-3.5 animate-pulse" />
              <span>Generate Event</span>
            </button>
          )}

          {/* Subtle Developer Controls */}
          {(onSeedDemoAlerts || onClearGeneratedAlerts || onResetAlerts) && (
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[9px] font-mono text-gray-600 uppercase tracking-wider mr-1 select-none">
                Dev:
              </span>
              {onSeedDemoAlerts && (
                <button
                  onClick={onSeedDemoAlerts}
                  className="px-2 py-1 rounded border border-[#23262F] hover:border-gray-500 text-[10px] font-mono text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
                >
                  Seed Demo
                </button>
              )}
              {onClearGeneratedAlerts && (
                <button
                  onClick={onClearGeneratedAlerts}
                  className="px-2 py-1 rounded border border-[#23262F] hover:border-gray-500 text-[10px] font-mono text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
                >
                  Clear Generated
                </button>
              )}
              {onResetAlerts && (
                <button
                  onClick={onResetAlerts}
                  className="px-2 py-1 rounded border border-red-900/20 hover:border-red-500/30 text-[10px] font-mono text-red-400/80 hover:text-red-400 transition-colors cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── 1. Priority Investigation ───────────────────────────────────────────────

interface PriorityItem {
  id: string;
  severity: Severity;
  timestamp: string;
  type: string;
  description: string;
  source: string;
  score: number;
  isInvestigation: boolean;
  rawAlert?: Alert;
}

function PriorityInvestigation({
  item,
  onInvestigateAlert,
  onInvestigateInvestigation,
  isPending = false,
}: {
  item: PriorityItem | null;
  onInvestigateAlert: (a: Alert) => void;
  onInvestigateInvestigation: (id: string) => void;
  isPending?: boolean;
}) {
  if (!item) {
    return (
      <motion.section {...fadeUp(0.06)}>
        <p className="text-[10px] text-gray-600 font-sans tracking-widest uppercase mb-3">
          Priority investigation
        </p>
        <div className="rounded-xl border border-border-custom/12 px-6 py-8 text-center bg-surface/5">
          <p className="text-xs text-gray-500 font-sans">No investigations or alerts available to review. Generate telemetry to start.</p>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section {...fadeUp(0.06)}>
      {/* Section label */}
      <p className="text-[10px] text-gray-600 font-sans tracking-widest uppercase mb-3">
        Priority investigation
      </p>

      {/* Hero block — no heavy border, elevation via background only */}
      <div className="relative rounded-xl bg-red-950/8 border border-red-500/10 px-6 py-5 overflow-hidden">
        {/* Top edge glow accent */}
        <div className="vector-edge-pulse absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />

        {/* Left accent line */}
        <div className="absolute left-0 top-4 bottom-4 w-0.5 bg-gradient-to-b from-red-500/70 via-red-500/30 to-transparent rounded-full" />

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
          <div className="flex items-start gap-4 min-w-0">
            {/* Icon */}
            <div className="w-9 h-9 rounded-xl bg-red-500/8 flex items-center justify-center shrink-0 mt-0.5">
              <FlameKindling className="w-4.5 h-4.5 text-red-400" />
            </div>

            <div className="min-w-0">
              {/* Meta row */}
              <div className="flex items-center gap-2 mb-2 h-[18px]">
                {isPending ? (
                  <Skeleton width={48} height={16} className="rounded-md animate-pulse-slow" />
                ) : (
                  <Badge variant={severityVariant(item.severity)}>{item.severity}</Badge>
                )}
                <span className="text-[10px] font-mono text-gray-500">{item.id}</span>
                <span className="text-gray-700">·</span>
                <span className="flex items-center gap-1 text-[10px] font-mono text-gray-500">
                  <Clock className="w-3 h-3" />
                  {formatLocalTimeOnly(item.timestamp)}
                </span>
              </div>

              {/* Title */}
              <h2 className="text-[18px] font-semibold text-gray-100 leading-snug tracking-tight font-sans mb-2">
                {item.type}
              </h2>

              {/* Description */}
              <p className="text-[13px] text-gray-400 leading-relaxed font-sans mb-3 max-w-[65ch]">
                {item.description}
              </p>

              {/* Inline metadata */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-600 font-sans">Source</span>
                  <code className="text-[10px] font-mono text-blue-300/80 bg-blue-500/5 border border-blue-500/10 px-1.5 py-0.5 rounded">
                    {item.source}
                  </code>
                </div>
                <div className="flex items-center gap-1.5 h-[14px]">
                  <span className="text-[10px] text-gray-600 font-sans">Score</span>
                  {isPending ? (
                    <Skeleton width={40} height={12} className="rounded animate-pulse-slow" />
                  ) : (
                    <span className="text-[10px] font-mono text-red-400">{item.score.toFixed(0)}%</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={() => {
              if (item.isInvestigation) {
                onInvestigateInvestigation(item.id);
              } else if (item.rawAlert) {
                onInvestigateAlert(item.rawAlert);
              }
            }}
            className="shrink-0 self-start md:self-center flex items-center gap-1.5 text-[12px] font-sans font-medium text-red-400 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/30 px-4 py-2 rounded-lg transition-all duration-120 cursor-pointer group"
          >
            Investigate
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-120" />
          </button>
        </div>
      </div>
    </motion.section>
  );
}

// ─── 2. Vector Briefing ──────────────────────────────────────────────────────

function VectorBriefing({
  briefing,
}: {
  briefing: string;
}) {
  return (
    <motion.section {...fadeUp(0.12)}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-6 h-6 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-3 h-3 text-violet-400" />
        </div>
        <div>
          <p className="text-[13px] font-medium text-gray-300 font-sans leading-none">Vector's briefing</p>
          <p className="text-[10px] text-gray-500 mt-0.5 font-sans">AI situational summary · updated now</p>
        </div>
      </div>

      <p className="text-[14px] text-gray-300 leading-relaxed font-sans max-w-[72ch] ml-9">
        <InlineMarkdown text={briefing} />
      </p>
    </motion.section>
  );
}

// ─── 3. Recent Alerts ────────────────────────────────────────────────────────

function RecentAlerts({
  alerts,
  onSelectAlert,
}: {
  alerts: Alert[];
  onSelectAlert: (alert: Alert) => void;
}) {
  return (
    <motion.section {...fadeUp(0.14)}>
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-[13px] font-medium text-gray-300 font-sans">Recent alerts</p>
        <span className="text-[10px] font-mono text-gray-600">
          {alerts.length} total
        </span>
      </div>

      <div key={alerts.length} className="divide-y divide-border-custom/15 list-update-pulse">
        {alerts.slice(0, 5).map((alert, i) => (
          <motion.button
            key={alert.id}
            {...fadeUp(0.16 + i * 0.04)}
            onClick={() => onSelectAlert(alert)}
            className="w-full flex items-center justify-between py-3 group transition-colors duration-120 text-left cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${severityDot(alert.severity)}`}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-mono text-gray-500">
                    {alert.id.length > 12 ? `${alert.id.slice(0, 12)}...` : alert.id}
                  </span>
                  <Badge variant={severityVariant(alert.severity)}>{alert.severity}</Badge>
                </div>
                <p className="text-[13px] text-gray-200 font-medium font-sans truncate group-hover:text-white transition-colors">
                  {alert.type}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[10px] text-gray-500 font-mono">Source: {alert.source}</span>
                  <span className="text-gray-700">·</span>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {formatLocalTimeOnly(alert.timestamp)}
                  </span>
                </div>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400 shrink-0 ml-4 transition-colors" />
          </motion.button>
        ))}
      </div>
    </motion.section>
  );
}

// ─── 4. Active Investigations ────────────────────────────────────────────────

function ActiveInvestigations({
  investigations,
  onOpen,
  isPending,
}: {
  investigations: Investigation[];
  onOpen: (id: string) => void;
  isPending: boolean;
}) {
  if (isPending) {
    return (
      <motion.section {...fadeUp(0.18)}>
        <div className="flex items-baseline justify-between mb-4">
          <p className="text-[13px] font-medium text-gray-300 font-sans">Active investigations</p>
          <Skeleton width={30} height={10} />
        </div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-4 py-3 border-b border-border-custom/15">
              <Skeleton circle width={8} height={8} className="shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton width={60} height={8} />
                <Skeleton width="50%" height={12} />
              </div>
            </div>
          ))}
        </div>
      </motion.section>
    );
  }

  if (!investigations || investigations.length === 0) {
    return (
      <motion.section {...fadeUp(0.18)}>
        <div className="flex items-baseline justify-between mb-4">
          <p className="text-[13px] font-medium text-gray-300 font-sans">Active investigations</p>
          <span className="text-[10px] font-mono text-gray-600">0 open</span>
        </div>
        <EmptyStateMonitor variant="investigations" />
      </motion.section>
    );
  }

  return (
    <motion.section {...fadeUp(0.18)}>
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-[13px] font-medium text-gray-300 font-sans">Active investigations</p>
        <span className="text-[10px] font-mono text-gray-600">
          {investigations.length} open
        </span>
      </div>

      <div className="divide-y divide-border-custom/15">
        {investigations.map((inv, i) => {
          // Only pulse if actively investigating or brand new — motion communicates state
          const isLive = inv.status.toLowerCase() === "investigating" || inv.status.toLowerCase() === "new";
          return (
            <motion.button
              key={inv.investigation_id}
              {...fadeUp(0.2 + i * 0.04)}
              onClick={() => onOpen(inv.investigation_id)}
              className="investigation-card w-full flex items-center justify-between py-3.5 group text-left cursor-pointer rounded-lg px-2 -mx-2"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Live-state indicator — pulse only when actively working */}
                <div className="relative shrink-0">
                  <div className={`w-1.5 h-1.5 rounded-full ${severityDot(inv.severity)}`} />
                  {isLive && (
                    <div className={`absolute inset-0 rounded-full ${severityDot(inv.severity)} opacity-50`}
                      style={{ animation: "doublePulseOuter 2.5s cubic-bezier(0.16, 1, 0.3, 1) infinite" }}
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-mono text-gray-500">{inv.investigation_id}</span>
                    <Badge variant={severityVariant(inv.severity)}>{inv.severity}</Badge>
                    {isLive && (
                      <span className="text-[9px] font-mono text-blue-400/70 uppercase tracking-wider">
                        {inv.status}
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] text-gray-200 font-medium font-sans truncate group-hover:text-white transition-colors">
                    {inv.title}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock className="w-2.5 h-2.5 text-gray-600" />
                    <span className="text-[10px] text-gray-500 font-mono">Updated {formatRelativeTime(inv.updated_at)}</span>
                  </div>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400 shrink-0 ml-4 transition-all duration-120 group-hover:translate-x-0.5" />
            </motion.button>
          );
        })}
      </div>
    </motion.section>
  );
}


// ─── Loading skeleton ────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-8 pb-16 space-y-10">
      <div className="mb-8 space-y-2">
        <Skeleton width={80} height={10} />
        <Skeleton width={260} height={30} />
      </div>
      <div className="space-y-3">
        <Skeleton width={120} height={8} />
        <div className="rounded-xl bg-surface/30 border border-border-custom/20 px-6 py-5">
          <div className="flex gap-4">
            <Skeleton circle width={36} height={36} className="shrink-0 mt-1" />
            <div className="space-y-2 flex-1">
              <Skeleton width={80} height={8} />
              <Skeleton width="70%" height={20} />
              <Skeleton width="90%" height={12} />
              <Skeleton width="45%" height={12} />
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton width={100} height={8} />
        <Skeleton width="100%" height={13} />
        <Skeleton width="80%" height={13} />
      </div>
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-4 py-3 border-b border-border-custom/15">
            <Skeleton circle width={8} height={8} className="shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton width={60} height={8} />
              <Skeleton width="50%" height={12} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Root Component ───────────────────────────────────────────────────────────

export default function Dashboard({
  onSelectAlert,
  isRefreshing,
  onOpenInvestigation,
}: DashboardProps) {
  const {
    alerts,
    addAlert,
    clearGeneratedAlerts,
    resetAlerts,
    seedDemoAlerts,
  } = useAlerts();
  const { data: investigations, isPending: isInvestigationsPending } = useInvestigations();

  const dynamicBriefing = useMemo(() => {
    const activeInvs = (investigations || []).filter(
      (inv) => inv.status.toUpperCase() !== "RESOLVED"
    );
    const totalActive = activeInvs.length;

    if (totalActive === 0) {
      return "There are currently no active investigations. All anomalous signals have been successfully reviewed and resolved.";
    }

    const highestPriority = [...activeInvs].sort((a, b) => b.risk_score - a.risk_score)[0];
    const newest = [...activeInvs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
    const underReview = activeInvs.filter(
      (inv) => inv.status.toUpperCase() === "INVESTIGATING" || inv.status.toUpperCase() === "NEW"
    ).length;

    let text = `There are currently **${totalActive}** active investigations.`;
    if (highestPriority) {
      const sevLabel =
        highestPriority.severity.charAt(0).toUpperCase() + highestPriority.severity.slice(1);
      text += ` The highest priority case is **${highestPriority.title}** (${sevLabel}, Risk **${highestPriority.risk_score}**).`;
    }
    if (newest) {
      text += ` **${newest.title}** is the newest investigation.`;
    }
    if (underReview > 0) {
      text += ` **${underReview}** investigation${underReview === 1 ? " is" : "s are"} currently under active review.`;
    }
    return text;
  }, [investigations]);

  const priorityItem = useMemo(() => {
    // 1. Prioritize active (non-resolved) backend investigations
    const activeInvs = (investigations || []).filter(
      (inv) => inv.status.toUpperCase() !== "RESOLVED"
    );
    if (activeInvs.length > 0) {
      // Get the highest risk score active investigation
      const topInv = [...activeInvs].sort((a, b) => b.risk_score - a.risk_score)[0];
      return {
        id: topInv.investigation_id,
        severity: topInv.severity.toLowerCase() as Severity,
        timestamp: topInv.created_at,
        type: topInv.title,
        description: topInv.summary || "Review the correlated execution paths, process telemetry, and behavioral AI reasoning for this case.",
        source: "Correlated",
        score: topInv.risk_score,
        isInvestigation: true,
      };
    }

    // 2. Fallback to legacy alerts
    const topAlert =
      alerts.find((a) => a.severity === "critical") ??
      alerts.find((a) => a.severity === "high") ??
      alerts.find((a) => a.severity === "medium") ??
      alerts.find((a) => a.severity === "low") ??
      alerts[0];

    if (topAlert) {
      return {
        id: topAlert.id,
        severity: topAlert.severity,
        timestamp: topAlert.timestamp,
        type: topAlert.type,
        description: topAlert.description,
        source: topAlert.source,
        score: topAlert.score,
        isInvestigation: false,
        rawAlert: topAlert,
      };
    }

    return null;
  }, [investigations, alerts]);

  const isPending = isInvestigationsPending;

  const criticalCount = alerts.filter(
    (a) => (a.status === "open" || a.status === "investigating") && a.severity === "critical"
  ).length;

  const handleGenerateEvent = () => {
    const alert = generateRandomAlert();
    console.log("Generated", alert.id);
    addAlert(alert);
  };

  if (isRefreshing) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 pb-20 space-y-10">
      {/* Greeting */}
      <PageHeader
        criticalCount={criticalCount}
        onGenerateEvent={handleGenerateEvent}
        onSeedDemoAlerts={seedDemoAlerts}
        onClearGeneratedAlerts={clearGeneratedAlerts}
        onResetAlerts={resetAlerts}
      />

      {/* 1 — Current highest priority investigation */}
      <PriorityInvestigation
        item={priorityItem}
        onInvestigateAlert={onSelectAlert}
        onInvestigateInvestigation={onOpenInvestigation ?? (() => {})}
        isPending={isPending}
      />

      {/* Thin section divider */}
      <div className="border-t border-border-custom/12" />

      {/* 2 — Vector's briefing */}
      <VectorBriefing briefing={dynamicBriefing} />

      <div className="border-t border-border-custom/12" />

      {/* 3 — Recent Alerts Feed */}
      <RecentAlerts alerts={alerts} onSelectAlert={onSelectAlert} />

      <div className="border-t border-border-custom/12" />

      {/* 4 — Active investigations */}
      <ActiveInvestigations
        investigations={investigations ?? []}
        onOpen={onOpenInvestigation ?? (() => {})}
        isPending={isInvestigationsPending}
      />

    </div>
  );
}
