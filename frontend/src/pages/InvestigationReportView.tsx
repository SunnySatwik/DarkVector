import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Briefcase,
  Activity,
  Shield,
  Crosshair,
  Sparkles,
  Clock,
  UserCheck,
  CheckCircle,
  Copy,
  Check,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Badge, Skeleton } from "../components/ui/DesignSystem";
import { useInvestigationWorkspace, useInvestigationReport } from "../hooks/useInvestigations";
import { severityBadgeVariant } from "../lib/severity";
import { Severity } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { parseUtcDate, formatLocalLocale, formatLocalDateOnly } from "../lib/timeFormatter";

interface InvestigationReportViewProps {
  investigationId: string;
  onClose: () => void;
}

export default function InvestigationReportView({
  investigationId,
  onClose,
}: InvestigationReportViewProps) {
  const { data: workspaceData, isPending: isWorkspacePending, isError: isWorkspaceError } = useInvestigationWorkspace(investigationId);
  const { data: reportData, isPending: isReportPending } = useInvestigationReport(investigationId);

  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleCopy = (text: string, section: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setToastMessage("Copied to clipboard");
    setTimeout(() => {
      setCopiedSection(null);
      setToastMessage(null);
    }, 2000);
  };

  const isPending = isWorkspacePending || isReportPending;
  const isError = isWorkspaceError || !workspaceData;

  const formattedDate = useMemo(() => {
    if (!workspaceData?.investigation?.created_at) return "";
    try {
      const d = parseUtcDate(workspaceData.investigation.created_at);
      return d.toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch (e) {
      return workspaceData.investigation.created_at;
    }
  }, [workspaceData]);

  if (isPending) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] bg-[#09090b] text-gray-500 font-mono text-xs gap-3">
        <Activity className="w-5 h-5 animate-spin text-purple-500" />
        <span>Generating investigation report...</span>
      </div>
    );
  }

  if (isError || !workspaceData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] bg-[#09090b] text-red-400 font-mono text-xs gap-3">
        <Shield className="w-6 h-6 text-red-500 animate-pulse" />
        <span>Failed to load investigation details for the report.</span>
        <button
          onClick={onClose}
          className="mt-2 px-3 py-1.5 bg-[#161A22] border border-[#23262F] hover:bg-[#23262F] rounded-lg text-gray-300 font-sans transition-colors cursor-pointer"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const { investigation, alert, analysis, timeline: timelineData } = workspaceData;
  const isBehavioral = workspaceData.is_behavioral;

  // Source / Host
  const sourceVal = isBehavioral
    ? (workspaceData.primary_detection?.host_id || "N/A")
    : (alert?.source || "N/A");

  // Alert ID
  const alertIdVal = isBehavioral
    ? (workspaceData.primary_detection?.id || investigation?.alert_id || "N/A")
    : (alert?.id || "N/A");

  // Detection Severity
  const detectionSeverityVal = isBehavioral
    ? (workspaceData.primary_detection?.severity || investigation?.severity || "medium")
    : (alert?.severity || "medium");

  // AI Assessment Severity
  const aiSeverityVal = isBehavioral
    ? (investigation?.severity || "medium")
    : (analysis?.analysis?.severity || investigation?.severity || "medium");

  // Risk Score
  const riskScoreVal = isBehavioral
    ? (investigation?.risk_score ?? 0)
    : (analysis?.analysis?.risk_score ?? investigation?.risk_score ?? 0);

  // Confidence
  const confidenceVal = isBehavioral
    ? (investigation?.confidence ?? 0)
    : (analysis?.analysis?.confidence ?? investigation?.confidence ?? 0);

  const contextMitre = isBehavioral
    ? (workspaceData.mitre_mappings && workspaceData.mitre_mappings.length > 0
        ? {
            technique_id: workspaceData.mitre_mappings[0].technique_id,
            technique_name: workspaceData.mitre_mappings[0].technique_name,
            tactic: workspaceData.mitre_mappings[0].tactic,
            description: workspaceData.mitre_mappings[0].description,
          }
        : null)
    : analysis?.context?.mitre;

  const contextIntel = isBehavioral
    ? {
        reputation: "suspicious",
        category: "Behavioral Detection",
        confidence: investigation?.confidence || 75,
        summary: workspaceData.primary_detection?.description || "Autonomous behavioral telemetry markers resolved.",
      }
    : analysis?.context?.threat_intelligence;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#09090b] text-gray-200 overflow-y-auto scrollbar-thin">
      {/* Print styles overrides */}
      <style>{`
        @media print {
          html, body {
            background: #ffffff !important;
            color: #111827 !important;
          }
          #app-layout-sidebar, #app-layout-header, .no-print {
            display: none !important;
          }
          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
          }
          .print-card {
            background: #ffffff !important;
            border: 1px solid #e5e7eb !important;
            box-shadow: none !important;
            color: #111827 !important;
          }
          .print-header {
            border-bottom: 2px solid #111827 !important;
            padding-bottom: 1rem !important;
          }
          .print-text-dark {
            color: #111827 !important;
          }
          .print-text-muted {
            color: #4b5563 !important;
          }
          .print-badge {
            border: 1px solid #4b5563 !important;
            color: #111827 !important;
            background: #f3f4f6 !important;
          }
          .print-divider {
            border-top: 1px solid #d1d5db !important;
          }
          .print-timeline-item {
            border-left: 2px solid #e5e7eb !important;
          }
          .print-table-head {
            background-color: #f3f4f6 !important;
            border-bottom: 1px solid #e5e7eb !important;
          }
          .print-table-cell {
            border-bottom: 1px solid #f3f4f6 !important;
          }
        }
      `}</style>

      {/* Action bar (Hidden on print) */}
      <div className="max-w-4xl mx-auto px-6 py-4 no-print flex items-center justify-between border-b border-border-custom/12 bg-surface/20 sticky top-0 backdrop-blur-md z-10">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors group cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform duration-120" />
          <span>Back to Workspace</span>
        </button>

        <button
          type="button"
          onClick={() => handleCopy(reportData?.report || "", "report")}
          className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 bg-purple-950/20 border border-purple-500/30 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          title="Copy Full Markdown Report"
        >
          {copiedSection === "report" ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Copied Report!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Full Report</span>
            </>
          )}
        </button>
      </div>

      {/* Report Document Area */}
      <div className="max-w-4xl mx-auto px-6 py-8 print-container">
        <div className="bg-[#111317] border border-[#23262F] rounded-xl p-8 shadow-xl space-y-8 print-card print-container">

          {/* Header Row */}
          <div className="flex items-start justify-between border-b border-border-custom/25 pb-6 print-header">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 rounded-full print-badge">
                  {investigation.investigation_id}
                </span>
                <span className="text-[10px] font-mono text-gray-400 bg-gray-500/10 border border-gray-500/20 px-2 py-0.5 rounded-full capitalize print-badge">
                  Status: {investigation.status.toLowerCase()}
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-100 font-sans tracking-tight print-text-dark">
                Security Incident Investigation Report
              </h1>
              <p className="text-xs text-gray-500 font-sans print-text-muted">
                Document Generated: {formatLocalLocale(new Date())} · Case Initiated: {formattedDate}
              </p>
            </div>

            <Briefcase className="w-8 h-8 text-purple-400 shrink-0 ml-4 print-text-dark" />
          </div>

          {/* Incident Info block */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider print-text-muted">
                1. Investigation Overview
              </h3>
              <div className="bg-black/20 border border-border-custom/15 rounded-lg p-4 space-y-3 print-card">
                <div className="flex justify-between items-baseline py-0.5">
                  <span className="text-[11px] text-gray-500 font-sans print-text-muted">Target Host/Source</span>
                  <span className="text-xs font-mono text-gray-300 font-semibold print-text-dark">{sourceVal}</span>
                </div>
                <div className="flex justify-between items-baseline py-0.5">
                  <span className="text-[11px] text-gray-500 font-sans print-text-muted">Alert ID</span>
                  <span className="text-xs font-mono text-gray-300 print-text-dark">{alertIdVal}</span>
                </div>
                <div className="flex justify-between items-baseline py-0.5">
                  <span className="text-[11px] text-gray-500 font-sans print-text-muted">Detection Severity</span>
                  <Badge variant={severityBadgeVariant(detectionSeverityVal.toLowerCase() as Severity)} className="print-badge">
                    {detectionSeverityVal}
                  </Badge>
                </div>
                <div className="flex justify-between items-baseline py-0.5">
                  <span className="text-[11px] text-gray-500 font-sans print-text-muted">AI Assessment Severity</span>
                  <Badge variant={severityBadgeVariant(aiSeverityVal.toLowerCase() as Severity)} className="print-badge">
                    {aiSeverityVal}
                  </Badge>
                </div>
                <div className="flex justify-between items-baseline py-0.5">
                  <span className="text-[11px] text-gray-500 font-sans print-text-muted">Risk Score</span>
                  <span className="text-xs font-mono text-red-400 font-bold print-text-dark">
                    {riskScoreVal.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-baseline py-0.5">
                  <span className="text-[11px] text-gray-500 font-sans print-text-muted">Analysis Confidence</span>
                  <span className="text-xs font-mono text-purple-400 font-bold print-text-dark">
                    {confidenceVal.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider print-text-muted">
                2. Resolution Status
              </h3>
              <div className="bg-black/20 border border-border-custom/15 rounded-lg p-4 space-y-4 print-card flex flex-col justify-between h-[calc(100%-2rem)]">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-300 print-text-dark">
                    <CheckCircle className="w-4 h-4 text-emerald-400 print-text-dark" />
                    <span>Case Review Process</span>
                  </div>
                  <p className="text-[11px] text-gray-500 font-sans leading-relaxed print-text-muted">
                    This case has transitioned to <span className="font-semibold text-gray-300 print-text-dark uppercase">{investigation.status}</span>.
                    The AI-generated insights have been reviewed, and all appropriate containment actions have been logged in the audit trail below.
                  </p>
                </div>

                <div className="border-t border-border-custom/10 pt-3 flex justify-between items-center text-[10px] font-mono text-gray-500 print-divider print-text-muted">
                  <span>Owner: SYSTEM ANALYST</span>
                  <span>Updated: {formatLocalDateOnly(investigation.updated_at)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Executive Summary */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider print-text-muted">
                3. AI Executive Summary
              </h3>
              <button
                type="button"
                onClick={() => handleCopy(reportData?.report || investigation.summary || "", "summary")}
                className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 bg-[#161A22] border border-[#23262F] px-2 py-1 rounded transition-colors cursor-pointer no-print"
                title="Copy Executive Summary"
              >
                {copiedSection === "summary" ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Section</span>
                  </>
                )}
              </button>
            </div>
            <div className="bg-purple-950/5 border border-purple-500/20 rounded-lg p-5 space-y-3 print-card">
              <div className="flex items-center gap-2 text-[10px] font-mono text-purple-400 print-text-dark">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Vector Incident Summarisation</span>
              </div>
              <div className="text-xs text-gray-300 font-sans leading-relaxed print-text-dark prose prose-invert max-w-none select-text">
                <ReactMarkdown>
                  {reportData?.report || investigation.summary || "Generating AI incident summary and detailed findings based on the event telemetry..."}
                </ReactMarkdown>
              </div>
            </div>
          </div>

          {/* Threat Context Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* MITRE ATT&CK Mapping */}
            <div className="space-y-4">
              <h3 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider print-text-muted">
                4. MITRE ATT&amp;CK Context
              </h3>              {contextMitre ? (
                <div className="bg-black/20 border border-border-custom/15 rounded-lg p-5 space-y-3 print-card h-[calc(100%-2rem)]">
                  <div className="flex items-center gap-2 text-[10px] font-mono text-blue-400 print-text-dark">
                    <Crosshair className="w-3.5 h-3.5" />
                    <span>Mapping Signature</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[11px] font-mono text-gray-400 print-text-muted">
                      Technique: <span className="text-blue-300 font-semibold print-text-dark">{contextMitre.technique_id} · {contextMitre.technique_name}</span>
                    </div>
                    <div className="text-[11px] font-mono text-gray-400 print-text-muted">
                      Tactic: <span className="text-gray-300 print-text-dark">{contextMitre.tactic}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500 font-sans leading-relaxed print-text-muted">
                    {contextMitre.description}
                  </p>
                </div>
              ) : (
                <div className="bg-black/20 border border-border-custom/15 rounded-lg p-5 text-center text-xs text-gray-600 font-mono print-card">
                  No MITRE ATT&amp;CK telemetry context.
                </div>
              )}
            </div>
 
            {/* Threat Intelligence Summary */}
            <div className="space-y-4">
              <h3 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider print-text-muted">
                5. Threat Intelligence Details
              </h3>
              {contextIntel ? (
                <div className="bg-black/20 border border-border-custom/15 rounded-lg p-5 space-y-3 print-card h-[calc(100%-2rem)]">
                  <div className="flex items-center gap-2 text-[10px] font-mono text-purple-400 print-text-dark">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Signal Analysis</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[11px] font-mono text-gray-400 print-text-muted">
                      Reputation: <span className="text-red-400 font-bold uppercase print-text-dark">{contextIntel.reputation}</span>
                    </div>
                    <div className="text-[11px] font-mono text-gray-400 print-text-muted">
                      Category: <span className="text-gray-300 print-text-dark">{contextIntel.category}</span>
                    </div>
                    <div className="text-[11px] font-mono text-gray-400 print-text-muted">
                      Intel Confidence: <span className="text-gray-300 print-text-dark">{contextIntel.confidence}%</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500 font-sans leading-relaxed print-text-muted">
                    {contextIntel.summary}
                  </p>
                </div>
              ) : (
                <div className="bg-black/20 border border-border-custom/15 rounded-lg p-5 text-center text-xs text-gray-600 font-mono print-card">
                  No Threat Intelligence metadata context.
                </div>
              )}
            </div>
          </div>

          {/* Timeline Audit Logs */}
          <div className="space-y-4">
            <h3 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider print-text-muted">
              6. Chronological Case Audit Trail (Timeline)
            </h3>
            <div className="bg-black/10 border border-border-custom/15 rounded-lg p-5 print-card">
              {timelineData && timelineData.length > 0 ? (
                <div className="relative pl-4 space-y-6">
                  {/* Vertical bar */}
                  <div className="absolute left-1.5 top-2 bottom-2 w-0.5 bg-border-custom/25 print-divider" />

                  {timelineData.map((event) => (
                    <div key={event.id} className="relative flex flex-col gap-1 print-timeline-item">
                      {/* Timeline dot */}
                      <div className="absolute -left-[19px] top-1.5 w-2 h-2 rounded-full bg-purple-500 border-2 border-[#111317] print-badge" />

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono text-purple-400 font-semibold print-text-dark">
                          {event.title}
                        </span>
                        <span className="text-[9px] text-gray-600 font-mono print-text-muted">•</span>
                        <span className="text-[9px] text-gray-500 font-mono print-text-muted">
                          {formatLocalLocale(event.timestamp)}
                        </span>
                        <span className="text-[9px] text-gray-600 font-mono print-text-muted">•</span>
                        <span className="text-[9px] font-mono bg-surface/80 border border-border-custom/10 text-gray-400 px-1 rounded uppercase print-badge">
                          {event.actor.toLowerCase()}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 font-sans leading-relaxed print-text-muted">
                        {event.description}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-gray-600 font-mono">
                  No chronological events logged.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Print Disclaimer footer */}
        <div className="mt-8 text-center text-[10px] font-mono text-gray-600 space-y-1 print-text-muted">
          <p>© 2026 DarkVector Platform Aggregate Security Report. All rights reserved.</p>
          <p>Classification: CONFIDENTIAL // INTERNAL SECURITY USE ONLY</p>
        </div>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-6 right-6 bg-[#111317] border border-emerald-500/30 text-gray-200 px-4 py-2 rounded-xl text-xs font-sans shadow-lg z-50 flex items-center gap-2"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
