/**
 * InvestigationWorkspace
 *
 * Premium three-column investigation environment.
 *
 *  Left   — Timeline + evidence log          (w-56, 224px)
 *  Center — Incident hero, evidence, reasoning (flex-1, max-w-2xl centered)
 *  Right  — Vector AI panel                   (w-64, 256px)
 *
 * Design principles:
 * — Whitespace defines sections, not borders.
 * — The incident title is the visual hero.
 * — Evidence reads like a professional case file.
 * — Vector feels integrated, not floating.
 */

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Alert } from "../types";
import { MOCK_ALERTS } from "../mockData";
import {
  ChevronRight,
  X,
  Clock,
  ArrowLeft,
  Fingerprint,
  Activity,
  Target,
  Sparkles,
  Layers,
} from "lucide-react";
import { Badge, Skeleton } from "../components/ui/DesignSystem";
import { useAnalysis } from "../hooks/useAnalysis";
import { EventTimeline } from "../components/workspace/EventTimeline";
import { EventStream } from "../components/workspace/EventStream";
import { ProcessTree } from "../components/workspace/ProcessTree";
import { EvidenceAttributes } from "../components/workspace/EvidenceAttributes";
import { VectorPanel } from "../components/workspace/VectorPanel";
import {
  severityBadgeVariant,
  severityDotClass,
} from "../lib/severity";

// ─── Props ────────────────────────────────────────────────────────────────────

interface InvestigationWorkspaceProps {
  activeAlert: Alert;
  openTabs: Alert[];
  onSelectAlert: (alert: Alert) => void;
  onCloseAlertTab: (alertId: string) => void;
  onCloseWorkspace: () => void;
}

// ─── Animation helpers ────────────────────────────────────────────────────────

const fadeIn = (delay = 0) => ({
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.24, delay, ease: [0.16, 1, 0.3, 1] as const },
});

// ─── Section label ────────────────────────────────────────────────────────────

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
      <h2 className="text-[11px] font-sans font-medium text-gray-500 tracking-wide">
        {children}
      </h2>
    </div>
  );
}

// ─── Root Component ───────────────────────────────────────────────────────────

