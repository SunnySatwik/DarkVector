import { motion } from "motion/react";
import { Alert, Severity } from "../../types";
import { parseUtcDate } from "../../lib/timeFormatter";

import { ContextEnrichment, TimelineEvent } from "../../api/types";
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
  AlertCircle,
  CheckCircle,
  Terminal,
  Copy,
  Check,
  ShieldCheck,
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
  severityBadgeClass,
} from "../../lib/severity";
import { WorkspaceViewModel } from "../../lib/workspaceMapper";
import { useState } from "react";

export interface WorkspaceViewProps {
  viewModel?: WorkspaceViewModel | null;
  displayAlert?: Alert;
  detectionSeverity?: Severity;
  investigationId?: string;
  investigationStatus?: string;
  onUpdateStatus?: (status: string) => void;
  onOpenReport?: (investigationId: string) => void;
  analysisContext?: ContextEnrichment;
  openTabs?: Alert[];
  onSelectAlert?: (alert: Alert) => void;
  onCloseAlertTab?: (alertId: string) => void;
  onCloseWorkspace: () => void;
  quarantineStatus?: "active" | "quarantining" | "quarantined";
  quarantineProgress?: number;
  isBlockApplied?: boolean;
  handleIsolate?: () => void;
  onBlockIp?: () => void;
  isPending?: boolean;
  isError?: boolean;
  refetch: () => void;
  relatedAlerts?: Alert[];
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
      <h2 className="text-[11px] font-sans font-medium text-gray-500 tracking-wide uppercase">
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

// ─── Behavioral Subcomponents ───────────────────────────────────────────────

export function BehavioralDetectionFindings({
  detections,
  primaryDetection,
}: {
  detections: any[];
  primaryDetection: any | null;
}) {
  return (
    <div className="space-y-3">
      {detections.map((det) => {
        const isPrimary = primaryDetection && det.id === primaryDetection.id;
        return (
          <div
            key={det.id}
            className={`p-3.5 rounded-lg border transition-all duration-120 flex flex-col gap-2 ${
              isPrimary
                ? "bg-violet-950/15 border-violet-500/30 shadow shadow-violet-500/5"
                : "bg-surface/30 border-border-custom/15 hover:border-border-custom/30"
            }`}
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {isPrimary ? (
                  <AlertCircle className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                ) : (
                  <CheckCircle className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                )}
                <span className="text-xs font-semibold text-gray-200 font-sans">
                  {det.title}
                </span>
                {isPrimary && (
                  <span className="text-[9px] font-sans px-1.5 py-0.2 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded font-semibold">
                    Primary Detection
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[9px] font-mono">
                <span className="text-gray-500 font-sans">Confidence:</span>
                <span className="text-gray-300 font-semibold">{det.confidence}%</span>
              </div>
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed font-sans pr-2">
              {det.description}
            </p>

            <div className="flex items-center gap-3 text-[10px] font-sans text-gray-500 flex-wrap pt-1.5 border-t border-border-custom/5">
              <div className="flex items-center gap-1">
                <span className="text-gray-600 font-mono">Rule:</span>
                <span className="font-mono text-gray-400">{det.rule_id}</span>
              </div>
              {det.host_id && (
                <div className="flex items-center gap-1">
                  <span className="text-gray-600 font-sans">Host:</span>
                  <span className="font-mono text-gray-400">{det.host_id}</span>
                </div>
              )}
              {det.mitre_technique && (
                <div className="flex items-center gap-1">
                  <span className="text-gray-600 font-sans">MITRE:</span>
                  <span className="font-mono text-purple-400">{det.mitre_technique}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <span className="text-gray-600 font-sans">Severity:</span>
                <span className={`font-semibold capitalize ${
                  det.severity === "critical" ? "text-red-400" :
                  det.severity === "high" ? "text-orange-400" :
                  det.severity === "medium" ? "text-yellow-400" : "text-blue-400"
                }`}>{det.severity}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CorrelationSummary({ correlation }: { correlation: any }) {
  const durationText = correlation.duration === 0 ? "Instantaneous trigger" : `${correlation.duration.toFixed(1)}s elapsed`;
  return (
    <div className="bg-surface/20 border border-border-custom/20 rounded-xl p-4 space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="bg-black/20 border border-border-custom/10 rounded-lg p-2.5 flex flex-col justify-center">
          <span className="text-[9px] font-sans text-gray-500 uppercase tracking-wider mb-1">Group Size</span>
          <span className="text-xs font-mono font-bold text-violet-400">{correlation.number_of_detections} Detections</span>
        </div>
        <div className="bg-black/20 border border-border-custom/10 rounded-lg p-2.5 flex flex-col justify-center">
          <span className="text-[9px] font-sans text-gray-500 uppercase tracking-wider mb-1">Time Span</span>
          <span className="text-xs font-mono font-bold text-gray-300">{durationText}</span>
        </div>
        <div className="bg-black/20 border border-border-custom/10 rounded-lg p-2.5 flex flex-col justify-center">
          <span className="text-[9px] font-sans text-gray-500 uppercase tracking-wider mb-1">Aggregate Risk</span>
          <span className="text-xs font-mono font-bold text-red-400">{correlation.aggregate_confidence.toFixed(1)}% Max</span>
        </div>
        <div className="bg-black/20 border border-border-custom/10 rounded-lg p-2.5 flex flex-col justify-center">
          <span className="text-[9px] font-sans text-gray-500 uppercase tracking-wider mb-1">Severity</span>
          <span className="text-xs font-mono font-bold uppercase text-orange-400">{correlation.aggregate_severity}</span>
        </div>
      </div>

      <div className="space-y-2 text-[11px] font-sans text-gray-400 pl-1">
        {correlation.mitre_techniques && correlation.mitre_techniques.length > 0 && (
          <div className="flex gap-2 items-start">
            <span className="text-gray-600 font-mono w-20 shrink-0">Techniques:</span>
            <div className="flex flex-wrap gap-1">
              {correlation.mitre_techniques.map((t: string) => (
                <span key={t} className="font-mono text-purple-400 bg-purple-500/5 px-1.5 py-0.2 rounded border border-purple-500/10 text-[9px]">{t}</span>
              ))}
            </div>
          </div>
        )}
        {correlation.mitre_tactics && correlation.mitre_tactics.length > 0 && (
          <div className="flex gap-2 items-start">
            <span className="text-gray-600 font-mono w-20 shrink-0">Tactics:</span>
            <span className="text-gray-300 font-semibold">{correlation.mitre_tactics.join(", ")}</span>
          </div>
        )}
        {correlation.involved_process_guids && correlation.involved_process_guids.length > 0 && (
          <div className="flex gap-2 items-start">
            <span className="text-gray-600 font-mono w-20 shrink-0">Processes:</span>
            <span className="text-gray-300 font-mono">{correlation.involved_process_guids.length} unique GUID(s)</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function ProcessEvidencePanel({ processes }: { processes: any[] }) {
  const [copiedGuid, setCopiedGuid] = useState<string | null>(null);

  const handleCopyCmd = (cmd: string | string[], guid: string) => {
    const text = Array.isArray(cmd) ? cmd.join(" ") : String(cmd);
    navigator.clipboard.writeText(text);
    setCopiedGuid(guid);
    setTimeout(() => setCopiedGuid(null), 2000);
  };

  return (
    <div className="space-y-3.5 font-mono">
      {processes.map((proc) => {
        const cmdText = proc.cmdline
          ? (Array.isArray(proc.cmdline) ? proc.cmdline.join(" ") : proc.cmdline)
          : "";
        return (
          <div
            key={proc.process_guid}
            className="p-3.5 bg-[#111317]/50 border border-border-custom/15 rounded-lg space-y-2.5 text-[11px] leading-relaxed"
          >
            <div className="flex items-center justify-between border-b border-border-custom/5 pb-1.5 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-gray-200 font-bold">
                  {proc.process_name || "Unknown process"}
                </span>
              </div>
              <span className="text-[10px] text-gray-600 font-sans truncate max-w-[200px]" title={proc.process_guid}>
                GUID: {proc.process_guid.slice(-16)}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-gray-400 font-sans">
              {proc.pid !== null && (
                <div>
                  <span className="text-gray-600 font-mono">PID:</span>{" "}
                  <span className="font-mono text-gray-300">{proc.pid}</span>
                </div>
              )}
              {proc.ppid !== null && (
                <div>
                  <span className="text-gray-600 font-mono">PPID:</span>{" "}
                  <span className="font-mono text-gray-300">{proc.ppid}</span>
                </div>
              )}
              {proc.username && (
                <div>
                  <span className="text-gray-600 font-mono">User:</span>{" "}
                  <span className="font-mono text-gray-300">{proc.username}</span>
                </div>
              )}
            </div>

            {proc.executable && (
              <div className="space-y-0.5">
                <span className="text-[9px] text-gray-600 font-sans uppercase">Executable</span>
                <div className="text-[10px] bg-black/30 border border-border-custom/10 p-1.5 rounded text-gray-400 break-all select-all">
                  {proc.executable}
                </div>
              </div>
            )}

            {cmdText && (
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-gray-600 font-sans uppercase">Command Line</span>
                  <button
                    onClick={() => handleCopyCmd(cmdText, proc.process_guid)}
                    className="text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1 cursor-pointer font-sans text-[10px] border border-transparent hover:border-border-custom/10 px-1 py-0.2 rounded"
                  >
                    {copiedGuid === proc.process_guid ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="text-[10px] bg-black/40 border border-border-custom/15 p-2 rounded text-gray-300 break-all font-mono leading-relaxed select-all">
                  {cmdText}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function MitreAssessment({ mappings }: { mappings: any[] }) {
  return (
    <div className="space-y-3.5">
      {mappings.map((m) => (
        <div key={m.technique_id} className="flex gap-3 items-start">
          <Crosshair className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold text-purple-400">{m.technique_id}</span>
              {m.tactic && (
                <span className="text-[9px] font-sans bg-purple-500/10 border border-purple-500/20 text-purple-400 px-1.5 py-0.2 rounded font-semibold">{m.tactic}</span>
              )}
            </div>
            <h4 className="text-xs font-semibold text-gray-200 font-sans mt-1">
              {m.technique_name}
            </h4>
            <p className="text-[11px] text-gray-400 leading-relaxed font-sans mt-1.5">
              {m.description}
            </p>
          </div>
        </div>
      ))}
      {mappings.length === 0 && (
        <p className="text-xs text-gray-500 font-sans italic text-center py-2">
          No MITRE ATT&CK techniques mapped to this behavioral run.
        </p>
      )}
    </div>
  );
}

export function InvestigationRecommendations({ recommendations }: { recommendations: string[] }) {
  return (
    <div className="space-y-2">
      {recommendations.map((rec, i) => (
        <div key={i} className="flex gap-3 items-start">
          <div className="w-5 h-5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
            {i + 1}
          </div>
          <p className="text-xs text-gray-300 font-sans leading-relaxed pt-0.5">
            {rec}
          </p>
        </div>
      ))}
      {recommendations.length === 0 && (
        <div className="flex items-center gap-2 text-gray-500 font-sans py-2 text-xs italic">
          <ShieldCheck className="w-4 h-4 text-emerald-500/60" />
          <span>No recommendations found. Keep standard baseline isolation policies active.</span>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function WorkspaceView({
  viewModel,
  displayAlert,
  detectionSeverity = "medium",
  investigationId,
  investigationStatus = "NEW",
  onUpdateStatus,
  onOpenReport,
  analysisContext,
  openTabs = [],
  onSelectAlert,
  onCloseAlertTab,
  onCloseWorkspace,
  quarantineStatus = "active",
  quarantineProgress = 0,
  isBlockApplied = false,
  handleIsolate = () => {},
  onBlockIp = () => {},
  isPending = false,
  isError = false,
  refetch,
  relatedAlerts = [],
}: WorkspaceViewProps) {
  const { data: serverTimeline, isPending: isTimelinePending } = useTimeline(
    viewModel ? undefined : investigationId
  );
  
  const timeline = viewModel ? viewModel.timeline : serverTimeline;
  const showTimelinePending = viewModel
    ? false
    : isPending || (!!displayAlert?.id && !investigationId) || isTimelinePending;

  const isBehavioral = viewModel?.isBehavioral ?? false;

  const activeAlert = viewModel ? null : displayAlert;
  
  // Normalization variables for the header
  const viewInvestigationId = viewModel
    ? viewModel.investigation.investigation_id
    : investigationId;
  const viewStatus = viewModel
    ? viewModel.investigation.status
    : investigationStatus;
  const viewTitle = viewModel
    ? viewModel.investigation.title
    : displayAlert?.type || "Investigation";
  const viewSeverity = viewModel
    ? viewModel.investigation.severity
    : displayAlert?.severity || detectionSeverity;
  const viewRisk = viewModel
    ? viewModel.investigation.risk_score
    : displayAlert?.score || 0;
  const viewConfidence = viewModel
    ? viewModel.investigation.confidence
    : analysisContext?.threat_intelligence?.confidence
    ? Math.round(analysisContext.threat_intelligence.confidence * 100)
    : null;
  const viewTimestamp = viewModel
    ? viewModel.investigation.created_at
    : displayAlert?.timestamp || new Date().toISOString();

  // If node isolated
  const isNodeIsolated =
    viewStatus === "CONTAINED" || quarantineStatus === "quarantined";

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

          {viewModel ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] bg-elevated border border-border-custom/40 text-gray-200">
              <span className={`w-1.5 h-1.5 rounded-full ${severityDotClass(viewSeverity)}`} />
              <span className="font-mono">{viewInvestigationId}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
              {openTabs.map((tab) => {
                const isActive = tab.id === displayAlert?.id;
                return (
                  <motion.div
                    key={tab.id}
                    layout
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] cursor-pointer shrink-0 transition-colors duration-120 ${
                      isActive
                        ? "bg-elevated border border-border-custom/40 text-gray-200"
                        : "text-gray-500 hover:text-gray-300 hover:bg-elevated/30"
                    }`}
                    onClick={() => onSelectAlert?.(tab)}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${severityDotClass(
                        tab.severity
                      )} ${isActive ? "" : "opacity-50"}`}
                    />
                    <span className="font-mono">{tab.id}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCloseAlertTab?.(tab.id);
                      }}
                      className="text-gray-600 hover:text-gray-300 transition-colors ml-0.5 cursor-pointer"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Live status indicator */}
        <div className="shrink-0">
          {isNodeIsolated ? (
            <span className="flex items-center gap-1.5 text-[10px] text-red-400 font-sans font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Node isolated
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-sans font-semibold">
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
          className="hidden md:flex flex-col shrink-0 grow-0 md:w-[22%] xl:w-[20%] 2xl:w-[18%] border-r border-border-custom/15 overflow-hidden bg-surface/5"
        >
          {/* Timeline section */}
          <div className="flex-1 overflow-y-auto p-4 scrollbar-thin min-h-0">
            <div className="flex items-center gap-1.5 mb-3">
              <Activity className="w-3.5 h-3.5 text-gray-500" />
              <h2 className="text-[11px] font-sans font-medium text-gray-500 uppercase tracking-wider">
                Workspace Timeline
              </h2>
            </div>
            <EventTimeline alert={activeAlert || undefined} timeline={timeline} />
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
                  <Skeleton
                    width={120}
                    height={16}
                    className="rounded-md animate-pulse-slow"
                  />
                ) : (
                  <div className="flex items-center gap-2 bg-surface/30 border border-border-custom/10 px-2 py-0.5 rounded-md shrink-0">
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-gray-500 font-mono tracking-wide">
                        Severity:
                      </span>
                      <Badge variant={severityBadgeVariant(viewSeverity)}>
                        {viewSeverity}
                      </Badge>
                    </div>
                  </div>
                )}
                <span className="font-mono text-[10px] text-gray-600">|</span>
                <span className="font-mono text-[10px] text-gray-500">
                  {viewInvestigationId || displayAlert?.id}
                </span>
                <span className="text-gray-700">·</span>
                <div className="flex items-center gap-1 font-sans shrink-0">
                  <span className="text-[9px] text-gray-500 font-mono tracking-wide">
                    Status:
                  </span>
                  {viewInvestigationId ? (
                    <select
                      value={viewStatus}
                      onChange={(e) => onUpdateStatus?.(e.target.value)}
                      className="bg-black/40 border border-border-custom/50 hover:border-border-custom rounded-md px-1.5 py-0.5 text-[10px] font-mono text-gray-300 hover:text-white outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/20 cursor-pointer transition-colors duration-120"
                    >
                      <option value="NEW" className="bg-[#111317] text-gray-300">
                        NEW
                      </option>
                      <option
                        value="INVESTIGATING"
                        className="bg-[#111317] text-gray-300"
                      >
                        INVESTIGATING
                      </option>
                      <option
                        value="CONTAINED"
                        className="bg-[#111317] text-gray-300"
                      >
                        CONTAINED
                      </option>
                      <option
                        value="RESOLVED"
                        className="bg-[#111317] text-gray-300"
                      >
                        RESOLVED
                      </option>
                    </select>
                  ) : (
                    <Badge variant="default">NEW</Badge>
                  )}
                </div>
                {viewInvestigationId && onOpenReport && (
                  <>
                    <span className="text-gray-700">·</span>
                    <button
                      onClick={() => onOpenReport(viewInvestigationId)}
                      className="flex items-center gap-1.5 text-[10px] text-purple-400 hover:text-purple-300 font-mono transition-colors duration-120 cursor-pointer border border-transparent hover:border-purple-500/20 px-1 py-0.2 rounded"
                    >
                      <FileText className="w-3.5 h-3.5 text-purple-400" />
                      <span>View Report</span>
                    </button>
                  </>
                )}
                <span className="text-gray-700">·</span>
                <span className="flex items-center gap-1 text-[10px] text-gray-500 font-sans">
                  <Clock className="w-3 h-3" />
                  {parseUtcDate(viewTimestamp).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              {/* Hero title */}
              <h1 className="text-[20px] font-sans font-semibold text-gray-100 tracking-tight leading-tight mb-3">
                {viewTitle}
              </h1>

              {/* Display score & confidence */}
              <div className="flex items-center gap-4 text-[11px] font-mono flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-600 font-sans">Risk Score</span>
                  <span
                    className={`font-semibold ${
                      viewRisk >= 80
                        ? "text-red-400"
                        : viewRisk >= 55
                        ? "text-orange-400"
                        : "text-blue-400"
                    }`}
                  >
                    {viewRisk.toFixed(1)}%
                  </span>
                </div>
                {viewConfidence !== null && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-600 font-sans">Confidence</span>
                    <span className="font-semibold text-purple-400">
                      {viewConfidence.toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>
            </section>

            {/* ── Center Pane Content Switch ─────────────────────────────── */}
            {isBehavioral && viewModel ? (
              <>
                {/* Correlation Summary Section */}
                {viewModel.correlation && (
                  <section className="border-t border-border-custom/12 pt-6 mt-6 space-y-4">
                    <SectionLabel icon={Target}>Correlation Summary</SectionLabel>
                    <CorrelationSummary correlation={viewModel.correlation} />
                  </section>
                )}

                {/* Behavioral Detections Findings */}
                <section className="border-t border-border-custom/12 pt-6 mt-6 space-y-4">
                  <SectionLabel icon={Fingerprint}>Behavioral Detection Findings</SectionLabel>
                  <BehavioralDetectionFindings
                    detections={viewModel.detections}
                    primaryDetection={viewModel.primaryDetection}
                  />
                </section>

                {/* Process Execution Evidence */}
                {viewModel.processes.length > 0 && (
                  <section className="border-t border-border-custom/12 pt-6 mt-6 space-y-4">
                    <SectionLabel icon={Terminal}>Process Execution Evidence</SectionLabel>
                    <ProcessEvidencePanel processes={viewModel.processes} />
                  </section>
                )}

                {/* MITRE ATT&CK Mappings */}
                <section className="border-t border-border-custom/12 pt-6 mt-6 space-y-4">
                  <SectionLabel icon={Crosshair}>MITRE ATT&amp;CK Assessment</SectionLabel>
                  <MitreAssessment mappings={viewModel.mitreMappings} />
                </section>

                {/* Analyst Recommendations */}
                <section className="border-t border-border-custom/12 pt-6 mt-6 space-y-4">
                  <SectionLabel icon={Shield}>Analyst Recommendations</SectionLabel>
                  <InvestigationRecommendations
                    recommendations={viewModel.recommendations}
                  />
                </section>
              </>
            ) : (
              <>
                {/* Description */}
                {displayAlert && (
                  <p className="text-[13px] text-gray-400 leading-relaxed font-sans mb-4 mt-2 max-w-[72ch]">
                    {displayAlert.description}
                  </p>
                )}

                {/* Source/user inline */}
                {displayAlert && (
                  <div className="flex items-center gap-4 text-[11px] font-sans flex-wrap mb-4">
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
                  </div>
                )}

                {/* ── 2. Evidence — What supports this? ─────────────────────── */}
                {displayAlert && (
                  <section className="border-t border-border-custom/12 pt-6 mt-6 space-y-4">
                    <SectionLabel icon={Fingerprint}>Evidence</SectionLabel>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <p className="text-[10px] text-gray-600 font-sans mb-2.5">
                          Process chain
                        </p>
                        <ProcessTree alert={displayAlert} />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-600 font-sans mb-2.5">
                          Key attributes
                        </p>
                        <EvidenceAttributes alert={displayAlert} />
                      </div>
                    </div>
                  </section>
                )}

                {/* ── 3. Reasoning — Why was it flagged? ────────────────────── */}
                <section className="border-t border-border-custom/12 pt-6 mt-6 space-y-4">
                  <SectionLabel icon={Sparkles}>AI reasoning</SectionLabel>

                  {isPending ? (
                    <div className="space-y-2 max-w-[72ch] py-1 h-[54px] flex flex-col justify-center">
                      <Skeleton
                        width="100%"
                        height={12}
                        className="animate-pulse-slow"
                      />
                      <Skeleton
                        width="95%"
                        height={12}
                        className="animate-pulse-slow"
                      />
                      <Skeleton
                        width="60%"
                        height={12}
                        className="animate-pulse-slow"
                      />
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
                      I reviewed the signals from this source and found activity
                      that doesn't match the expected behavior for this host.
                      The combination of process lineage, network activity, and
                      timing patterns pushed the score above the critical threshold.
                    </p>
                  )}

                  {/* SHAP factors */}
                  {displayAlert?.details.shapFactors &&
                    displayAlert.details.shapFactors.length > 0 && (
                      <div className="space-y-2.5">
                        <p className="text-[10px] text-gray-600 font-sans">
                          Risk attribution (SHAP)
                        </p>
                        <div className="space-y-2">
                          {displayAlert.details.shapFactors.map((f, i) => (
                            <div key={i} className="space-y-1">
                              <div className="flex justify-between items-baseline">
                                <span className="text-[11px] text-gray-500 font-sans">
                                  {f.factor}
                                </span>
                                <span className="text-[10px] font-mono text-gray-600">
                                  {(f.impact * 100).toFixed(0)}%
                                </span>
                              </div>
                              <div className="w-full h-px bg-border-custom/30 rounded-full overflow-hidden">
                                <motion.div
                                  className="bg-violet-500/50 h-full rounded-full"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${f.impact * 100}%` }}
                                  transition={{
                                    duration: 0.5,
                                    delay: i * 0.07,
                                    ease: "easeOut",
                                  }}
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
                      <Skeleton
                        width={60}
                        height={14}
                        className="rounded animate-pulse-slow"
                      />
                      <Skeleton
                        width={120}
                        height={14}
                        className="rounded animate-pulse-slow"
                      />
                      <Skeleton
                        width={80}
                        height={14}
                        className="rounded animate-pulse-slow"
                      />
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
                      <Badge variant="blue" className="shrink-0 ml-4 font-semibold">
                        {analysisContext.mitre.tactic}
                      </Badge>
                    </div>
                  ) : null}

                  {/* ── Threat Intelligence ── */}
                  {isPending ? (
                    <div className="flex items-center gap-3 pt-1">
                      <Skeleton
                        width={70}
                        height={14}
                        className="rounded animate-pulse-slow"
                      />
                      <Skeleton
                        width={150}
                        height={14}
                        className="rounded animate-pulse-slow"
                      />
                    </div>
                  ) : analysisContext?.threat_intelligence ? (
                    <div className="flex items-baseline justify-between pt-1">
                      <div className="flex items-start gap-2">
                        <Shield className="w-3.5 h-3.5 text-purple-400/70 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] text-gray-600 font-sans mb-0.5">
                            Threat Intelligence ·{" "}
                            {analysisContext.threat_intelligence.category}
                          </p>
                          <span className="text-[10px] text-gray-400 font-sans">
                            {analysisContext.threat_intelligence.summary}
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant={
                          reputationVariant(
                            analysisContext.threat_intelligence.reputation
                          ) as
                            | "critical"
                            | "high"
                            | "medium"
                            | "low"
                            | "default"
                        }
                        className="shrink-0 ml-4 capitalize font-semibold"
                      >
                        {analysisContext.threat_intelligence.reputation}
                      </Badge>
                    </div>
                  ) : null}
                </section>
              </>
            )}

            {/* Investigation Timeline */}
            <div className="border-t border-border-custom/12 pt-6 mt-6">
              <TimelinePanel
                timeline={timeline}
                isPending={showTimelinePending}
              />
            </div>

            {/* ── 4. Related incidents ───────────────────────────────────── */}
            {relatedAlerts.length > 0 && (
              <section className="border-t border-border-custom/12 pt-6 mt-6 space-y-3">
                <div className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-gray-500" />
                  <h2 className="text-[11px] font-sans font-medium text-gray-500">
                    Related incidents
                  </h2>
                  <span className="text-[10px] text-gray-700">· same category</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {relatedAlerts.map((related) => (
                    <button
                      key={related.id}
                      onClick={() => onSelectAlert?.(related)}
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
            alert={
              displayAlert || {
                id: viewInvestigationId || "",
                timestamp: viewTimestamp,
                source: viewModel?.detections[0]?.host_id || "endpoint-telemetry",
                type: viewTitle,
                severity: viewSeverity,
                category: "process",
                status: "open",
                description: viewModel?.detections[0]?.description || "",
                score: viewRisk,
                details: {
                  processPath: viewModel?.processes[0]?.executable || undefined,
                  commandLine: viewModel?.processes[0]?.cmdline
                    ? (Array.isArray(viewModel.processes[0].cmdline)
                      ? viewModel.processes[0].cmdline.join(" ")
                      : viewModel.processes[0].cmdline)
                    : undefined,
                },
              }
            }
            quarantineStatus={quarantineStatus}
            quarantineProgress={quarantineProgress}
            isBlockApplied={isBlockApplied}
            onIsolate={handleIsolate}
            onBlockIp={onBlockIp}
            isAnalysisPending={viewModel ? false : isPending}
            isAnalysisError={viewModel ? false : isError}
            onRetryAnalysis={refetch}
            analysisContext={
              viewModel
                ? {
                    mitre: {
                      technique_id: viewModel.mitreMappings[0]?.technique_id || "N/A",
                      technique_name:
                        viewModel.mitreMappings[0]?.technique_name || "N/A",
                      tactic: viewModel.mitreMappings[0]?.tactic || "N/A",
                      description: viewModel.mitreMappings[0]?.description || "N/A",
                    },
                    threat_intelligence: {
                      reputation: "suspicious",
                      confidence: viewModel.investigation.confidence || 0.8,
                      category: "Behavioral Detection",
                      summary:
                        viewModel.detections[0]?.description ||
                        "Autonomous behavioral telemetry markers resolved.",
                    },
                  }
                : analysisContext
            }
            investigationId={viewInvestigationId}
            workspace={viewModel || null}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
