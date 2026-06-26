/**
 * Mission Control — Overview Page
 *
 * This page answers one question: "What needs my attention right now?"
 * Internal name: Mission Control
 * Navigation label: Overview
 *
 * Design inspirations: Linear, Raycast, Cursor, Arc Browser
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MOCK_ALERTS, MOCK_USER_RISKS } from "../mockData";
import { Alert } from "../types";
import {
  ShieldAlert,
  ArrowRight,
  Clock,
  ChevronRight,
  Sparkles,
  FlameKindling,
  Activity,
  CornerDownRight,
  User,
  CheckCircle2,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { Card, Badge, Button, Skeleton } from "../components/ui/DesignSystem";

interface DashboardProps {
  onSelectAlert: (alert: Alert) => void;
  onOpenAiPanel: () => void;
  isRefreshing: boolean;
}

// ─── Static mock data for the Overview sections ──────────────────────────────

const ACTIVE_INVESTIGATIONS = [
  {
    id: "INV-042",
    title: "Container shell escape via kube-system",
    alert: MOCK_ALERTS[0],
    updatedAt: "2 min ago",
    status: "active" as const,
    analyst: "You",
  },
  {
    id: "INV-041",
    title: "Multi-source DB dump — finance cluster",
    alert: MOCK_ALERTS[1],
    updatedAt: "28 min ago",
    status: "active" as const,
    analyst: "You",
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
    color: "text-blue-400",
  },
  {
    id: "act-5",
    icon: AlertTriangle,
    text: "AL-7102 IAM privilege escalation under review",
    time: "2h ago",
    color: "text-yellow-400",
  },
];

const AI_SUMMARY =
  "Two critical incidents demand immediate attention. A container shell escape on **srv-k8s-api-01** has active C2 communication to a known malicious IP (194.26.135.84). Simultaneously, an anomalous 4.8 GB database dump is ongoing from the finance cluster. Recommend isolating `srv-k8s-api-01` and pausing egress on `db-finance-postgres` before the exfiltration window closes.";

const SUGGESTED_ACTION = {
  label: "Isolate srv-k8s-api-01",
  description: "Apply network quarantine to block active C2 channel",
  alert: MOCK_ALERTS[0],
};

// ─── Severity color helpers ───────────────────────────────────────────────────

function severityVariant(
  s: string
): "critical" | "high" | "medium" | "low" | "default" {
  if (s === "critical") return "critical";
  if (s === "high") return "high";
  if (s === "medium") return "medium";
  return "low";
}

function severityDot(s: string) {
  if (s === "critical") return "bg-red-500";
  if (s === "high") return "bg-orange-500";
  if (s === "medium") return "bg-yellow-500";
  return "bg-blue-400";
}

// ─── Small animation helper ───────────────────────────────────────────────────

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, delay, ease: [0.16, 1, 0.3, 1] as const },
});

// ─── AI Summary with typewriter reveal ───────────────────────────────────────

function AiSummaryCard({
  summary,
  onOpenAiPanel,
}: {
  summary: string;
  onOpenAiPanel: () => void;
}) {
  // Render inline bold markdown
  const parts = summary.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Card delay={0.18} className="col-span-full lg:col-span-2">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-100">
            Vector says
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            AI-generated situational summary · updated just now
          </p>
        </div>
      </div>

      <p className="text-[13px] leading-relaxed text-gray-300 font-sans">
        {parts.map((part, i) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return (
              <strong key={i} className="text-gray-100 font-semibold">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </p>

      <button
        onClick={onOpenAiPanel}
        className="mt-4 flex items-center gap-1.5 text-[11px] text-violet-400 hover:text-violet-300 transition-colors font-medium group"
      >
        Open full analysis
        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
      </button>
    </Card>
  );
}

// ─── Priority Alert Banner ────────────────────────────────────────────────────

function PriorityAlert({
  alert,
  onInvestigate,
}: {
  alert: Alert;
  onInvestigate: (a: Alert) => void;
}) {
  return (
    <motion.div
      {...fadeUp(0.06)}
      className="relative overflow-hidden rounded-xl border border-red-500/20 bg-gradient-to-r from-red-950/30 via-[#111317] to-[#111317] p-5"
    >
      {/* Subtle left accent */}
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-red-500 via-red-400 to-transparent rounded-full" />

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <FlameKindling className="w-4 h-4 text-red-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="critical">Critical</Badge>
              <span className="text-[10px] text-gray-500 font-mono">
                {alert.id}
              </span>
              <span className="text-[10px] text-gray-600">·</span>
              <span className="text-[10px] text-gray-500">
                {new Date(alert.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-gray-100 leading-snug">
              {alert.type}
            </h3>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              {alert.description}
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[10px] font-mono text-gray-500">
                Source:
              </span>
              <span className="text-[10px] font-mono text-blue-400 bg-blue-500/8 border border-blue-500/15 px-1.5 py-0.5 rounded">
                {alert.source}
              </span>
              <span className="text-[10px] text-gray-600">·</span>
              <span className="text-[10px] text-gray-500">
                Confidence {alert.score}%
              </span>
            </div>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => onInvestigate(alert)}
          className="shrink-0 whitespace-nowrap"
        >
          Investigate
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Active Investigations List ───────────────────────────────────────────────

function ActiveInvestigations({
  investigations,
  onOpen,
}: {
  investigations: typeof ACTIVE_INVESTIGATIONS;
  onOpen: (a: Alert) => void;
}) {
  return (
    <Card delay={0.1} hoverable={false} className="col-span-full lg:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-semibold text-gray-200">
            Active investigations
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Cases you're currently working
          </p>
        </div>
        <span className="text-[10px] font-mono text-gray-500 bg-[#161A22] border border-[#23262F]/80 px-2 py-0.5 rounded-md">
          {investigations.length} open
        </span>
      </div>

      <div className="space-y-2">
        {investigations.map((inv, i) => (
          <motion.div
            key={inv.id}
            {...fadeUp(0.12 + i * 0.05)}
            onClick={() => onOpen(inv.alert)}
            className="group flex items-center justify-between p-3 rounded-lg border border-[#23262F]/60 bg-black/20 hover:bg-[#161A22]/60 hover:border-gray-600/30 cursor-pointer transition-all duration-200"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-2 h-2 rounded-full shrink-0 ${severityDot(inv.alert.severity)} ${inv.status === "active" ? "animate-pulse" : ""}`}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-gray-500">
                    {inv.id}
                  </span>
                  <Badge variant={severityVariant(inv.alert.severity)}>
                    {inv.alert.severity}
                  </Badge>
                </div>
                <p className="text-xs text-gray-200 font-medium mt-0.5 truncate">
                  {inv.title}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Clock className="w-2.5 h-2.5 text-gray-600" />
                  <span className="text-[10px] text-gray-500">
                    Updated {inv.updatedAt}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-3">
              <CornerDownRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400 transition-colors" />
            </div>
          </motion.div>
        ))}
      </div>

      <button className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 text-[11px] text-gray-500 hover:text-gray-300 transition-colors rounded-lg hover:bg-[#161A22]/40 group">
        View all cases
        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
      </button>
    </Card>
  );
}

// ─── Recent Activity Feed ─────────────────────────────────────────────────────

function RecentActivity({
  items,
}: {
  items: typeof RECENT_ACTIVITY;
}) {
  return (
    <Card delay={0.14} hoverable={false}>
      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-200">Recent activity</p>
        <p className="text-[10px] text-gray-500 mt-0.5">
          Latest events across your environment
        </p>
      </div>

      <div className="space-y-0">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.id}
              {...fadeUp(0.16 + i * 0.04)}
              className="flex items-start gap-3 py-2.5 border-b border-[#23262F]/30 last:border-0"
            >
              <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${item.color}`} />
              <p className="text-[11px] text-gray-300 leading-relaxed flex-1">
                {item.text}
              </p>
              <span className="text-[10px] text-gray-600 shrink-0 whitespace-nowrap">
                {item.time}
              </span>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Suggested Next Action ────────────────────────────────────────────────────

function SuggestedAction({
  action,
  onTrigger,
}: {
  action: typeof SUGGESTED_ACTION;
  onTrigger: (a: Alert) => void;
}) {
  const [dismissed, setDismissed] = useState(false);

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-xl border border-[#23262F]/60 bg-gradient-to-br from-blue-950/20 via-[#111317] to-[#111317] p-4 col-span-full"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                <Zap className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-blue-400 font-medium">
                    Suggested action
                  </span>
                </div>
                <p className="text-xs font-semibold text-gray-100 mt-0.5">
                  {action.label}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {action.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-4">
              <button
                onClick={() => setDismissed(true)}
                className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-[#161A22]/60"
              >
                Dismiss
              </button>
              <Button
                size="sm"
                variant="primary"
                onClick={() => onTrigger(action.alert)}
              >
                Open case
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── User Risk Snapshot ───────────────────────────────────────────────────────

function RiskUsers() {
  const topRisks = MOCK_USER_RISKS.slice(0, 3);
  return (
    <Card delay={0.22} hoverable={false}>
      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-200">High-risk users</p>
        <p className="text-[10px] text-gray-500 mt-0.5">
          Accounts requiring attention
        </p>
      </div>
      <div className="space-y-3">
        {topRisks.map((user, i) => (
          <motion.div
            key={user.username}
            {...fadeUp(0.24 + i * 0.04)}
            className="flex items-center gap-3"
          >
            <img
              src={user.avatar}
              alt={user.username}
              className="w-7 h-7 rounded-full object-cover border border-[#23262F]/60 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-gray-200 truncate">
                {user.username.split("@")[0].replace("_", " ")}
              </p>
              <p className="text-[10px] text-gray-500 truncate">{user.role}</p>
            </div>
            <div className="text-right shrink-0">
              <span
                className={`text-xs font-bold ${
                  user.riskScore >= 80
                    ? "text-red-400"
                    : user.riskScore >= 60
                      ? "text-orange-400"
                      : "text-yellow-400"
                }`}
              >
                {user.riskScore}
              </span>
              <p className="text-[9px] text-gray-600 mt-0.5">risk</p>
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}

// ─── Page Header ──────────────────────────────────────────────────────────────

function PageHeader() {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const openAlerts = MOCK_ALERTS.filter(
    (a) => a.status === "open" || a.status === "investigating"
  );
  const criticalCount = openAlerts.filter((a) => a.severity === "critical").length;

  return (
    <motion.div {...fadeUp(0)} className="mb-8">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] text-gray-500 mb-1">{greeting}</p>
          <h1 className="text-2xl font-semibold text-gray-100 tracking-tight">
            What needs attention
          </h1>
        </div>

        {criticalCount > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.2 }}
            className="flex items-center gap-2 bg-red-500/8 border border-red-500/20 px-3 py-2 rounded-xl"
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-red-400 font-medium">
              {criticalCount} critical alert{criticalCount !== 1 ? "s" : ""} open
            </span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Loading Skeleton ──────────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-1 py-2 pb-16 space-y-6">
      {/* PageHeader Skeleton */}
      <div className="mb-8">
        <Skeleton width={80} height={10} className="mb-2" />
        <Skeleton width={220} height={26} />
      </div>

      {/* SuggestedAction Skeleton */}
      <div className="rounded-xl border border-[#23262F]/40 bg-[#111317] p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 w-2/3">
          <Skeleton circle width={28} height={28} className="shrink-0" />
          <div className="space-y-1.5 flex-1">
            <Skeleton width={100} height={10} />
            <Skeleton width="60%" height={12} />
            <Skeleton width="40%" height={10} />
          </div>
        </div>
        <Skeleton width={100} height={28} className="shrink-0 rounded-lg" />
      </div>

      {/* PriorityAlert Spotlight Skeleton */}
      <div className="space-y-2">
        <Skeleton width={90} height={10} />
        <div className="rounded-xl border border-[#23262F]/40 bg-[#111317] p-5 flex items-start justify-between">
          <div className="space-y-3 flex-1 max-w-2xl pr-4">
            <div className="flex items-center gap-2">
              <Skeleton width={60} height={18} className="rounded-md" />
              <Skeleton width={80} height={10} />
            </div>
            <Skeleton width="80%" height={20} />
            <Skeleton width="95%" height={14} />
            <Skeleton width="50%" height={14} />
          </div>
          <div className="w-24 text-right flex flex-col items-end gap-1.5 shrink-0">
            <Skeleton width={70} height={8} />
            <Skeleton width={45} height={32} />
            <Skeleton width={60} height={8} />
          </div>
        </div>
      </div>

      {/* Main 2-column Grid Skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Active Investigations Skeleton */}
        <div className="col-span-full lg:col-span-2 rounded-xl border border-[#23262F]/40 bg-[#111317] p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton width={120} height={12} />
              <Skeleton width={150} height={8} />
            </div>
            <Skeleton width={50} height={18} className="rounded-md" />
          </div>
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-[#23262F]/30 bg-black/10">
                <div className="flex items-center gap-3 flex-1">
                  <Skeleton circle width={16} height={16} className="shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton width={80} height={10} />
                    <Skeleton width="70%" height={12} />
                  </div>
                </div>
                <Skeleton width={16} height={16} className="rounded-full shrink-0 ml-3" />
              </div>
            ))}
          </div>
        </div>

        {/* Risk Users Skeleton */}
        <div className="rounded-xl border border-[#23262F]/40 bg-[#111317] p-4 space-y-4">
          <div className="space-y-1">
            <Skeleton width={100} height={12} />
            <Skeleton width={130} height={8} />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton circle width={28} height={28} className="shrink-0" />
                <div className="flex-1 space-y-1.5 min-w-0">
                  <Skeleton width="50%" height={11} />
                  <Skeleton width="30%" height={8} />
                </div>
                <div className="w-8 flex flex-col items-end gap-1 shrink-0">
                  <Skeleton width={20} height={12} />
                  <Skeleton width={25} height={8} />
                </div>
              </div>
            ))}
          </div>
        </div>
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
    // Mission Control — internal name for the Overview page
    <div className="max-w-5xl mx-auto px-1 py-2 pb-16 space-y-6">
      {/* Greeting + status header */}
      <PageHeader />

      {/* Suggested action banner — dismissible */}
      <SuggestedAction action={SUGGESTED_ACTION} onTrigger={onSelectAlert} />

      {/* Highest-priority alert spotlight */}
      <div>
        <p className="text-[10px] font-mono text-gray-600 mb-2 uppercase tracking-widest">
          Highest priority
        </p>
        <PriorityAlert alert={topAlert} onInvestigate={onSelectAlert} />
      </div>

      {/* Main two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Active investigations — takes 2/3 width */}
        <ActiveInvestigations
          investigations={ACTIVE_INVESTIGATIONS}
          onOpen={onSelectAlert}
        />

        {/* High-risk users — takes 1/3 width */}
        <RiskUsers />
      </div>

      {/* AI summary + recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Vector AI summary — 2/3 */}
        <AiSummaryCard summary={AI_SUMMARY} onOpenAiPanel={onOpenAiPanel} />

        {/* Recent activity — 1/3 */}
        <RecentActivity items={RECENT_ACTIVITY} />
      </div>
    </div>
  );
}
