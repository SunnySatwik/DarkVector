/**
 * InvestigationWorkspace
 *
 * The flagship three-column investigation environment.
 *
 *  Left   — Evidence timeline + event stream (224px)
 *  Center — Alert hero, process chain, evidence, related alerts (flex-1)
 *  Right  — Vector AI panel (288px)
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
  GitBranch,
  Fingerprint,
  Activity,
  Layers,
  Target,
  Sparkles,
} from "lucide-react";
import { Badge } from "../components/ui/DesignSystem";
import { EventTimeline } from "../components/workspace/EventTimeline";
import { EventStream } from "../components/workspace/EventStream";
import { ProcessTree } from "../components/workspace/ProcessTree";
import { EvidenceAttributes } from "../components/workspace/EvidenceAttributes";
import { VectorPanel } from "../components/workspace/VectorPanel";
import {
  severityBadgeVariant,
  severityDotClass,
  severityBorderClass,
} from "../lib/severity";

// ─── Props ────────────────────────────────────────────────────────────────────

interface InvestigationWorkspaceProps {
  activeAlert: Alert;
  openTabs: Alert[];
  onSelectAlert: (alert: Alert) => void;
  onCloseAlertTab: (alertId: string) => void;
  onCloseWorkspace: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.26, delay, ease: [0.16, 1, 0.3, 1] as const },
});

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
      transition={{ duration: 0.45, ease: "easeInOut" }}
      className="flex flex-col h-[calc(100vh-64px)] bg-bg overflow-hidden rounded-[22px] border border-border-custom/40"
    >
      {/* ── Focus-mode header strip ──────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between px-6 py-3 bg-surface/40 border-b border-border-custom/40">
        {/* Back + open tabs */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onCloseWorkspace}
            className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-200 transition-colors shrink-0 group cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Overview
          </button>

          <span className="text-gray-700 text-sm">·</span>

          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {openTabs.map((tab) => {
              const isActive = tab.id === activeAlert.id;
              return (
                <motion.div
                  key={tab.id}
                  layout
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] cursor-pointer shrink-0 transition-colors relative ${
                    isActive
                      ? "bg-elevated border border-border-custom text-gray-200"
                      : "text-gray-500 hover:text-gray-300 hover:bg-elevated/50"
                  }`}
                  onClick={() => onSelectAlert(tab)}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${severityDotClass(tab.severity)} ${
                      isActive ? "" : "opacity-60"
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

        {/* Status indicator */}
        <div className="flex items-center gap-3 shrink-0">
          {quarantineStatus === "quarantined" ? (
            <span className="flex items-center gap-1.5 text-[10px] text-red-400 font-medium font-sans">
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

      {/* ── Three-column body ─────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0 bg-bg">

        {/* LEFT — Evidence timeline + recent evidence */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.08, ease: "easeOut" }}
          className="w-64 shrink-0 bg-surface/30 border-r border-border-custom/40 flex flex-col overflow-hidden hidden md:flex"
        >
          <div className="flex-1 overflow-y-auto p-4 scrollbar-thin min-h-0 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-3.5 h-3.5 text-gray-500" />
              <p className="text-[10px] font-sans font-semibold text-gray-400 uppercase tracking-wider">Timeline</p>
            </div>
            <EventTimeline alert={activeAlert} />
          </div>

          <div className="border-t border-border-custom/40 p-4 overflow-y-auto max-h-[50%]">
            <div className="flex items-center gap-2 mb-3">
              <Fingerprint className="w-3.5 h-3.5 text-gray-500" />
              <p className="text-[10px] font-sans font-semibold text-gray-400 uppercase tracking-wider">Recent evidence</p>
            </div>
            <EvidenceAttributes alert={activeAlert} />
          </div>
        </motion.div>

        {/* CENTER — Document-style Incident Summary, Evidence list, AI Reasoning */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.16, ease: "easeOut" }}
          className="flex-1 overflow-y-auto p-8 scrollbar-thin space-y-8 min-h-0 min-w-0"
        >
          {/* 1. Incident Summary (What happened?) */}
          <div className="space-y-4 pb-6 border-b border-border-custom/40">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[11px] text-gray-500 flex-wrap font-sans">
                  <Badge variant={severityBadgeVariant(activeAlert.severity)}>
                    {activeAlert.severity}
                  </Badge>
                  <span className="font-mono text-gray-500">{activeAlert.id}</span>
                  <span className="text-gray-700">·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(activeAlert.timestamp).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <h1 className="text-2xl font-semibold text-gray-100 tracking-tight leading-snug">
                  {activeAlert.type}
                </h1>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-gray-500 font-sans uppercase tracking-wider">Risk score</p>
                <p className="text-4xl font-bold tabular-nums text-red-400 mt-1">{activeAlert.score}</p>
              </div>
            </div>

            <p className="text-sm text-gray-300 leading-relaxed font-sans max-w-3xl">
              {activeAlert.description}
            </p>

            <div className="flex items-center gap-4 text-xs pt-1 font-sans">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Source node:</span>
                <span className="font-mono text-blue-300 bg-blue-500/5 px-2 py-0.5 rounded border border-blue-500/10">
                  {activeAlert.source}
                </span>
              </div>
              {activeAlert.details.username && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Affected user:</span>
                  <span className="font-mono text-gray-300 bg-surface px-2 py-0.5 rounded border border-border-custom/50">
                    {activeAlert.details.username}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 2. Evidence (What evidence supports this?) */}
          <div className="space-y-4 py-2 border-b border-border-custom/40 pb-6">
            <div className="flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-200">Evidence attributes & process chain</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2">
              <div className="space-y-3">
                <p className="text-[10px] text-gray-500 font-sans font-semibold uppercase tracking-wider">Process execution chain</p>
                <ProcessTree alert={activeAlert} />
              </div>
              <div className="space-y-3">
                <p className="text-[10px] text-gray-500 font-sans font-semibold uppercase tracking-wider">Key metadata properties</p>
                <EvidenceAttributes alert={activeAlert} />
              </div>
            </div>
          </div>

          {/* 3. AI Explanation (Why was it flagged?) */}
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <h2 className="text-sm font-semibold text-gray-200">AI analysis & reasoning</h2>
            </div>
            <div className="space-y-4 text-xs font-sans text-gray-300 leading-relaxed max-w-3xl">
              <p>
                Vector has assessed the suspicious spawn indicators and correlated them against historical server configurations. The execution patterns match catalogued namespace manipulations and represent an active escape trajectory.
              </p>

              {/* SHAP contributing factors */}
              {activeAlert.details.shapFactors && activeAlert.details.shapFactors.length > 0 && (
                <div className="space-y-3 pt-2">
                  <p className="text-[10px] text-gray-500 font-sans font-semibold uppercase tracking-wider">Risk attribution factors (SHAP)</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeAlert.details.shapFactors.map((f, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-[11px] text-gray-400">
                          <span>{f.factor}</span>
                          <span className="font-mono">{(f.impact * 100).toFixed(0)}% influence</span>
                        </div>
                        <div className="w-full h-1 bg-surface border border-border-custom/40 rounded-full overflow-hidden">
                          <div
                            className="bg-violet-500/80 h-full rounded-full"
                            style={{ width: `${f.impact * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vulnerabilities Correlated */}
              <div className="pt-2">
                <p className="text-[10px] text-gray-500 font-sans font-semibold uppercase tracking-wider mb-2">Correlated vulnerabilities</p>
                <div className="bg-surface/50 border border-border-custom/40 rounded-xl p-3 flex justify-between items-center gap-4">
                  <div>
                    <span className="text-[11px] text-blue-300 font-mono">CVE-2022-0847 (Dirty Pipe)</span>
                    <p className="text-[10px] text-gray-500 mt-0.5">85% match on privilege escalation trajectory</p>
                  </div>
                  <Badge variant="purple">92% similarity</Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Related alerts */}
          {relatedAlerts.length > 0 && (
            <div className="border-t border-border-custom/40 pt-6 mt-8 space-y-3">
              <div className="flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-gray-500" />
                <h3 className="text-xs font-semibold text-gray-400 font-sans">Related incidents</h3>
                <span className="text-[10px] text-gray-600">· same category</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-sans">
                {relatedAlerts.map((related) => (
                  <button
                    key={related.id}
                    onClick={() => onSelectAlert(related)}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-border-custom/40 hover:border-gray-500/20 hover:bg-elevated/40 transition-all text-left cursor-pointer"
                  >
                    <div className="min-w-0">
                      <span className="text-[9px] font-mono text-gray-500">{related.id}</span>
                      <p className="text-[10px] text-gray-300 truncate font-mono mt-0.5">{related.type}</p>
                    </div>
                    <ChevronRight className="w-3 h-3 text-gray-600 shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* RIGHT — Vector AI actions & conversation */}
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.22, ease: "easeOut" }}
          className="w-72 shrink-0 bg-surface/30 border-l border-border-custom/40 flex flex-col overflow-hidden hidden lg:flex"
        >
          <VectorPanel
            alert={activeAlert}
            quarantineStatus={quarantineStatus}
            quarantineProgress={quarantineProgress}
            isBlockApplied={isBlockApplied}
            onIsolate={handleIsolate}
            onBlockIp={() => setIsBlockApplied(true)}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
