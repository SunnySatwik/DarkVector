/**
 * VectorPanel
 *
 * AI investigation partner for InvestigationWorkspace.
 * Shows consolidated case intelligence and chat capabilities.
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Send,
  Unplug,
  Shield,
  ChevronDown,
  Copy,
  Check,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Alert } from "../../types";
import type { ContextEnrichment } from "../../api/types";
import { sendChatMessage } from "../../api/investigations";
import { Skeleton } from "../ui/DesignSystem";
import { WorkspaceViewModel } from "../../lib/workspaceMapper";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface VectorPanelProps {
  alert: Alert;
  quarantineStatus: "active" | "quarantining" | "quarantined";
  quarantineProgress: number;
  isBlockApplied: boolean;
  onIsolate: () => void;
  onBlockIp: () => void;
  isAnalysisPending?: boolean;
  isAnalysisError?: boolean;
  onRetryAnalysis?: () => void;
  analysisContext?: ContextEnrichment;
  investigationId?: string;
  workspace?: WorkspaceViewModel | null;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] tracking-wide text-gray-500 font-sans uppercase mb-2.5">
      {children}
    </p>
  );
}

// ─── Root Component ───────────────────────────────────────────────────────────

export function VectorPanel({
  alert,
  quarantineStatus,
  quarantineProgress,
  isBlockApplied,
  onIsolate,
  onBlockIp,
  isAnalysisPending = false,
  isAnalysisError = false,
  onRetryAnalysis,
  analysisContext,
  investigationId,
  workspace,
}: VectorPanelProps) {
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<
    { sender: "ai" | "user"; text: string; time: string }[]
  >([]);
  const [isResponding, setIsResponding] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleCopy = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setToastMessage("Copied to clipboard");
    setTimeout(() => {
      setCopiedId(null);
      setToastMessage(null);
    }, 2000);
  };
  const [conversationOpen, setConversationOpen] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // First-person analyst-voice summaries per category
  const categorySummary: Record<string, string> = {
    process: "I spotted a process that spawned outside the normal execution chain for this container. This pattern is consistent with a namespace escape attempt — the binary wasn't part of the expected runtime.",
    network: "I found an unauthorized outbound connection that doesn't match this server's known egress patterns. The destination hasn't been seen in previous traffic from this host.",
    authentication: "I noticed a login from an unusual location that doesn't match this account's historical access pattern. The timing and geography are both out of character.",
    system: "I detected IAM policy changes that opened up privilege escalation paths beyond the expected role boundary. This kind of drift is often the first step in a lateral movement chain.",
  };

  const summaryText = workspace
    ? (workspace.isBehavioral
        ? `Autonomous behavioral case containing ${workspace.detections.length} correlated detections.`
        : workspace.legacyAnalysis?.explanation?.summary || "Legacy alert case resolved.")
    : (categorySummary[alert.category] ??
      "I detected anomalous activity that significantly deviates from the established baseline for this source.");

  // Conversational reasoning from SHAP factors
  const topFactor = alert.details.shapFactors?.[0];
  const secondFactor = alert.details.shapFactors?.[1];

  const reasoningText = topFactor
    ? `The biggest red flag here is **${topFactor.factor}** — it accounts for ${(topFactor.impact * 100).toFixed(0)}% of why I flagged this event${
        secondFactor
          ? `. **${secondFactor.factor}** (${(secondFactor.impact * 100).toFixed(0)}%) was the next strongest signal`
          : ""
      }. Together these pushed the risk score above the critical threshold.`
    : "I flagged this because the overall pattern deviates significantly from what I'd normally expect from this source. There isn't a single dominant signal — it's the combination that's unusual.";

  // Seed initial Vector message when alert or workspace changes
  useEffect(() => {
    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (workspace) {
      const inv = workspace.investigation;
      let text = `I have loaded the consolidated AI context for case **${inv.investigation_id}** ("${inv.title}").`;
      if (workspace.isBehavioral) {
        text += `\n\nThis is an autonomous behavioral case containing **${workspace.detections.length}** correlated detections.`;
        if (workspace.primaryDetection) {
          text += `\n- **Primary Threat Node:** \`${workspace.primaryDetection.title}\` (Severity: ${workspace.primaryDetection.severity.toUpperCase()})`;
        }
        if (workspace.correlation) {
          text += `\n- **Correlation ID:** \`${workspace.correlation.correlation_id}\``;
          text += `\n- **Duration Span:** ${workspace.correlation.duration.toFixed(1)}s`;
        }
      } else if (workspace.legacyAnalysis) {
        text += `\n\n### • Analysis Summary\n${workspace.legacyAnalysis.explanation.summary}`;
      }

      if (workspace.recommendations && workspace.recommendations.length > 0) {
        text += `\n\n### • Recommended containment playbooks\n` +
          workspace.recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n");
      }

      setChatMessages([
        {
          sender: "ai",
          text,
          time,
        },
      ]);
    } else {
      const processPath = alert.details.processPath || "anomalous executable";
      const source = alert.source;
      const technique = analysisContext?.mitre?.technique_name || "unauthorized execution";
      const parentProcess = alert.details.parentProcess ? ` parented by \`${alert.details.parentProcess}\`` : "";
      const outboundStr = alert.details.ipAddress ? ` and outbound traffic to \`${alert.details.ipAddress}\`` : "";

      const text = `I reviewed this investigation before you opened it.

The strongest indicator is an unexpected \`${processPath}\` process that spawned outside the expected execution chain on **${source}**${parentProcess}.

Combined with the outbound connection${outboundStr} and the MITRE mapping, this looks consistent with a **${technique}** attempt.

I'd start by verifying the parent process and confirming whether the affected workload is still communicating externally.

Ask me anything about this investigation.`;

      setChatMessages([
        {
          sender: "ai",
          text,
          time,
        },
      ]);
    }
  }, [alert, analysisContext, workspace]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isResponding]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const text = chatInput.trim();
    setChatInput("");
    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    setChatMessages((prev) => [...prev, { sender: "user", text, time }]);
    setIsResponding(true);

    try {
      const currentInvId = workspace ? workspace.investigation.investigation_id : investigationId;
      if (currentInvId) {
        const formattedHistory = chatMessages.map((m) => ({
          sender: m.sender,
          text: m.text,
        }));
        const reply = await sendChatMessage(currentInvId, text, formattedHistory);
        setChatMessages((prev) => [...prev, { sender: "ai", text: reply, time }]);
      } else {
        const formattedHistory = chatMessages.map((m) => ({
          sender: m.sender,
          text: m.text,
        }));
        const reply = await sendChatMessage(undefined, text, formattedHistory, alert.id);
        setChatMessages((prev) => [...prev, { sender: "ai", text: reply, time }]);
      }
    } catch (err) {
      console.error("Chat request failed:", err);
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "I experienced a network error trying to connect to my reasoning service. Please check your backend connection.",
          time,
        },
      ]);
    } finally {
      setIsResponding(false);
    }
  };

  const scoreVal = workspace ? workspace.investigation.risk_score : alert.score;
  const sourceVal = workspace ? (workspace.detections[0]?.host_id || alert.source) : alert.source;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Header ── */}
      <div className="px-4 py-3 border-b border-border-custom/15 shrink-0 bg-surface/10">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-md bg-violet-500/12 flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-violet-400" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-gray-200 font-sans leading-none">
              Vector
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">
              AI investigation partner
            </p>
          </div>
        </div>
      </div>

      {/* ── Scrollable intelligence body ── */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-6 scrollbar-thin">

        {/* 1. Summary — What happened? */}
        <div className="space-y-2">
          <SectionLabel>Summary</SectionLabel>
          {isAnalysisPending ? (
            <div className="h-[18px] flex items-center">
              <Skeleton width="100%" height={12} className="animate-pulse-slow" />
            </div>
          ) : (
            <motion.p
              key={(workspace ? workspace.investigation.investigation_id : alert.id) + "-summary"}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="text-[13px] text-gray-300 leading-relaxed font-sans"
            >
              {workspace ? summaryText : `${alert.source} triggered ${summaryText}`}
            </motion.p>
          )}
        </div>

        {/* 2. Evidence — What supports this? */}
        <div className="space-y-2">
          <SectionLabel>Evidence</SectionLabel>
          <motion.div
            key={(workspace ? workspace.investigation.investigation_id : alert.id) + "-evidence"}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: 0.04, ease: "easeOut" }}
            className="space-y-1.5"
          >
            {workspace && workspace.isBehavioral ? (
              [
                {
                  label: "Detections",
                  value: `${workspace.detections.length} correlated items`,
                },
                workspace.primaryDetection && {
                  label: "Primary",
                  value: workspace.primaryDetection.title,
                },
                workspace.processes[0] && {
                  label: "Process",
                  value: workspace.processes[0].executable || "",
                },
                workspace.correlation && {
                  label: "Duration",
                  value: `${workspace.correlation.duration.toFixed(1)}s`,
                },
              ]
                .filter(Boolean)
                .map((item, i) => {
                  if (!item) return null;
                  return (
                    <div key={i} className="flex items-baseline gap-3 py-0.5">
                      <span className="text-[10px] text-gray-500 font-sans tracking-wide uppercase shrink-0 w-18">
                        {item.label}
                      </span>
                      <span className="text-[11px] font-mono text-gray-300 min-w-0 flex-1 truncate select-all">
                        {item.value}
                      </span>
                    </div>
                  );
                })
            ) : (
              [
                alert.details.processPath && {
                  label: "Process",
                  value: alert.details.processPath,
                },
                alert.details.commandLine && {
                  label: "Command",
                  value: alert.details.commandLine,
                },
                alert.details.ipAddress && {
                  label: "Remote IP",
                  value: `${alert.details.ipAddress}${alert.details.port ? `:${alert.details.port}` : ""}`,
                },
                alert.details.username && {
                  label: "User",
                  value: alert.details.username,
                },
                alert.details.bytesTransferred && {
                  label: "Transferred",
                  value: `${(alert.details.bytesTransferred / 1024).toFixed(1)} KB`,
                },
              ]
                .filter(Boolean)
                .map((item, i) => {
                  if (!item) return null;
                  return (
                    <div key={i} className="flex items-baseline gap-3 py-0.5">
                      <span className="text-[10px] text-gray-500 font-sans tracking-wide uppercase shrink-0 w-18">
                        {item.label}
                      </span>
                      <span className="text-[11px] font-mono text-gray-300 min-w-0 flex-1 truncate select-all">
                        {item.value as string}
                      </span>
                    </div>
                  );
                })
            )}

            {/* Score inline */}
            <div className="flex items-baseline gap-3 py-0.5">
              <span className="text-[10px] text-gray-500 font-sans tracking-wide uppercase shrink-0 w-18">
                Risk Score
              </span>
              {isAnalysisPending ? (
                <Skeleton width={40} height={11} className="rounded animate-pulse-slow mt-0.5" />
              ) : (
                <span className="text-[11px] font-mono text-red-400">
                  {scoreVal.toFixed(0)}%
                </span>
              )}
            </div>
          </motion.div>
        </div>

        {/* 3. Reasoning — Why was it flagged? */}
        <div className="space-y-2">
          <SectionLabel>Reasoning</SectionLabel>
          {isAnalysisPending ? (
            <div className="space-y-2 py-1 h-[54px] flex flex-col justify-center">
              <Skeleton width="100%" height={12} className="animate-pulse-slow" />
              <Skeleton width="95%" height={12} className="animate-pulse-slow" />
              <Skeleton width="60%" height={12} className="animate-pulse-slow" />
            </div>
          ) : isAnalysisError ? (
            <div className="text-[12px] text-red-400/90 font-sans flex items-center gap-2 h-[54px]">
              <span>Failed to load analysis.</span>
              {onRetryAnalysis && (
                <button
                  onClick={onRetryAnalysis}
                  className="text-violet-400 hover:text-violet-300 underline cursor-pointer font-medium"
                >
                  Retry
                </button>
              )}
            </div>
          ) : (
            <motion.div
              key={(workspace ? workspace.investigation.investigation_id : alert.id) + "-reasoning"}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: 0.08, ease: "easeOut" }}
              className="space-y-2.5"
            >
              {workspace && workspace.isBehavioral ? (
                <div className="text-[13px] text-gray-400 leading-relaxed font-sans max-w-[72ch] space-y-2">
                  {workspace.detections.map((det) => (
                    <div key={det.id} className="pl-2 border-l border-violet-500/20">
                      <strong className="text-gray-300">{det.title}:</strong> {det.description}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[13px] text-gray-400 leading-relaxed font-sans max-w-[72ch]">
                  <ReactMarkdown>{reasoningText}</ReactMarkdown>
                </div>
              )}

              {/* SHAP bar chart — compact (only for legacy/alerts) */}
              {!workspace && alert.details.shapFactors &&
                alert.details.shapFactors.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {alert.details.shapFactors.slice(0, 3).map((f, i) => (
                      <div key={i} className="space-y-0.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] text-gray-500 font-sans truncate pr-2">
                            {f.factor}
                          </span>
                          <span className="text-[10px] font-mono text-gray-500 shrink-0">
                            {(f.impact * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full h-0.5 bg-border-custom/25 rounded-full overflow-hidden">
                          <motion.div
                            className="bg-violet-400/60 h-full rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${f.impact * 100}%` }}
                            transition={{
                              duration: 0.4,
                              delay: i * 0.06,
                              ease: "easeOut",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </motion.div>
          )}
        </div>

        {/* 4. Recommended actions — isolation playbooks */}
        <div className="space-y-2">
          <SectionLabel>Remediation actions</SectionLabel>
          <motion.div
            key={(workspace ? workspace.investigation.investigation_id : alert.id) + "-actions"}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: 0.12, ease: "easeOut" }}
            className="space-y-1.5"
          >
            {/* Isolate node */}
            <div className="flex items-center justify-between py-1.5 group">
              <div className="flex items-center gap-2 min-w-0">
                <Unplug className="w-3 h-3 text-red-400/70 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[12px] text-gray-300 font-sans">
                    Isolate host
                  </p>
                  <p className="text-[10px] text-gray-600 font-mono truncate">
                    {sourceVal}
                  </p>
                </div>
              </div>

              {quarantineStatus === "quarantining" ? (
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <div className="w-16 h-0.5 bg-border-custom/30 rounded-full overflow-hidden">
                    <div
                      className="bg-red-500/60 h-full transition-all duration-200 rounded-full"
                      style={{ width: `${quarantineProgress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono shrink-0">
                    {quarantineProgress}%
                  </span>
                </div>
              ) : (
                <button
                  onClick={onIsolate}
                  disabled={quarantineStatus !== "active"}
                  className={`shrink-0 ml-2 text-[11px] px-2.5 py-1 rounded-md border transition-all duration-120 cursor-pointer font-sans ${
                    quarantineStatus === "quarantined"
                      ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5 cursor-default"
                      : "text-gray-400 border-border-custom/30 hover:text-gray-200 hover:border-gray-500/30 hover:bg-elevated/40 disabled:opacity-30 disabled:cursor-not-allowed"
                  }`}
                >
                  {quarantineStatus === "quarantined" ? "✓ Host Isolated" : "Isolate"}
                </button>
              )}
            </div>

            {/* Block IP — only if available */}
            {alert.details.ipAddress && (
              <div className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Shield className="w-3 h-3 text-blue-400/70 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[12px] text-gray-300 font-sans">
                      Block IP
                    </p>
                    <p className="text-[10px] text-gray-600 font-mono truncate">
                      {alert.details.ipAddress}
                      {alert.details.port ? `:${alert.details.port}` : ""}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onBlockIp}
                  disabled={isBlockApplied}
                  className={`shrink-0 ml-2 text-[11px] px-2.5 py-1 rounded-md border transition-all duration-120 cursor-pointer font-sans ${
                    isBlockApplied
                      ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5 cursor-default opacity-70"
                      : "text-gray-400 border-border-custom/30 hover:text-gray-200 hover:border-gray-500/30 hover:bg-elevated/40 disabled:opacity-30 disabled:cursor-not-allowed"
                  }`}
                >
                  {isBlockApplied ? "Blocked" : "Block"}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* ── Isolation toast banner ── */}
      {quarantineStatus === "quarantined" && (
        <div className="mx-4 mb-0 mt-2 px-3 py-2 rounded-lg bg-emerald-500/8 border border-emerald-500/20 flex items-center gap-2 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <p className="text-[11px] text-emerald-400 font-sans">
            Containment playbook dispatched. Target network segments successfully quarantined.
          </p>
        </div>
      )}

      {/* ── Pinned Conversation history ── */}
      <div className="border-t border-border-custom/15 bg-bg/50 px-4 py-3 shrink-0 flex flex-col min-h-0 max-h-[260px] md:max-h-[300px]">
        <button
          onClick={() => setConversationOpen((v) => !v)}
          className="flex items-center justify-between w-full group cursor-pointer pb-2"
          aria-expanded={conversationOpen}
        >
          <p className="text-[10px] tracking-wide text-gray-500 font-sans uppercase">
            Case Chat
          </p>
          <ChevronDown
            className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-150 ${
              conversationOpen ? "rotate-0" : "-rotate-90"
            }`}
          />
        </button>

        <AnimatePresence initial={false}>
          {conversationOpen && (
            <motion.div
              key="conversation"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-1 scrollbar-thin pb-1"
            >
              <div className="space-y-3">
                {chatMessages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className={`flex flex-col ${
                      msg.sender === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <span className="text-[10px] text-gray-600 mb-1 px-0.5 font-sans">
                      {msg.sender === "ai" ? "Vector" : "You"} · {msg.time}
                    </span>
                    <div className="flex items-start gap-1 max-w-[96%] group relative">
                      <div
                        className={`rounded-lg px-2.5 py-1.5 text-[12px] leading-relaxed ${
                          msg.sender === "user"
                            ? "bg-violet-500/8 text-gray-300"
                            : "bg-surface/60 text-gray-400"
                        }`}
                      >
                        <div className="prose prose-invert prose-xs max-w-none [&_p]:my-0 [&_strong]:text-gray-300 font-sans select-text">
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.text, i)}
                        className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-300 p-1 rounded transition-opacity cursor-pointer shrink-0"
                        title="Copy message"
                      >
                        {copiedId === i ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </motion.div>
                ))}

                {isResponding && (
                  <div className="flex flex-col items-start">
                    <span className="text-[10px] text-gray-600 mb-1 px-0.5 font-sans">
                      Vector
                    </span>
                    <div className="bg-surface/60 rounded-lg px-2.5 py-2 flex items-center gap-1">
                      {[0, 100, 200].map((delay) => (
                        <motion.span
                          key={delay}
                          className="w-1 h-1 rounded-full bg-violet-400/60"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{
                            duration: 1.2,
                            repeat: Infinity,
                            delay: delay / 1000,
                            ease: "easeInOut",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Input — always pinned to bottom ── */}
      <form
        onSubmit={handleSend}
        className="px-4 py-3 border-t border-border-custom/15 flex items-center gap-2 shrink-0 bg-surface/10"
      >
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="Ask Vector..."
          className="flex-1 bg-transparent border border-border-custom/20 focus:border-violet-500/30 focus:outline-none rounded-lg px-3 py-1.5 text-[12px] text-gray-200 placeholder-gray-600 transition-colors duration-150 font-sans"
        />
        <button
          type="submit"
          disabled={!chatInput.trim()}
          className="p-1.5 text-gray-500 hover:text-violet-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-120 cursor-pointer shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
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
