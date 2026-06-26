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

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MOCK_ALERTS } from "../mockData";
import { Alert } from "../types";
import {
  ChevronRight,
  Sparkles,
  ArrowRight,
  Clock,
  ShieldAlert,
  CheckCircle2,
  User,
  Activity,
  AlertTriangle,
  Zap,
  FlameKindling,
} from "lucide-react";
import { Badge, Skeleton } from "../components/ui/DesignSystem";

// ─── Props ────────────────────────────────────────────────────────────────────

interface DashboardProps {
  onSelectAlert: (alert: Alert) => void;
  onOpenAiPanel: () => void;
  isRefreshing: boolean;
}

// ─── Data ────────────────────────────────────────────────────────────────────

const ACTIVE_INVESTIGATIONS = [
  {
    id: "INV-042",
    title: "Container shell escape via kube-system",
    alert: MOCK_ALERTS[0],
    updatedAt: "2 min ago",
    status: "active" as const,
  },
  {
    id: "INV-041",
    title: "Multi-source DB dump — finance cluster",
    alert: MOCK_ALERTS[1],
    updatedAt: "28 min ago",
    status: "active" as const,
  },
];

const RECENT_ACTIVITY = [
  {
    id: "act-1",
    icon: ShieldAlert,
    text: "Alert AL-8491 escalated to critical",
    time: "2m ago",
    color: "text-red-400",
  },
  {
    id: "act-2",
    icon: CheckCircle2,
    text: "INV-039 marked resolved by a_patel",
    time: "14m ago",
    color: "text-emerald-400",
  },
  {
    id: "act-3",
    icon: User,
    text: "m_chen@enterprise.com flagged for impossible travel",
    time: "34m ago",
    color: "text-orange-400",
  },
  {
    id: "act-4",
    icon: Activity,
    text: "Sensor heartbeat OK — 148 nodes reporting",
    time: "1h ago",
    color: "text-gray-500",
  },
  {
    id: "act-5",
    icon: AlertTriangle,
    text: "AL-7102 IAM privilege escalation under review",
    time: "2h ago",
    color: "text-yellow-400",
  },
];

const AI_BRIEFING =
  "Two critical incidents demand immediate attention. A container shell escape on **srv-k8s-api-01** has active connections to a known malicious address (194.26.135.84). Simultaneously, an unusual 4.8 GB database download is ongoing from the finance cluster. Recommend isolating `srv-k8s-api-01` and pausing database traffic before the data transfer completes.";