export default function InvestigationWorkspace({
  activeAlert,
  openTabs,
  onSelectAlert,
  onCloseAlertTab,
  onCloseWorkspace,
}: InvestigationWorkspaceProps) {
  const [quarantineStatus, setQuarantineStatus] = useState<
    "active" | "quarantining" | "quarantined"
  >("active");
  const [quarantineProgress, setQuarantineProgress] = useState(0);
  const [isBlockApplied, setIsBlockApplied] = useState(false);

  const { data: analysisData, isPending, isError, refetch } = useAnalysis(activeAlert);

  const displayAlert = analysisData
    ? {
      ...activeAlert,
      score: analysisData.analysis.risk_score,
      severity: analysisData.analysis.severity.toLowerCase() as any,
    }
    : activeAlert;

  // Reset remediation state when the active alert changes
  useEffect(() => {
    setQuarantineStatus("active");
    setQuarantineProgress(0);
    setIsBlockApplied(false);
  }, [activeAlert.id]);

  const handleIsolate = () => {
    setQuarantineStatus("quarantining");
    setQuarantineProgress(0);
    const interval = setInterval(() => {
      setQuarantineProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setQuarantineStatus("quarantined");
          return 100;
        }
        return prev + 20;
      });
    }, 220);
  };

  const relatedAlerts = MOCK_ALERTS.filter(
    (a) => a.id !== activeAlert.id && a.category === activeAlert.category
  ).slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex flex-col h-[calc(100vh-64px)] bg-bg overflow-hidden"
    >
      {/* ── Tab bar / breadcrumb ───────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between px-5 py-2.5 border-b border-border-custom/18 bg-surface/20">
        {/* Back + open tabs */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onCloseWorkspace}
            className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-300 transition-colors shrink-0 group cursor-pointer"
          >
            <ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform duration-120" />
            Overview
          </button>

          <span className="text-gray-700 text-xs select-none">/</span>

          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {openTabs.map((tab) => {
              const isActive = tab.id === activeAlert.id;
              return (
                <motion.div
                  key={tab.id}
                  layout
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] cursor-pointer shrink-0 transition-colors duration-120 ${isActive
                    ? "bg-elevated border border-border-custom/40 text-gray-200"
                    : "text-gray-500 hover:text-gray-300 hover:bg-elevated/30"
                    }`}
                  onClick={() => onSelectAlert(tab)}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${severityDotClass(tab.severity)} ${isActive ? "" : "opacity-50"
                      }`}
                  />
                  <span className="font-mono">{tab.id}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseAlertTab(tab.id);
                    }}
                    className="text-gray-600 hover:text-gray-300 transition-colors ml-0.5 cursor-pointer"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Live status indicator */}
        <div className="shrink-0">
          {quarantineStatus === "quarantined" ? (
            <span className="flex items-center gap-1.5 text-[10px] text-red-400 font-sans">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              Node isolated
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-sans">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          )}
        </div>
      </div>

      {/* ── Three-column body ──────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0 w-full">

        {/* LEFT — Timeline + Event log */}
        <motion.div
          {...fadeIn(0.06)}
          className="hidden md:flex flex-col shrink-0 grow-0 md:w-[22%] xl:w-[20%] 2xl:w-[18%] border-r border-border-custom/15 overflow-hidden"
        >
          {/* Timeline section */}
          <div className="flex-1 overflow-y-auto p-4 scrollbar-thin min-h-0">
            <div className="flex items-center gap-1.5 mb-3">
              <Activity className="w-3.5 h-3.5 text-gray-500" />
              <h2 className="text-[11px] font-sans font-medium text-gray-500">Timeline</h2>
            </div>
            <EventTimeline alert={displayAlert} />
          </div>

          {/* Event log section */}
          <div className="border-t border-border-custom/15 p-4 overflow-y-auto max-h-[44%] scrollbar-thin">
            <div className="flex items-center gap-1.5 mb-3">
              <Layers className="w-3.5 h-3.5 text-gray-500" />
              <h2 className="text-[11px] font-sans font-medium text-gray-500">Event log</h2>
            </div>
            <EventStream alert={displayAlert} />
          </div>
        </motion.div>

        {/* CENTER — Investigation document */}
        <motion.div
          {...fadeIn(0.14)}
          className="flex-1 overflow-y-auto scrollbar-thin min-h-0 min-w-0"
        >
          {/* Constrain content width for readability */}
          <div className="max-w-2xl mx-auto px-8 py-8">

            {/* ── 1. Incident hero — What happened? ─────────────────────── */}
            <section className="space-y-4">
              {/* Meta row */}
              <div className="flex items-center gap-2 mb-2 flex-wrap h-[18px]">
                {isPending ? (
                  <Skeleton width={48} height={16} className="rounded-md animate-pulse-slow" />
                ) : (
                  <Badge variant={severityBadgeVariant(displayAlert.severity)}>
                    {displayAlert.severity}
                  </Badge>
                )}
                <span className="font-mono text-[10px] text-gray-500">{displayAlert.id}</span>
                <span className="text-gray-700">·</span>
                <span className="flex items-center gap-1 text-[10px] text-gray-500 font-sans">
                  <Clock className="w-3 h-3" />
                  {new Date(displayAlert.timestamp).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              {/* Hero title */}
              <h1 className="text-[22px] font-sans font-semibold text-gray-100 tracking-tight leading-tight mb-3">
                {displayAlert.type}
              </h1>

              {/* Description */}
              <p className="text-[13px] text-gray-400 leading-relaxed font-sans mb-4 max-w-[72ch]">
                {displayAlert.description}
              </p>

              {/* Source/user inline */}
              <div className="flex items-center gap-4 text-[11px] font-sans flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-600">Source</span>
                  <code className="font-mono text-blue-300/80 bg-blue-500/5 px-1.5 py-0.5 rounded text-[10px]">
                    {displayAlert.source}
                  </code>
                </div>
                {displayAlert.details.username && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-600">User</span>
                    <code className="font-mono text-gray-400 bg-surface/60 px-1.5 py-0.5 rounded text-[10px]">
                      {displayAlert.details.username}
                    </code>
                  </div>
                )}
                <div className="flex items-center gap-1.5 h-[14px]">
                  <span className="text-gray-600">Score</span>
                  {isPending ? (
                    <Skeleton width={40} height={12} className="rounded animate-pulse-slow" />
                  ) : (
                    <span className="font-mono text-red-400 text-[10px]">
                      {displayAlert.score} / 100
                    </span>
                  )}
                </div>
              </div>
            </section>

            {/* ── 2. Evidence — What supports this? ─────────────────────── */}
            <section className="border-t border-border-custom/12 pt-6 mt-6 space-y-4">
              <SectionLabel icon={Fingerprint}>Evidence</SectionLabel>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] text-gray-600 font-sans mb-2.5">Process chain</p>
                  <ProcessTree alert={displayAlert} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-600 font-sans mb-2.5">Key attributes</p>
                  <EvidenceAttributes alert={displayAlert} />
                </div>
              </div>
            </section>

            {/* ── 3. Reasoning — Why was it flagged? ────────────────────── */}
            <section className="border-t border-border-custom/12 pt-6 mt-6 space-y-4">
              <SectionLabel icon={Sparkles}>AI reasoning</SectionLabel>

              {isPending ? (
                <div className="space-y-2 max-w-[72ch] py-1 h-[54px] flex flex-col justify-center">
                  <Skeleton width="100%" height={12} className="animate-pulse-slow" />
                  <Skeleton width="95%" height={12} className="animate-pulse-slow" />
                  <Skeleton width="60%" height={12} className="animate-pulse-slow" />
                </div>
              ) : isError ? (
                <div className="text-[13px] text-red-400/90 font-sans flex items-center gap-2 h-[54px]">
                  <span>Failed to load analysis.</span>
                  <button
                    onClick={() => refetch()}
                    className="text-violet-400 hover:text-violet-300 underline cursor-pointer font-medium"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <p className="text-[13px] text-gray-400 leading-relaxed font-sans max-w-[72ch]">
                  Vector has assessed the suspicious spawn indicators and correlated them
                  against historical server configurations. The execution patterns match
                  catalogued namespace manipulations and represent an active escape trajectory.
                </p>
              )}

              {/* SHAP factors */}
              {displayAlert.details.shapFactors &&
                displayAlert.details.shapFactors.length > 0 && (
                  <div className="space-y-2.5">
                    <p className="text-[10px] text-gray-600 font-sans">Risk attribution (SHAP)</p>
                    <div className="space-y-2">
                      {displayAlert.details.shapFactors.map((f, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between items-baseline">
                            <span className="text-[11px] text-gray-500 font-sans">{f.factor}</span>
                            <span className="text-[10px] font-mono text-gray-600">
                              {(f.impact * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full h-px bg-border-custom/30 rounded-full overflow-hidden">
                            <motion.div
                              className="bg-violet-500/50 h-full rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${f.impact * 100}%` }}
                              transition={{ duration: 0.5, delay: i * 0.07, ease: "easeOut" }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Correlated vulnerability — inline, not in a card */}
              <div className="flex items-baseline justify-between pt-1">
                <div>
                  <p className="text-[10px] text-gray-600 font-sans mb-0.5">
                    Correlated vulnerability
                  </p>
                  <span className="text-[11px] font-mono text-blue-300/80">
                    CVE-2022-0847 (Dirty Pipe)
                  </span>
                  <span className="text-[10px] text-gray-600 ml-2">
                    — 85% match on privilege escalation trajectory
                  </span>
                </div>
                <Badge variant="purple" className="shrink-0 ml-4">92% similarity</Badge>
              </div>
            </section>

            {/* ── 4. Related incidents ───────────────────────────────────── */}
            {relatedAlerts.length > 0 && (
              <section className="border-t border-border-custom/12 pt-6 mt-6 space-y-3">
                <div className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-gray-500" />
                  <h2 className="text-[11px] font-sans font-medium text-gray-500">Related incidents</h2>
                  <span className="text-[10px] text-gray-700">· same category</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {relatedAlerts.map((related) => (
                    <button
                      key={related.id}
                      onClick={() => onSelectAlert(related)}
                      className="flex items-center justify-between px-3 py-2 rounded-lg border border-border-custom/15 hover:border-border-custom/30 hover:bg-elevated/20 transition-all duration-120 text-left cursor-pointer group"
                    >
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono text-gray-500 block">
                          {related.id}
                        </span>
                        <p className="text-[11px] text-gray-400 truncate font-sans mt-0.5">
                          {related.type}
                        </p>
                      </div>
                      <ChevronRight className="w-3 h-3 text-gray-600 shrink-0 ml-2 group-hover:text-gray-400 transition-colors" />
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Bottom breathing room */}
            <div className="h-6" />
          </div>
        </motion.div>

        {/* RIGHT — Vector AI panel */}
        <motion.div
          {...fadeIn(0.22)}
          className="hidden lg:flex flex-col shrink-0 grow-0 lg:w-[25%] xl:w-[26%] 2xl:w-[26%] border-l border-border-custom/15 overflow-hidden"
        >
          <VectorPanel
            alert={displayAlert}
            quarantineStatus={quarantineStatus}
            quarantineProgress={quarantineProgress}
            isBlockApplied={isBlockApplied}
            onIsolate={handleIsolate}
            onBlockIp={() => setIsBlockApplied(true)}
            isAnalysisPending={isPending}
            isAnalysisError={isError}
            onRetryAnalysis={refetch}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
