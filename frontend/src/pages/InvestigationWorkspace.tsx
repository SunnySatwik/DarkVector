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
      className="flex flex-col h-[calc(100vh-64px)] bg-[#09090B] overflow-hidden rounded-xl border border-[#23262F]/60"
    >
      {/* ── Focus-mode header strip ──────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2.5 bg-[#0d0f13] border-b border-[#23262F]/50">
        {/* Back + open tabs */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onCloseWorkspace}
            className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-200 transition-colors shrink-0 group"
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
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] cursor-pointer shrink-0 transition-colors relative ${
                    isActive
                      ? "bg-[#161A22] border border-[#2a2e3a] text-gray-200"
                      : "text-gray-500 hover:text-gray-300 hover:bg-[#161A22]/50"
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
                    className="text-gray-600 hover:text-gray-300 transition-colors ml-0.5"
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
            <span className="flex items-center gap-1.5 text-[10px] text-red-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              Node isolated
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[10px] text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          )}
        </div>
      </div>

      {/* ── Three-column body ─────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* LEFT — Evidence timeline + event stream */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.08, ease: "easeOut" }}
          className="w-56 shrink-0 bg-[#0d0f13] border-r border-[#23262F]/40 flex flex-col overflow-hidden hidden md:flex"
        >
          <div className="flex-1 overflow-y-auto p-4 scrollbar-thin min-h-0">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-3.5 h-3.5 text-gray-500" />
              <p className="text-[10px] font-medium text-gray-400">Timeline</p>
            </div>
            <EventTimeline alert={activeAlert} />
          </div>

          <div className="border-t border-[#23262F]/40 px-4 py-3">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-3.5 h-3.5 text-gray-500" />
              <p className="text-[10px] font-medium text-gray-400">Event stream</p>
            </div>
            <EventStream alert={activeAlert} />
          </div>
        </motion.div>

        {/* CENTER — Alert hero + process chain + evidence + related alerts */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.16, ease: "easeOut" }}
          className="flex-1 overflow-y-auto p-6 scrollbar-thin space-y-5 min-h-0 min-w-0"
        >

          {/* Alert hero */}
          <div
            className={`rounded-xl border ${severityBorderClass(activeAlert.severity)} bg-gradient-to-b from-[#111317] to-[#0d0f13] p-5`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={severityBadgeVariant(activeAlert.severity)}>
                    {activeAlert.severity}
                  </Badge>
                  <span className="text-[10px] font-mono text-gray-500">{activeAlert.id}</span>
                  <span className="text-gray-700">·</span>
                  <span className="text-[10px] text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(activeAlert.timestamp).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-gray-100 leading-snug">
                  {activeAlert.type}
                </h2>
                <p className="text-sm text-gray-400 mt-1.5 leading-relaxed max-w-2xl">
                  {activeAlert.description}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-[10px] text-gray-500">Source</span>
                  <span className="text-[11px] font-mono text-blue-300 bg-blue-500/8 border border-blue-500/15 px-2 py-0.5 rounded">
                    {activeAlert.source}
                  </span>
                  {activeAlert.details.username && (
                    <>
                      <span className="text-gray-700">·</span>
                      <span className="text-[11px] font-mono text-gray-300">
                        {activeAlert.details.username}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="text-[9px] text-gray-600 mb-1">Anomaly score</p>
                <p
                  className={`text-3xl font-semibold tabular-nums ${
                    activeAlert.score >= 85
                      ? "text-red-400"
                      : activeAlert.score >= 70
                        ? "text-orange-400"
                        : "text-yellow-400"
                  }`}
                >
                  {activeAlert.score}
                </p>
                <p className="text-[9px] text-gray-600">out of 100</p>
              </div>
            </div>
          </div>

          {/* Process chain + Evidence */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div
              className="bg-[#111317] border border-[#23262F]/60 rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-4">
                <GitBranch className="w-3.5 h-3.5 text-gray-500" />
                <p className="text-xs font-medium text-gray-300">Process chain</p>
              </div>
              <ProcessTree alert={activeAlert} />
            </div>

            <div
              className="bg-[#111317] border border-[#23262F]/60 rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-4">
                <Fingerprint className="w-3.5 h-3.5 text-gray-500" />
                <p className="text-xs font-medium text-gray-300">Evidence</p>
              </div>
              <EvidenceAttributes alert={activeAlert} />
            </div>
          </div>

          {/* Related alerts */}
          {relatedAlerts.length > 0 && (
            <div
              className="bg-[#111317] border border-[#23262F]/60 rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-3.5 h-3.5 text-gray-500" />
                <p className="text-xs font-medium text-gray-300">Related alerts</p>
                <span className="text-[9px] text-gray-600">· same category</span>
              </div>
              <div className="space-y-2">
                {relatedAlerts.map((related) => (
                  <button
                    key={related.id}
                    onClick={() => onSelectAlert(related)}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg border border-[#23262F]/40 hover:border-gray-600/30 hover:bg-[#161A22]/40 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${severityDotClass(
                          related.severity
                        )}`}
                      />
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono text-gray-500">{related.id}</span>
                        <p className="text-[11px] text-gray-300 truncate">{related.type}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* RIGHT — Vector AI panel */}
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.22, ease: "easeOut" }}
          className="w-72 shrink-0 bg-[#0d0f13] border-l border-[#23262F]/40 flex flex-col overflow-hidden hidden lg:flex"
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