const SUGGESTED_NEXT = {
  label: "Isolate srv-k8s-api-01",
  description: "Apply network quarantine to block active egress to malicious hosts",
  alert: MOCK_ALERTS[0],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function severityVariant(s: string): "critical" | "high" | "medium" | "low" | "default" {
  if (s === "critical") return "critical";
  if (s === "high") return "high";
  if (s === "medium") return "medium";
  return "low";
}

function severityDot(s: string) {
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

function PageHeader() {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const criticalCount = MOCK_ALERTS.filter(
    (a) => (a.status === "open" || a.status === "investigating") && a.severity === "critical"
  ).length;

  return (
    <motion.div {...fadeUp(0)} className="mb-8 font-sans">
      <p className="text-[12px] text-gray-500 mb-1">{greeting}</p>
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-[28px] font-semibold text-gray-100 tracking-tight leading-none">
          What should I work on?
        </h1>
        {criticalCount > 0 && (
          <span className="flex items-center gap-1.5 text-[11px] text-red-400 font-sans shrink-0 mb-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
            {criticalCount} critical open
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ─── 1. Priority Investigation ───────────────────────────────────────────────

function PriorityInvestigation({
  alert,
  onInvestigate,
}: {
  alert: Alert;
  onInvestigate: (a: Alert) => void;
}) {
  return (
    <motion.section {...fadeUp(0.06)}>
      {/* Section label */}
      <p className="text-[10px] text-gray-600 font-sans tracking-widest uppercase mb-3">
        Priority investigation
      </p>

      {/* Hero block — no heavy border, elevation via background only */}
      <div className="relative rounded-xl bg-red-950/8 border border-red-500/10 px-6 py-5 overflow-hidden">
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
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="critical">Critical</Badge>
                <span className="text-[10px] font-mono text-gray-500">{alert.id}</span>
                <span className="text-gray-700">·</span>
                <span className="flex items-center gap-1 text-[10px] font-mono text-gray-500">
                  <Clock className="w-3 h-3" />
                  {new Date(alert.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              {/* Title */}
              <h2 className="text-[18px] font-semibold text-gray-100 leading-snug tracking-tight font-sans mb-2">
                {alert.type}
              </h2>

              {/* Description */}
              <p className="text-[13px] text-gray-400 leading-relaxed font-sans mb-3 max-w-[65ch]">
                {alert.description}
              </p>

              {/* Inline metadata */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-600 font-sans">Source</span>
                  <code className="text-[10px] font-mono text-blue-300/80 bg-blue-500/5 border border-blue-500/10 px-1.5 py-0.5 rounded">
                    {alert.source}
                  </code>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-600 font-sans">Score</span>
                  <span className="text-[10px] font-mono text-red-400">{alert.score} / 100</span>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={() => onInvestigate(alert)}
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
  onOpenAiPanel,
}: {
  briefing: string;
  onOpenAiPanel: () => void;
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

      <button
        onClick={onOpenAiPanel}
        className="ml-9 mt-3 flex items-center gap-1.5 text-[11px] text-violet-400 hover:text-violet-300 transition-colors font-medium cursor-pointer group"
      >
        Open full analysis
        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
      </button>
    </motion.section>
  );
}

// ─── 3. Active Investigations ────────────────────────────────────────────────

function ActiveInvestigations({
  investigations,
  onOpen,
}: {
  investigations: typeof ACTIVE_INVESTIGATIONS;
  onOpen: (a: Alert) => void;
}) {
  return (
    <motion.section {...fadeUp(0.18)}>
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-[13px] font-medium text-gray-300 font-sans">Active investigations</p>
        <span className="text-[10px] font-mono text-gray-600">
          {investigations.length} open
        </span>
      </div>

      <div className="divide-y divide-border-custom/15">
        {investigations.map((inv, i) => (
          <motion.button
            key={inv.id}
            {...fadeUp(0.2 + i * 0.04)}
            onClick={() => onOpen(inv.alert)}
            className="w-full flex items-center justify-between py-3.5 group transition-colors duration-120 text-left cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${severityDot(inv.alert.severity)} ${
                  inv.status === "active" ? "animate-pulse" : ""
                }`}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-mono text-gray-500">{inv.id}</span>
                  <Badge variant={severityVariant(inv.alert.severity)}>{inv.alert.severity}</Badge>
                </div>
                <p className="text-[13px] text-gray-200 font-medium font-sans truncate group-hover:text-white transition-colors">
                  {inv.title}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock className="w-2.5 h-2.5 text-gray-600" />
                  <span className="text-[10px] text-gray-500 font-mono">Updated {inv.updatedAt}</span>
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

// ─── 4. Suggested next action ─────────────────────────────────────────────────

function SuggestedNext({
  action,
  onTrigger,
}: {
  action: typeof SUGGESTED_NEXT;
  onTrigger: (a: Alert) => void;
}) {
  const [dismissed, setDismissed] = useState(false);

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="border border-border-custom/15 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-primary-blue/8 flex items-center justify-center shrink-0 mt-0.5">
              <Zap className="w-3 h-3 text-primary-blue" />
            </div>
            <div className="min-w-0 font-sans">
              <p className="text-[10px] text-primary-blue tracking-wide font-medium mb-1">Suggested next action</p>
              <p className="text-[13px] font-semibold text-gray-100">{action.label}</p>
              <p className="text-[12px] text-gray-500 mt-0.5 leading-relaxed">{action.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              onClick={() => setDismissed(true)}
              className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-elevated/40 cursor-pointer font-sans"
            >
              Dismiss
            </button>
            <button
              onClick={() => onTrigger(action.alert)}
              className="flex items-center gap-1.5 text-[11px] font-medium font-sans text-gray-200 border border-border-custom/30 bg-elevated/60 hover:bg-elevated hover:border-border-custom/60 px-3.5 py-1.5 rounded-lg transition-all duration-120 cursor-pointer group"
            >
              Open case
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── 5. Recent activity ──────────────────────────────────────────────────────

function RecentActivity({ items }: { items: typeof RECENT_ACTIVITY }) {
  return (
    <motion.section {...fadeUp(0.26)}>
      <p className="text-[13px] font-medium text-gray-300 font-sans mb-4">Recent activity</p>
      <div className="space-y-0 divide-y divide-border-custom/12">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
              <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${item.color}`} />
              <p className="text-[12px] text-gray-400 leading-relaxed flex-1 font-sans">{item.text}</p>
              <span className="text-[10px] text-gray-600 shrink-0 font-mono whitespace-nowrap">
                {item.time}
              </span>
            </div>
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
  onOpenAiPanel,
  isRefreshing,
}: DashboardProps) {
  const topAlert = MOCK_ALERTS.find((a) => a.severity === "critical") ?? MOCK_ALERTS[0];

  if (isRefreshing) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 pb-20 space-y-10">
      {/* Greeting */}
      <PageHeader />

      {/* 1 — Current highest priority investigation */}
      <PriorityInvestigation alert={topAlert} onInvestigate={onSelectAlert} />

      {/* Thin section divider */}
      <div className="border-t border-border-custom/12" />

      {/* 2 — Vector's briefing */}
      <VectorBriefing briefing={AI_BRIEFING} onOpenAiPanel={onOpenAiPanel} />

      <div className="border-t border-border-custom/12" />

      {/* 3 — Active investigations */}
      <ActiveInvestigations investigations={ACTIVE_INVESTIGATIONS} onOpen={onSelectAlert} />

      <div className="border-t border-border-custom/12" />

      {/* Bottom row: Suggested action + Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10">
        <div className="space-y-4">
          <SuggestedNext action={SUGGESTED_NEXT} onTrigger={onSelectAlert} />
        </div>
        <RecentActivity items={RECENT_ACTIVITY} />
      </div>
    </div>
  );
}
