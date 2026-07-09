import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Alert } from "../types";
import {
  Sparkles,
  BrainCircuit,
  X,
  RefreshCw,
  Send,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Activity,
  Target,
  Shield,
  BookOpen,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { AnalyzeResponse } from "../api/types";
import { sendChatMessage } from "../api/investigations";
import { useInvestigations, useTimeline } from "../hooks/useInvestigations";
import { WorkspaceViewModel } from "../lib/workspaceMapper";

interface AiAnalystPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAlert: Alert | null;
  analysis: AnalyzeResponse | null;
  onIsolateNode?: (nodeId: string) => void;
  investigationId?: string | null;
  workspace?: WorkspaceViewModel | null;
}

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  isStreaming?: boolean;
}

interface CollapsiblePanelProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  icon: React.ComponentType<any>;
  children: React.ReactNode;
}

function CollapsiblePanel({
  title,
  isOpen,
  onToggle,
  icon: Icon,
  children,
}: CollapsiblePanelProps) {
  return (
    <div className="border-b border-[#1F232B] last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full py-3.5 px-4 flex items-center justify-between text-left hover:bg-[#161A22]/20 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Icon className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-semibold text-gray-200 tracking-wide font-sans">
            {title}
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-[#111317]/50 border-t border-[#1F232B]/50 text-xs text-gray-300 leading-relaxed space-y-3 font-sans">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AiAnalystPanel({
  isOpen,
  onClose,
  selectedAlert,
  analysis,
  onIsolateNode,
  investigationId,
  workspace,
}: AiAnalystPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Collapsible section toggles
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isMitreOpen, setIsMitreOpen] = useState(false);
  const [isThreatIntelOpen, setIsThreatIntelOpen] = useState(false);
  const [isKnowledgeOpen, setIsKnowledgeOpen] = useState(false);

  // Fetch investigations list using react-query hook to map Alert ID to Investigation ID
  const { data: investigationsData } = useInvestigations();

  const investigationsList = Array.isArray(investigationsData)
    ? investigationsData
    : (investigationsData as any)?.investigations;

  const matchingInvestigation = investigationsList?.find(
    (inv: any) => inv.alert_id === selectedAlert?.id
  );

  const viewInvId = workspace
    ? workspace.investigation.investigation_id
    : (investigationId || matchingInvestigation?.investigation_id);

  const investigationStatus = workspace
    ? workspace.investigation.status
    : (matchingInvestigation?.status || selectedAlert?.status || "open");

  // Fetch timeline data using react-query hook
  const { data: timelineData, isPending: isTimelinePending } = useTimeline(
    workspace ? undefined : viewInvId
  );

  const timeline = workspace ? workspace.timeline : timelineData;
  const isTimelineLoading = workspace ? false : isTimelinePending;

  const handleCopy = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setToastMessage("Copied to clipboard");
    setTimeout(() => {
      setCopiedId(null);
      setToastMessage(null);
    }, 2000);
  };

  // Initialize chat when alert or workspace changes
  useEffect(() => {
    if (workspace) {
      const inv = workspace.investigation;
      let text = `I have loaded the consolidated AI context for **${inv.investigation_id}** ("${inv.title}").`;
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

      setMessages([
        {
          sender: "ai",
          text,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } else if (selectedAlert) {
      if (!analysis) {
        setMessages([
          {
            sender: "ai",
            text: `I'm reviewing **${selectedAlert.id}** now. Give me a moment to assess the signals and put together a picture of what happened.`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      } else {
        const shapExplanations = analysis.explanation.top_factors
          ?.map((f) => {
            const feature = f.feature.replace(/^num__|^cat__/, "").replace(/_/g, " ");
            if (feature.includes("bytes transferred")) {
              return `- The volume of data transferred contributed strongly to this alert because it deviated significantly from historical behaviour.`;
            }
            if (feature.includes("port")) {
              return `- The network connection port contributed strongly because it is not typical for this server's workload profile.`;
            }
            if (feature.includes("source")) {
              return `- The host server contributed strongly to this alert because it is executing actions outside its normal baseline.`;
            }
            if (feature.includes("type")) {
              return `- The trigger type signature contributed strongly because it matches known anomalous patterns.`;
            }
            if (feature.includes("command line") || feature.includes("process path")) {
              return `- The executed process path or command line parameters contributed strongly because they deviate from standard operations.`;
            }
            return `- The system attribute **${feature}** showed a marked deviation from historical patterns.`;
          })
          .join("\n") || "- The overall event pattern deviates from historical baseline behavior.";

        setMessages([
          {
            sender: "ai",
            text: `I have completed the analysis of **${selectedAlert.id}** on host \`${selectedAlert.source}\`.
 
### • What I found
The event was flagged with an anomaly score of **${analysis.analysis.anomaly_score?.toFixed(3) ?? "--"}** and a risk score of **${analysis.analysis.risk_score ?? "--"}**. 
 
Here are the key factors that contributed to this anomaly score:
${shapExplanations}
 
### • Why it matters
${analysis.explanation.summary}
 
### • Recommended next steps
1. **Isolate host** \`${selectedAlert.source}\` immediately to prevent potential command-and-control (C2) communication or lateral movement.
2. **Audit process lineage** and parent processes in the process chain to trace execution flow.
3. **Verify network connections** and remote endpoints for known indicators of compromise (IOCs).`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      }
    } else {
      setMessages([
        {
          sender: "ai",
          text: `I'm ready. Select an alert from the feed or load a case, and I'll walk you through the risk factors, attack patterns, and recommendations.`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    }
  }, [selectedAlert, analysis, workspace]);

  // Scroll to bottom of chat scroll window when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    if (!workspace && !selectedAlert) return;

    const userMsgText = inputValue;
    const timestamp = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Format current history for LLM
    const formattedHistory = messages.map((m) => ({
      sender: m.sender,
      text: m.text,
    }));

    setMessages((prev) => [
      ...prev,
      { sender: "user", text: userMsgText, timestamp },
    ]);
    setInputValue("");
    setIsTyping(true);

    try {
      const reply = await sendChatMessage(
        viewInvId || undefined,
        userMsgText,
        formattedHistory,
        !viewInvId ? selectedAlert?.id : undefined
      );
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: reply,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } catch (err) {
      console.error("Panel chat failed:", err);
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "I experienced an error connecting to my primary analyst database. Please try again.",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // Extract variables for rendering
  const severity = workspace
    ? workspace.investigation.severity
    : (analysis?.analysis?.severity ?? selectedAlert?.severity ?? "low");
    
  const riskScore = workspace
    ? workspace.investigation.risk_score
    : (analysis?.analysis?.risk_score ?? selectedAlert?.score ?? 0);
    
  const anomalyScore = workspace
    ? (workspace.investigation.risk_score / 100)
    : (analysis?.analysis?.anomaly_score ?? (selectedAlert?.score ? selectedAlert.score / 100 : 0));

  let confidence: number | null = null;
  if (workspace) {
    const confVal = workspace.investigation.confidence;
    if (confVal !== null) {
      confidence = confVal <= 1.0 ? Math.round(confVal * 100) : Math.round(confVal);
    }
  } else if (analysis?.analysis?.confidence) {
    confidence = Math.round(analysis.analysis.confidence * 100);
  }

  // Build list of deterministic citations
  const citations: string[] = [];
  if (workspace) {
    if (workspace.isBehavioral) {
      citations.push("Behavioral Detection Evidence");
      if (workspace.processes.length > 0) {
        citations.push("Process Execution Evidence");
      }
      if (workspace.correlation) {
        citations.push("Detection Correlation Group");
      }
    } else {
      if (workspace.legacyAlert?.details?.processPath || workspace.legacyAlert?.details?.commandLine) {
        citations.push("Evidence Graph");
      }
    }
    if (workspace.timeline.length > 0) {
      citations.push("Investigation Timeline");
    }
  } else {
    if (analysis?.context?.mitre?.technique_id && analysis.context.mitre.technique_id !== "N/A") {
      citations.push(`MITRE ATT&CK ${analysis.context.mitre.technique_id}`);
    }
    if (
      analysis?.context?.threat_intelligence?.reputation &&
      analysis.context.threat_intelligence.reputation !== "N/A"
    ) {
      citations.push("Threat Intelligence");
    }
    if (analysis?.explanation?.top_factors && analysis.explanation.top_factors.length > 0) {
      citations.push("SHAP Feature Attribution");
    }
    if (selectedAlert?.details?.processPath || selectedAlert?.details?.commandLine) {
      citations.push("Evidence Graph");
    }
    if (timeline && timeline.length > 0) {
      citations.push("Investigation Timeline");
    }
  }
  if (messages.length > 1) {
    citations.push("Conversation History");
  }

  // RAG retrieved documents checking
  const retrievedDocs =
    (analysis as any)?.retrieved_documents ||
    (analysis as any)?.retrieved_knowledge ||
    [];
  const showRetrievedKnowledge = retrievedDocs.length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="ai-analyst-panel"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 280 }}
          className="fixed top-0 right-0 bottom-0 w-full sm:w-[540px] bg-[#0E1116] border-l border-[#1F232B] shadow-2xl z-40 flex flex-col"
        >
          {/* Header */}
          <div className="p-4 border-b border-[#1F232B] flex items-center justify-between bg-[#161A22]/40 shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
              <h2 className="text-xs font-semibold text-gray-200 font-sans tracking-wide">
                Vector AI Security Analyst
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-[#161A22] rounded transition-colors text-gray-400 hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Current Assessment - Sticky Banner */}
          {(workspace || selectedAlert) && (
            <div className="p-4 border-b border-[#1F232B] bg-[#14181F]/80 backdrop-blur-sm shrink-0">
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-[#111317] border border-[#1F232B] rounded-lg p-2 flex flex-col justify-center">
                  <div className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Severity
                  </div>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold border mx-auto ${
                      severity.toUpperCase() === "CRITICAL"
                        ? "text-red-400 bg-red-400/10 border-red-500/20"
                        : severity.toUpperCase() === "HIGH"
                        ? "text-orange-400 bg-orange-400/10 border-orange-500/20"
                        : severity.toUpperCase() === "MEDIUM"
                        ? "text-amber-400 bg-amber-400/10 border-amber-500/20"
                        : "text-green-400 bg-green-400/10 border-green-500/20"
                    }`}
                  >
                    {severity.toUpperCase()}
                  </span>
                </div>

                <div className="bg-[#111317] border border-[#1F232B] rounded-lg p-2 flex flex-col justify-center">
                  <div className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Risk Score
                  </div>
                  <div className="text-xs font-mono font-bold text-red-400">
                    {riskScore.toFixed(0)}%
                  </div>
                </div>

                <div className="bg-[#111317] border border-[#1F232B] rounded-lg p-2 flex flex-col justify-center">
                  <div className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Confidence
                  </div>
                  <div className="text-xs font-mono font-bold text-purple-400">
                    {confidence !== null ? `${confidence}%` : "--"}
                  </div>
                </div>

                <div className="bg-[#111317] border border-[#1F232B] rounded-lg p-2 flex flex-col justify-center">
                  <div className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Status
                  </div>
                  <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-400/10 border border-blue-500/20 px-1.5 py-0.5 rounded mx-auto uppercase">
                    {investigationStatus}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Main Scrollable Feed */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {workspace ? (
              <>
                {/* Findings summary card */}
                <div className="bg-[#14181F] border border-[#1F232B] rounded-xl p-4 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-gray-200 uppercase tracking-wider font-sans">
                      Investigation Assessment
                    </h3>
                    <span className="text-[10px] font-mono text-gray-500">
                      Score: {riskScore.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed font-sans">
                    {workspace.isBehavioral ? (
                      <>
                        This is an autonomous behavioral detection investigation with {workspace.detections.length} correlated detections trigger-analyzed by the security engine.
                      </>
                    ) : (
                      <>
                        This is a legacy anomaly investigation resolving the details of trigger alert ID {workspace.investigation.alert_id}.
                      </>
                    )}
                  </p>
                </div>

                {/* Recommendations actions */}
                {workspace.recommendations && workspace.recommendations.length > 0 && (
                  <div className="bg-[#14181F] border border-[#1F232B] rounded-xl p-4 space-y-3 shadow-sm">
                    <h3 className="text-xs font-semibold text-gray-200 uppercase tracking-wider font-sans">
                      Containment playbooks
                    </h3>
                    <div className="space-y-2">
                      {workspace.recommendations.map((rec, i) => (
                        <div key={i} className="flex gap-2.5 items-start">
                          <div className="w-5 h-5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {i + 1}
                          </div>
                          <div className="text-xs text-gray-300 font-sans leading-relaxed">
                            {rec}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Accordion Panels */}
                <div className="border border-[#1F232B] rounded-xl overflow-hidden bg-[#14181F]/40 shadow-sm">
                  {/* Evidence Section */}
                  <CollapsiblePanel
                    title="Forensic Evidence"
                    isOpen={isEvidenceOpen}
                    onToggle={() => setIsEvidenceOpen(!isEvidenceOpen)}
                    icon={Shield}
                  >
                    <div className="space-y-3">
                      <div>
                        <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">
                          Evidence Citations
                        </div>
                        {citations.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {citations.map((cite, i) => (
                              <span
                                key={i}
                                className="text-[10px] font-mono text-purple-400 bg-purple-400/10 border border-purple-500/20 px-2 py-0.5 rounded"
                              >
                                {cite}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-500 italic font-sans">
                            No citations registered.
                          </span>
                        )}
                      </div>

                      {workspace.isBehavioral ? (
                        <div className="bg-[#111317] border border-[#1F232B] rounded p-2.5 space-y-1.5 font-mono text-[10px] text-gray-400">
                          <div>
                            <span className="text-gray-500 font-sans">Detections count:</span>{" "}
                            <span className="text-gray-200">{workspace.detections.length}</span>
                          </div>
                          {workspace.primaryDetection && (
                            <div>
                              <span className="text-gray-500 font-sans">Primary technique:</span>{" "}
                              <span className="text-gray-200">{workspace.primaryDetection.mitre_technique || "N/A"}</span>
                            </div>
                          )}
                          {workspace.processes.length > 0 && (
                            <div>
                              <span className="text-gray-500 font-sans">Primary executable:</span>{" "}
                              <span className="text-gray-200 break-all">{workspace.processes[0].executable || "N/A"}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        workspace.legacyAlert?.details && (
                          <div className="bg-[#111317] border border-[#1F232B] rounded p-2.5 space-y-1.5 font-mono text-[10px] text-gray-400">
                            {workspace.legacyAlert.details.processPath && (
                              <div>
                                <span className="text-gray-500">process_path:</span>{" "}
                                <span className="text-gray-300">
                                  {workspace.legacyAlert.details.processPath}
                                </span>
                              </div>
                            )}
                            {workspace.legacyAlert.details.commandLine && (
                              <div>
                                <span className="text-gray-500">command_line:</span>{" "}
                                <span className="text-gray-300 break-all">
                                  {workspace.legacyAlert.details.commandLine}
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </CollapsiblePanel>

                  {/* Timeline Section */}
                  <CollapsiblePanel
                    title="Audit Timeline"
                    isOpen={isTimelineOpen}
                    onToggle={() => setIsTimelineOpen(!isTimelineOpen)}
                    icon={Activity}
                  >
                    {isTimelineLoading ? (
                      <div className="flex items-center justify-center py-4 gap-2 text-gray-500 font-sans">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Loading chronological logs...</span>
                      </div>
                    ) : timeline && timeline.length > 0 ? (
                      <div className="space-y-3.5 relative pl-1">
                        {timeline.map((ev, i) => (
                          <div key={i} className="flex gap-3 items-start">
                            <div className="flex flex-col items-center mt-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500/80 border border-blue-400/30" />
                              {i < timeline.length - 1 && (
                                <div className="w-[1px] bg-[#1F232B] h-6 my-1" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between text-[9px] text-gray-500 mb-0.5 font-mono">
                                <span>{ev.actor || "System"}</span>
                                <span>
                                  {new Date(ev.timestamp).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <p className="text-xs text-gray-200 font-sans">{ev.title}</p>
                              {ev.description && (
                                <p className="text-[10px] text-gray-500 mt-0.5 leading-normal">
                                  {ev.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-3 text-gray-500 italic font-sans">
                        No events logged in investigation timeline.
                      </div>
                    )}
                  </CollapsiblePanel>

                  {/* MITRE ATT&CK Section */}
                  <CollapsiblePanel
                    title="MITRE ATT&CK Assessment"
                    isOpen={isMitreOpen}
                    onToggle={() => setIsMitreOpen(!isMitreOpen)}
                    icon={Target}
                  >
                    {workspace.mitreMappings && workspace.mitreMappings.length > 0 ? (
                      <div className="space-y-3">
                        {workspace.mitreMappings.map((m, i) => (
                          <div key={i} className="pb-2.5 border-b border-[#1F232B] last:border-b-0 last:pb-0">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-mono font-semibold text-purple-400">
                                {m.technique_id}
                              </span>
                              {m.tactic && (
                                <span className="text-[9px] font-sans text-gray-400 bg-purple-500/10 px-1.5 py-0.2 rounded border border-purple-500/20">
                                  {m.tactic}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-sans font-semibold text-gray-200 mb-1">
                              {m.technique_name}
                            </div>
                            <p className="text-[10px] text-gray-400 leading-normal font-sans">
                              {m.description || "No description provided."}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-2 text-gray-500 italic font-sans">
                        No mapping data loaded.
                      </div>
                    )}
                  </CollapsiblePanel>

                  {/* Threat Intelligence Section */}
                  {workspace.legacyAnalysis?.context?.threat_intelligence && (
                    <CollapsiblePanel
                      title="Threat Intelligence"
                      isOpen={isThreatIntelOpen}
                      onToggle={() => setIsThreatIntelOpen(!isThreatIntelOpen)}
                      icon={Shield}
                    >
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-center pb-2 border-b border-[#1F232B]">
                          <div>
                            <div className="text-[9px] text-gray-500 font-mono uppercase">
                              Reputation
                            </div>
                            <span
                              className={`text-xs font-mono font-bold capitalize ${
                                workspace.legacyAnalysis.context.threat_intelligence.reputation === "malicious"
                                  ? "text-red-400"
                                  : workspace.legacyAnalysis.context.threat_intelligence.reputation === "suspicious"
                                  ? "text-orange-400"
                                  : "text-green-400"
                              }`}
                            >
                              {workspace.legacyAnalysis.context.threat_intelligence.reputation || "unknown"}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-[9px] text-gray-500 font-mono uppercase">
                              Confidence
                            </div>
                            <span className="text-xs font-mono font-semibold text-gray-200">
                              {workspace.legacyAnalysis.context.threat_intelligence.confidence
                                ? `${Math.round(
                                    workspace.legacyAnalysis.context.threat_intelligence.confidence * 100
                                  )}%`
                                : "--"}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-sans font-semibold text-gray-200 mb-1">
                            Threat Summary
                          </div>
                          <p className="text-xs text-gray-400 leading-relaxed font-sans">
                            {workspace.legacyAnalysis.context.threat_intelligence.summary ||
                              "No external intelligence records resolved."}
                          </p>
                        </div>
                      </div>
                    </CollapsiblePanel>
                  )}
                </div>
              </>
            ) : selectedAlert && analysis ? (
              <>
                {/* What I Found Card */}
                <div className="bg-[#14181F] border border-[#1F232B] rounded-xl p-4 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-gray-200 uppercase tracking-wider font-sans">
                      What I Found
                    </h3>
                    <span className="text-[10px] font-mono text-gray-500">
                      Anomaly Score: {anomalyScore.toFixed(3)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed font-sans">
                    The security event on host <code className="text-red-400 font-mono bg-red-400/5 px-1 py-0.5 rounded border border-red-400/10">{selectedAlert.source}</code> was flag-checked with a risk score of {riskScore}. Key anomalous feature patterns discovered:
                  </p>
                  <div className="space-y-2 pt-1 border-t border-[#1F232B]">
                    {analysis.explanation.top_factors &&
                    analysis.explanation.top_factors.length > 0 ? (
                      analysis.explanation.top_factors.map((factor, i) => {
                        const feature = factor.feature
                          .replace(/^num__|^cat__/, "")
                          .replace(/_/g, " ");
                        let explanationStr = "";
                        if (feature.includes("bytes transferred")) {
                          explanationStr = "Data transfer volume deviates significantly from host's typical workload.";
                        } else if (feature.includes("port")) {
                          explanationStr = "Egress port is outside standard network services for this server profile.";
                        } else if (feature.includes("source")) {
                          explanationStr = "Host server behaviors represent a marked deviation from operations baseline.";
                        } else if (feature.includes("type")) {
                          explanationStr = "Threat signature matches known malicious action patterns.";
                        } else if (
                          feature.includes("command line") ||
                          feature.includes("process path")
                        ) {
                          explanationStr = "Process execution path or CLI parameters indicate abnormal user actions.";
                        } else {
                          explanationStr = `Attribute parameter "${feature}" deviates from historical patterns.`;
                        }

                        // Cap impact display at 100%
                        const percent = Math.min(Math.round(factor.impact * 100), 100);

                        return (
                          <div key={i} className="space-y-1.5">
                            <div className="flex justify-between text-[11px]">
                              <span className="font-mono text-gray-300 capitalize">
                                {feature}
                              </span>
                              <span className="text-red-400 font-mono font-semibold">
                                {percent}% Impact
                              </span>
                            </div>
                            <div className="w-full bg-[#111317] rounded-full h-1.5 overflow-hidden border border-[#1F232B]/50">
                              <div
                                className="bg-red-500/70 h-full rounded-full transition-all duration-500"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-gray-500 leading-normal pl-2 border-l border-red-500/20 font-sans">
                              {explanationStr}
                            </p>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-gray-500 font-sans italic text-center py-2">
                        Driven by cumulative deviation metrics rather than a single feature.
                      </p>
                    )}
                  </div>
                </div>

                {/* Why It Matters Card */}
                <div className="bg-[#14181F] border border-[#1F232B] rounded-xl p-4 space-y-2.5 shadow-sm">
                  <h3 className="text-xs font-semibold text-gray-200 uppercase tracking-wider font-sans">
                    Why It Matters
                  </h3>
                  <div className="text-xs text-gray-300 leading-relaxed font-sans prose prose-invert max-w-none">
                    <ReactMarkdown>{analysis.explanation.summary}</ReactMarkdown>
                  </div>
                </div>

                {/* Recommended Actions Card */}
                <div className="bg-[#14181F] border border-[#1F232B] rounded-xl p-4 space-y-3 shadow-sm">
                  <h3 className="text-xs font-semibold text-gray-200 uppercase tracking-wider font-sans">
                    Recommended Actions
                  </h3>
                  <div className="space-y-2">
                    <div className="flex gap-2.5 items-start">
                      <div className="w-5 h-5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                        1
                      </div>
                      <div className="text-xs text-gray-300 font-sans">
                        <strong className="text-gray-200">Isolate Host:</strong> Isolate{" "}
                        <code className="text-red-400 font-mono bg-red-400/5 px-1 py-0.5 rounded border border-red-400/10">
                          {selectedAlert.source}
                        </code>{" "}
                        immediately to break active command-and-control connection tunnels.
                      </div>
                    </div>
                    <div className="flex gap-2.5 items-start">
                      <div className="w-5 h-5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                        2
                      </div>
                      <div className="text-xs text-gray-300 font-sans">
                        <strong className="text-gray-200">Audit Process Lineage:</strong> Analyze
                        spawned process trees and parent descriptors to locate privilege escalation keys.
                      </div>
                    </div>
                    <div className="flex gap-2.5 items-start">
                      <div className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                        3
                      </div>
                      <div className="text-xs text-gray-300 font-sans">
                        <strong className="text-gray-200">Verify Network Egress:</strong> Review
                        destination IPs and egress logs to flag external communication pathways.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Collapsible Accordion Panels */}
                <div className="border border-[#1F232B] rounded-xl overflow-hidden bg-[#14181F]/40 shadow-sm">
                  {/* Evidence Section */}
                  <CollapsiblePanel
                    title="Evidence"
                    isOpen={isEvidenceOpen}
                    onToggle={() => setIsEvidenceOpen(!isEvidenceOpen)}
                    icon={Shield}
                  >
                    <div className="space-y-3">
                      <div>
                        <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">
                          Evidence Used
                        </div>
                        {citations.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {citations.map((cite, i) => (
                              <span
                                key={i}
                                className="text-[10px] font-mono text-purple-400 bg-purple-400/10 border border-purple-500/20 px-2 py-0.5 rounded"
                              >
                                {cite}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-500 italic font-sans">
                            No citations registered.
                          </span>
                        )}
                      </div>

                      {selectedAlert?.details && (
                        <div>
                          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">
                            Evidence Graph Summary
                          </div>
                          <div className="bg-[#111317] border border-[#1F232B] rounded p-2.5 space-y-1.5 font-mono text-[10px] text-gray-400">
                            {selectedAlert.details.processPath && (
                              <div>
                                <span className="text-gray-500">process_path:</span>{" "}
                                <span className="text-gray-300">
                                  {selectedAlert.details.processPath}
                                </span>
                              </div>
                            )}
                            {selectedAlert.details.commandLine && (
                              <div>
                                <span className="text-gray-500">command_line:</span>{" "}
                                <span className="text-gray-300 break-all">
                                  {selectedAlert.details.commandLine}
                                </span>
                              </div>
                            )}
                            {selectedAlert.details.ipAddress && (
                              <div>
                                <span className="text-gray-500">dest_ip:</span>{" "}
                                <span className="text-gray-300">
                                  {selectedAlert.details.ipAddress}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </CollapsiblePanel>

                  {/* Timeline Section */}
                  <CollapsiblePanel
                    title="Timeline"
                    isOpen={isTimelineOpen}
                    onToggle={() => setIsTimelineOpen(!isTimelineOpen)}
                    icon={Activity}
                  >
                    {isTimelineLoading ? (
                      <div className="flex items-center justify-center py-4 gap-2 text-gray-500 font-sans">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Loading chronological logs...</span>
                      </div>
                    ) : timeline && timeline.length > 0 ? (
                      <div className="space-y-3.5 relative pl-1">
                        {timeline.map((ev, i) => (
                          <div key={i} className="flex gap-3 items-start">
                            <div className="flex flex-col items-center mt-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500/80 border border-blue-400/30" />
                              {i < timeline.length - 1 && (
                                <div className="w-[1px] bg-[#1F232B] h-6 my-1" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between text-[9px] text-gray-500 mb-0.5 font-mono">
                                <span>{ev.actor || "System"}</span>
                                <span>
                                  {new Date(ev.timestamp).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <p className="text-xs text-gray-200 font-sans">{ev.title}</p>
                              {ev.description && (
                                <p className="text-[10px] text-gray-500 mt-0.5 font-sans leading-relaxed">
                                  {ev.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-3 text-gray-500 italic font-sans">
                        No events logged in investigation timeline.
                      </div>
                    )}
                  </CollapsiblePanel>

                  {/* MITRE ATT&CK Section */}
                  <CollapsiblePanel
                    title="MITRE ATT&CK"
                    isOpen={isMitreOpen}
                    onToggle={() => setIsMitreOpen(!isMitreOpen)}
                    icon={Target}
                  >
                    {analysis?.context?.mitre ? (
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-center pb-2 border-b border-[#1F232B]">
                          <div>
                            <div className="text-[9px] text-gray-500 font-mono uppercase">
                              Technique
                            </div>
                            <span className="text-xs font-mono font-semibold text-gray-200">
                              {analysis.context.mitre.technique_id || "N/A"}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-[9px] text-gray-500 font-mono uppercase">
                              Tactic
                            </div>
                            <span className="text-xs font-sans font-semibold text-gray-200">
                              {analysis.context.mitre.tactic || "N/A"}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-sans font-semibold text-gray-200 mb-1">
                            {analysis.context.mitre.technique_name}
                          </div>
                          <p className="text-xs text-gray-400 leading-relaxed font-sans">
                            {analysis.context.mitre.description || "No description provided."}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-2 text-gray-500 italic font-sans">
                        No mapping data loaded.
                      </div>
                    )}
                  </CollapsiblePanel>

                  {/* Threat Intelligence Section */}
                  <CollapsiblePanel
                    title="Threat Intelligence"
                    isOpen={isThreatIntelOpen}
                    onToggle={() => setIsThreatIntelOpen(!isThreatIntelOpen)}
                    icon={Shield}
                  >
                    {analysis?.context?.threat_intelligence ? (
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-center pb-2 border-b border-[#1F232B]">
                          <div>
                            <div className="text-[9px] text-gray-500 font-mono uppercase">
                              Reputation
                            </div>
                            <span
                              className={`text-xs font-mono font-bold capitalize ${
                                analysis.context.threat_intelligence.reputation === "malicious"
                                  ? "text-red-400"
                                  : analysis.context.threat_intelligence.reputation === "suspicious"
                                  ? "text-orange-400"
                                  : "text-green-400"
                              }`}
                            >
                              {analysis.context.threat_intelligence.reputation || "unknown"}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-[9px] text-gray-500 font-mono uppercase">
                              Confidence
                            </div>
                            <span className="text-xs font-mono font-semibold text-gray-200">
                              {analysis.context.threat_intelligence.confidence
                                ? `${Math.round(
                                    analysis.context.threat_intelligence.confidence * 100
                                  )}%`
                                : "--"}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-sans font-semibold text-gray-200 mb-1">
                            Threat Summary
                          </div>
                          <p className="text-xs text-gray-400 leading-relaxed font-sans">
                            {analysis.context.threat_intelligence.summary ||
                              "No external intelligence records resolved."}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-2 text-gray-500 italic font-sans">
                        No threat intelligence matches found.
                      </div>
                    )}
                  </CollapsiblePanel>

                  {/* Retrieved Knowledge Section */}
                  {showRetrievedKnowledge && (
                    <CollapsiblePanel
                      title="Retrieved Knowledge"
                      isOpen={isKnowledgeOpen}
                      onToggle={() => setIsKnowledgeOpen(!isKnowledgeOpen)}
                      icon={BookOpen}
                    >
                      <div className="space-y-3.5">
                        {retrievedDocs.map((doc: any, i: number) => (
                          <div
                            key={i}
                            className="bg-[#111317] border border-[#1F232B] rounded p-3 space-y-2"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-xs font-semibold text-gray-200 font-sans">
                                {doc.title || "Retrieved Document"}
                              </span>
                              <span className="text-[9px] font-mono text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded uppercase font-bold shrink-0">
                                {doc.authority || "community"}
                              </span>
                            </div>
                            {doc.summary && (
                              <p className="text-[10px] text-gray-400 leading-relaxed italic font-sans">
                                {doc.summary}
                              </p>
                            )}
                            <div className="text-[11px] text-gray-300 font-sans prose prose-invert prose-xs max-w-none pt-1.5 border-t border-[#1F232B]/50">
                              <ReactMarkdown>{doc.content}</ReactMarkdown>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsiblePanel>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500 space-y-3">
                <BrainCircuit className="w-8 h-8 text-gray-600 animate-pulse" />
                <p className="text-xs font-sans">
                  Select an alert from the incident feed or load a case to trigger automated ML context analysis.
                </p>
              </div>
            )}

            {/* Conversation Interface */}
            {selectedAlert && (
              <div className="space-y-4 pt-4 border-t border-[#1F232B]">
                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 font-sans">
                  Follow-up Investigation Conversation
                </div>

                <div className="space-y-4">
                  {messages.slice(1).map((msg, i) => (
                    <div
                      key={i}
                      className={`flex flex-col ${
                        msg.sender === "user" ? "items-end" : "items-start"
                      }`}
                    >
                      <div className="text-[9px] font-mono text-gray-500 mb-1 px-1 flex items-center gap-1">
                        {msg.sender === "ai" ? (
                          <>
                            <BrainCircuit className="w-3 h-3 text-purple-400" />
                            <span>Vector AI Security Analyst</span>
                          </>
                        ) : (
                          <span>Security Analyst (You)</span>
                        )}
                        <span>• {msg.timestamp}</span>
                      </div>

                      <div className="flex items-start gap-1.5 max-w-[92%] group relative">
                        <div
                          className={`rounded-xl px-3 py-2 text-xs font-sans leading-relaxed border ${
                            msg.sender === "user"
                              ? "bg-blue-500/10 border-blue-500/30 text-gray-100"
                              : "bg-[#14181F] border-[#1F232B] text-gray-300"
                          }`}
                        >
                          <div className="markdown-body prose prose-invert prose-xs max-w-none select-text">
                            <ReactMarkdown>{msg.text}</ReactMarkdown>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.text, i + 1)}
                          className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-300 p-1.5 rounded transition-opacity cursor-pointer shrink-0"
                          title="Copy message"
                        >
                          {copiedId === i + 1 ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}

                  {messages.length <= 1 && (
                    <p className="text-[10px] text-gray-500 italic font-sans text-center py-2 bg-[#14181F]/30 border border-[#1F232B]/30 rounded-lg">
                      Ask a follow-up question below regarding containment, log queries, or threat signatures...
                    </p>
                  )}

                  {isTyping && (
                    <div className="flex flex-col items-start animate-fade-in">
                      <div className="text-[9px] font-mono text-gray-500 mb-1 px-1 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 text-purple-400 animate-spin" />
                        <span>AI Analyst computing anomaly path...</span>
                      </div>
                      <div className="bg-[#14181F] border border-[#1F232B] rounded-xl px-3 py-2 text-xs text-gray-400 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce delay-75" />
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce delay-150" />
                      </div>
                    </div>
                  )}
                </div>
                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* Chat Input Field (Form) */}
          {(workspace || selectedAlert) && (
            <form
              onSubmit={handleSendMessage}
              className="p-4 border-t border-[#1F232B] bg-[#111317] flex items-center gap-2 shrink-0"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask for network policy, containment command, or log explainers..."
                className="flex-1 bg-[#09090B] border border-[#1F232B] rounded-lg px-3 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
              <button
                type="submit"
                className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors shadow shadow-purple-500/20 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
