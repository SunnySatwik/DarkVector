import { motion } from "motion/react";
import { Alert, Severity } from "../../types";
import { ContextEnrichment } from "../../api/types";
import {
  ChevronRight,
  X,
  Clock,
  ArrowLeft,
  Fingerprint,
  Activity,
  Target,
  Sparkles,
  Shield,
  Crosshair,
  FileText,
} from "lucide-react";
import { Badge, Skeleton } from "../ui/DesignSystem";
import { EventTimeline } from "./EventTimeline";
import { ProcessTree } from "./ProcessTree";
import { EvidenceAttributes } from "./EvidenceAttributes";
import { VectorPanel } from "./VectorPanel";
import { TimelinePanel } from "./TimelinePanel";
import { useTimeline } from "../../hooks/useInvestigations";
import {
  severityBadgeVariant,
  severityDotClass,
} from "../../lib/severity";

export interface WorkspaceViewProps {
  displayAlert: Alert;
  detectionSeverity: Severity;
  investigationId?: string;
  investigationStatus?: string;
  onUpdateStatus?: (status: string) => void;
  onOpenReport?: (investigationId: string) => void;
  analysisContext?: ContextEnrichment;
  openTabs: Alert[];
  onSelectAlert: (alert: Alert) => void;
  onCloseAlertTab: (alertId: string) => void;
  onCloseWorkspace: () => void;
  quarantineStatus: "active" | "quarantining" | "quarantined";
  quarantineProgress: number;
  isBlockApplied: boolean;
  handleIsolate: () => void;
  onBlockIp: () => void;
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
  relatedAlerts: Alert[];
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

// ─── Threat Intel reputation → badge variant ─────────────────────────────────
function reputationVariant(reputation: string): "critical" | "high" | "medium" | "low" | "default" {
  switch (reputation) {
    case "malicious":  return "critical";
    case "suspicious": return "high";
    case "clean":      return "success" as unknown as "low"; // reuse success styling
    default:           return "default";
  }
}

export default function WorkspaceView({
  displayAlert,
  detectionSeverity,
  investigationId,
  investigationStatus,
  onUpdateStatus,
  onOpenReport,
  analysisContext,
  openTabs,
  onSelectAlert,
  onCloseAlertTab,
  onCloseWorkspace,
  quarantineStatus,
  quarantineProgress,
  isBlockApplied,
  handleIsolate,
  onBlockIp,
  isPending,
  isError,
  refetch,
  relatedAlerts,
}: WorkspaceViewProps) {
  const { data: timeline, isPending: isTimelinePending } = useTimeline(investigationId);
  const showTimelinePending = isPending || (!!displayAlert.id && !investigationId) || isTimelinePending;

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
              const isActive = tab.id === displayAlert.id;
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

        {/* LEFT — Timeline */}
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
              <div className="flex items-center gap-3 mb-2 flex-wrap text-[10px] text-gray-500 font-sans">
                {isPending ? (
                  <Skeleton width={120} height={16} className="rounded-md animate-pulse-slow" />
                ) : (
                  <div className="flex items-center gap-2 bg-surface/30 border border-border-custom/10 px-2 py-0.5 rounded-md shrink-0">
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-gray-500 font-mono tracking-wide">Detection Severity:</span>
                      <Badge variant={severityBadgeVariant(detectionSeverity)}>{detectionSeverity}</Badge>
                    </div>
                    <span className="text-gray-600 font-mono">→</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-purple-400 font-mono tracking-wide">AI Assessment:</span>
                      <Badge variant={severityBadgeVariant(displayAlert.severity)}>{displayAlert.severity}</Badge>
                    </div>
                  </div>
                )}
                <span className="font-mono text-[10px] text-gray-600">|</span>
                <span className="font-mono text-[10px] text-gray-500">{displayAlert.id}</span>
                <span className="text-gray-700">·</span>
                <div className="flex items-center gap-1 font-sans shrink-0">
                  <span className="text-[9px] text-gray-500 font-mono tracking-wide">Status:</span>
                  {investigationId ? (
                    <select
                      value={investigationStatus}
                      onChange={(e) => onUpdateStatus?.(e.target.value)}
                      className="bg-black/40 border border-border-custom/50 hover:border-border-custom rounded-md px-1.5 py-0.5 text-[10px] font-mono text-gray-300 hover:text-white outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/20 cursor-pointer transition-colors duration-120"
                    >
                      <option value="NEW" className="bg-[#111317] text-gray-300">NEW</option>
                      <option value="INVESTIGATING" className="bg-[#111317] text-gray-300">INVESTIGATING</option>
                      <option value="CONTAINED" className="bg-[#111317] text-gray-300">CONTAINED</option>
                      <option value="RESOLVED" className="bg-[#111317] text-gray-300">RESOLVED</option>
                    </select>
                  ) : (
                    <Badge variant="default">NEW</Badge>
                  )}
                </div>
                {investigationId && onOpenReport && (
                  <>
                    <span className="text-gray-700">·</span>
                    <button
                      onClick={() => onOpenReport(investigationId)}
                      className="flex items-center gap-1.5 text-[10px] text-purple-400 hover:text-purple-300 font-mono transition-colors duration-120 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-purple-400" />
                      <span>View Report</span>
                    </button>
                  </>
                )}
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
                  I reviewed the signals from this source and found activity that doesn't match the expected behavior for this host. The combination of process lineage, network activity, and timing patterns pushed the score above the critical threshold.
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

              {/* ── MITRE ATT&CK ── */}
              {isPending ? (
                <div className="flex items-center gap-3 pt-1">
                  <Skeleton width={60} height={14} className="rounded animate-pulse-slow" />
                  <Skeleton width={120} height={14} className="rounded animate-pulse-slow" />
                  <Skeleton width={80} height={14} className="rounded animate-pulse-slow" />
                </div>
              ) : analysisContext?.mitre ? (
                <div className="flex items-baseline justify-between pt-1">
                  <div className="flex items-start gap-2">
                    <Crosshair className="w-3.5 h-3.5 text-blue-400/70 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] text-gray-600 font-sans mb-0.5">
                        MITRE ATT&amp;CK · {analysisContext.mitre.tactic}
                      </p>
                      <span className="text-[11px] font-mono text-blue-300/80">
                        {analysisContext.mitre.technique_id}
                      </span>
                      <span className="text-[10px] text-gray-400 ml-2 font-sans">
                        {analysisContext.mitre.technique_name}
                      </span>
                    </div>
                  </div>
                  <Badge variant="blue" className="shrink-0 ml-4">{analysisContext.mitre.tactic}</Badge>
                </div>
              ) : null}

              {/* ── Threat Intelligence ── */}
              {isPending ? (
                <div className="flex items-center gap-3 pt-1">
                  <Skeleton width={70} height={14} className="rounded animate-pulse-slow" />
                  <Skeleton width={150} height={14} className="rounded animate-pulse-slow" />
                </div>
              ) : analysisContext?.threat_intelligence ? (
                <div className="flex items-baseline justify-between pt-1">
                  <div className="flex items-start gap-2">
                    <Shield className="w-3.5 h-3.5 text-purple-400/70 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] text-gray-600 font-sans mb-0.5">
                        Threat Intelligence · {analysisContext.threat_intelligence.category}
                      </p>
                      <span className="text-[10px] text-gray-400 font-sans">
                        {analysisContext.threat_intelligence.summary}
                      </span>
                    </div>
                  </div>
                  <Badge
                    variant={reputationVariant(analysisContext.threat_intelligence.reputation) as "critical" | "high" | "medium" | "low" | "default"}
                    className="shrink-0 ml-4 capitalize"
                  >
                    {analysisContext.threat_intelligence.reputation}
                  </Badge>
                </div>
              ) : null}
            </section>

            {/* Investigation Timeline */}
            <div className="border-t border-border-custom/12 pt-6 mt-6">
              <TimelinePanel timeline={timeline} isPending={showTimelinePending} />
            </div>

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
            onBlockIp={onBlockIp}
            isAnalysisPending={isPending}
            isAnalysisError={isError}
            onRetryAnalysis={refetch}
            analysisContext={analysisContext}
            investigationId={investigationId}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
