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
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { AnalyzeResponse } from "../api/types";
import { sendChatMessage } from "../api/investigations";

interface AiAnalystPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAlert: Alert | null;
  analysis: AnalyzeResponse | null;
  onIsolateNode?: (nodeId: string) => void;
}

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  isStreaming?: boolean;
}

export default function AiAnalystPanel({
  isOpen,
  onClose,
  selectedAlert,
  analysis,
  onIsolateNode,
}: AiAnalystPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleCopy = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setToastMessage("Copied to clipboard");
    setTimeout(() => {
      setCopiedId(null);
      setToastMessage(null);
    }, 2000);
  };

  // Initialize chat when alert changes
  useEffect(() => {
    if (selectedAlert) {
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
          text: `I'm ready. Select an alert from the feed and I'll walk you through what I see — the risk factors, the most likely attack pattern, and what I'd recommend doing next.`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    }
  }, [selectedAlert, analysis]);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !selectedAlert) return;

    const userMsgText = inputValue;
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Format current history for LLM
    const formattedHistory = messages.map(m => ({
      sender: m.sender,
      text: m.text
    }));

    setMessages((prev) => [...prev, { sender: "user", text: userMsgText, timestamp }]);
    setInputValue("");
    setIsTyping(true);

    try {
      const reply = await sendChatMessage(
        undefined,
        userMsgText,
        formattedHistory,
        selectedAlert.id
      );
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: reply, timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }
      ]);
    } catch (err) {
      console.error("Panel chat failed:", err);
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "I experienced an error connecting to my primary analyst database. Please try again.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };



  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="ai-analyst-panel"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 280 }}
          className="fixed top-0 right-0 bottom-0 w-full sm:w-[480px] bg-[#111317] border-l border-[#23262F] shadow-2xl z-40 flex flex-col"
        >
          {/* Header */}
          <div className="p-4 border-b border-[#23262F] flex items-center justify-between bg-[#161A22]/40">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
              <h2 className="text-sm font-sans font-semibold text-gray-200">
                Vector AI Security Analyst
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="p-1 hover:bg-[#161A22] rounded transition-colors text-gray-400 hover:text-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Core Telemetry and Anomaly Explainer */}
          {selectedAlert && (
            <div className="p-4 border-b border-[#23262F] bg-black/20 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] font-sans font-semibold text-gray-500 uppercase tracking-wider">
                  Explainable ML Analytics
                </div>
                <div className="flex gap-1.5 items-center">
                  {analysis?.analysis?.severity && (
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                      analysis.analysis.severity.toUpperCase() === "CRITICAL" || analysis.analysis.severity.toUpperCase() === "HIGH"
                        ? "text-red-400 bg-red-400/10 border-red-500/20"
                        : analysis.analysis.severity.toUpperCase() === "MEDIUM"
                        ? "text-amber-400 bg-amber-400/10 border-amber-500/20"
                        : "text-green-400 bg-green-400/10 border-green-500/20"
                    }`}>
                      {analysis.analysis.severity}
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-red-400 bg-red-400/10 px-2 py-0.5 rounded border border-red-500/20">
                    Score {analysis?.analysis?.anomaly_score?.toFixed(3) ?? "--"}
                  </span>
                </div>
              </div>

              {/* Live Model Metrics */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-[#161A22]/50 border border-[#23262F]/60 rounded p-2 text-center">
                  <div className="text-[10px] font-mono text-gray-500">
                    Risk Score
                  </div>
                  <div className="text-xs font-mono font-semibold text-red-400 mt-1">
                    {analysis ? analysis.analysis.risk_score : "--"}
                  </div>
                </div>

                <div className="bg-[#161A22]/50 border border-[#23262F]/60 rounded p-2 text-center">
                  <div className="text-[10px] font-mono text-gray-500">
                    Anomaly Score
                  </div>
                  <div className="text-xs font-mono font-semibold text-purple-400 mt-1">
                    {analysis ? analysis.analysis.anomaly_score.toFixed(3) : "--"}
                  </div>
                </div>
              </div>
              <div className="mb-4 rounded-lg bg-[#161A22]/40 border border-[#23262F]/50 p-3">

                <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-2">
                  Executive Summary
                </div>

                <p className="text-xs text-gray-300 leading-relaxed">
                  {analysis?.explanation.summary ??
                    "Generating analysis..."}
                </p>

              </div>

              {/* SHAP Values Feature Importance Explanations */}
              <div className="space-y-2">
                <div className="text-[10px] font-sans font-semibold text-gray-500 uppercase tracking-wider">
                  Key Factor Explanations
                </div>
                <div className="space-y-2 bg-[#161A22]/30 border border-[#23262F]/40 rounded-lg p-3">
                  {analysis?.explanation.top_factors && analysis.explanation.top_factors.length > 0 ? (
                    analysis.explanation.top_factors.map((factor, i) => {
                      const feature = factor.feature.replace(/^num__|^cat__/, "").replace(/_/g, " ");
                      let desc = "";
                      if (feature.includes("bytes transferred")) {
                        desc = "The volume of data transferred contributed strongly to this alert because it deviated significantly from historical behaviour.";
                      } else if (feature.includes("port")) {
                        desc = "The connection port contributed strongly to this alert because it is not typical for this server's workload profile.";
                      } else if (feature.includes("source")) {
                        desc = "The host server contributed strongly to this alert because it is executing actions outside its normal baseline.";
                      } else if (feature.includes("type")) {
                        desc = "The alert type signature contributed strongly to this alert because it matches known threat signatures.";
                      } else if (feature.includes("command line") || feature.includes("process path")) {
                        desc = "The runtime process path or command line contributed strongly because it deviates from standard operations.";
                      } else {
                        desc = `The parameter "${feature}" contributed strongly to this alert because it deviated significantly from historical behavior.`;
                      }
                      return (
                        <p key={i} className="text-xs text-gray-300 leading-relaxed font-sans">
                          • {desc}
                        </p>
                      );
                    })
                  ) : (
                    <p className="text-xs text-gray-500 font-sans italic">
                      The risk score is driven by the overall pattern deviation rather than a single feature.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Interactive Chat Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
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
                    className={`rounded-xl px-3 py-2 text-xs font-sans leading-relaxed border ${msg.sender === "user"
                      ? "bg-blue-500/10 border-blue-500/30 text-gray-100"
                      : "bg-[#161A22] border-[#23262F] text-gray-300"
                      }`}
                  >
                    {/* Markdown inside AI response */}
                    <div className="markdown-body prose prose-invert prose-xs max-w-none select-text">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(msg.text, i)}
                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-300 p-1.5 rounded transition-opacity cursor-pointer shrink-0"
                    title="Copy message"
                  >
                    {copiedId === i ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex flex-col items-start">
                <div className="text-[9px] font-mono text-gray-500 mb-1 px-1 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 text-purple-400 animate-spin" />
                  <span>AI Analyst computing anomaly path...</span>
                </div>
                <div className="bg-[#161A22] border border-[#23262F] rounded-xl px-3 py-2.5 text-xs text-gray-400 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce delay-75" />
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce delay-150" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input Field */}
          <form
            onSubmit={handleSendMessage}
            className="p-4 border-t border-[#23262F] bg-[#161A22]/20 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask for network policy, containment command, or log explainers..."
              className="flex-1 bg-[#09090B] border border-[#23262F] rounded-lg px-3 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
            <button
              type="submit"
              className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors shadow shadow-purple-500/20 animate-pulse-slow"
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
