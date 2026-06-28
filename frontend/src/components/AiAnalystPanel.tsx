import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Alert } from "../types";
import {
  Sparkles,
  BrainCircuit,
  X,
  MessageSquare,
  Terminal,
  RefreshCw,
  Send,
  ShieldAlert,
  CheckCircle,
  ShieldX,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { AnalyzeResponse } from "../api/types";

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
  const [activeModel, setActiveModel] = useState("Gemini-2.5-Security");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize chat when alert changes
  useEffect(() => {
    if (selectedAlert) {
      setMessages([
        {
          sender: "ai",
          text: `### 🔍 DarkVector Vector AI Analysis: Incident ${selectedAlert.id}
  
I have analyzed the threat log originating from \`${selectedAlert.source}\`. The event has an **Isolation Forest anomaly score of ${(selectedAlert.score / 100).toFixed(3)}**, which strongly correlates with typical **malicious post-compromise activity**.
  
#### Key Indicators (SHAP Explainer):
${selectedAlert.details.shapFactors?.map((f) => `- **${f.factor}** accounts for **${(f.impact * 100).toFixed(0)}%** of the decision deviation.`).join("\n") || "- Lack of baseline behavioral data."}
  
#### Reconstructed Adversary Path:
1. Spawning of atypical shell binaries via unverified parent container layer (\`${selectedAlert.details.parentProcess || "system-d"}\`).
2. Immediate execution of raw socket redirection towards suspected command-and-control subnet.
  
#### Recommended Mitigation Playbook:
- [ ] **Quarantine host node / container network** to stop command-and-control communication.
- [ ] **Revoke credentials** associated with active process.
- [ ] **Rebuild image state** with strict read-only root filesystems.`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } else {
      setMessages([
        {
          sender: "ai",
          text: `### 🌌 DarkVector Security Co-pilot Active

Welcome to your AI forensics workspace. Select any active warning or critical alert from the feed to perform a deeper **SHAP Explainability analysis**, or ask me directly to generate containment commands.

*Suggested commands:*
- *"Analyze current container isolation states"*
- *"Show active malicious connection origins"*
- *"Draft a Kubernetes NetworkPolicy to block external IPs"*`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    }
  }, [selectedAlert]);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMsgText = inputValue;
    const timestamp = new Date().toLocaleTimeString();

    setMessages((prev) => [...prev, { sender: "user", text: userMsgText, timestamp }]);
    setInputValue("");
    setIsTyping(true);

    // Simulate cyber security response stream after 1.5s
    setTimeout(() => {
      let aiResponseText = "";
      if (
        userMsgText.toLowerCase().includes("isolate") ||
        userMsgText.toLowerCase().includes("quarantine")
      ) {
        aiResponseText = `### ⚠️ Initiating Quarantine Validation Sequence
        
I can generate the command block to isolate node \`${selectedAlert?.source || "srv-k8s-api-01"}\` instantly. Please verify your administrative rights.

\`\`\`bash
# DarkVector Agent Containment Action
kubectl patch deployment ${selectedAlert?.source.split("-")[0] || "k8s-pod"} -p '{"spec":{"template":{"metadata":{"labels":{"darkvector.security/quarantine":"true"}}}}}'
\`\`\`

*Would you like me to dispatch this command to the primary sensor via gRPC now?*`;
      } else if (
        userMsgText.toLowerCase().includes("block") ||
        userMsgText.toLowerCase().includes("networkpolicy")
      ) {
        aiResponseText = `### 🛡️ Generated Kubernetes NetworkPolicy
        
Apply this network block to terminate egress connections to external IP \`${selectedAlert?.details.ipAddress || "194.26.135.84"}\`:

\`\`\`yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: block-malicious-egress-vector
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: srv-k8s-api
  policyTypes:
  - Egress
  egress:
  - to:
    - ipBlock:
        cidr: 0.0.0.0/0
        except:
        - ${selectedAlert?.details.ipAddress || "194.26.135.84"}/32
\`\`\`

Apply this manifest via \`kubectl apply -f blocking-policy.yaml\`.`;
      } else {
        aiResponseText = `### 🔮 Platform Intelligence Context
        
I am monitoring active process signals. For telemetry segment \`${selectedAlert?.id || "GLOBAL-CORE"}\`, the model predicts high behavioral risk.

- **Process Integrity Index:** 12% (Critical degradation)
- **RAG ChromaDB Correlation:** Found 3 similar signatures involving Docker container escaping.
- **SHAP Impact Weights:** Process lineage depth represents the primary trigger.

Would you like me to audit the historical execution tree of this node?`;
      }

      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: aiResponseText, timestamp: new Date().toLocaleTimeString() },
      ]);
      setIsTyping(false);
    }, 1500);
  };

  const triggerIsolate = () => {
    if (selectedAlert && onIsolateNode) {
      onIsolateNode(selectedAlert.source);
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
              <select
                value={activeModel}
                onChange={(e) => setActiveModel(e.target.value)}
                className="bg-[#09090B] border border-[#23262F] text-[10px] font-mono text-purple-400 rounded px-2 py-0.5 focus:outline-none"
              >
                <option value="Gemini-2.5-Security">Gemini 2.5 Security</option>
                <option value="DeepMind-DV-S1">DeepMind-DV-S1</option>
                <option value="RAG-Chroma-Hybrid">RAG-Chroma Hybrid</option>
              </select>
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
                <span className="text-[10px] font-mono font-semibold text-gray-500 uppercase tracking-wider">
                  Explainable ML Analytics
                </span>
                <span className="text-[10px] font-mono text-red-400 bg-red-400/10 px-1.5 py-0.2 rounded border border-red-500/20">
                  Anomaly Score: {analysis?.analysis.anomaly_score.toFixed(3) ?? "--"}
                </span>
              </div>

              {/* Isolation Forest Metrics */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-[#161A22]/50 border border-[#23262F]/60 rounded p-2 text-center">
                  <div className="text-[10px] font-mono text-gray-500">Isol. Forest Score</div>
                  <div className="text-xs font-mono font-semibold text-orange-400 mt-1">
                    {selectedAlert.details.isolationForestScore || "0.74"}
                  </div>
                </div>
                <div className="bg-[#161A22]/50 border border-[#23262F]/60 rounded p-2 text-center">
                  <div className="text-[10px] font-mono text-gray-500">RAG Semantic Match</div>
                  <div className="text-xs font-mono font-semibold text-blue-400 mt-1">
                    ChromaDB (98%)
                  </div>
                </div>
              </div>

              {/* SHAP Values Feature Importance Progress list */}
              <div className="space-y-2">
                <div className="text-[10px] font-mono text-gray-400">SHAP Parameter Weights:</div>
                {selectedAlert.details.shapFactors?.map((f, i) => (
                  <div key={i} className="text-[11px]">
                    <div className="flex items-center justify-between text-gray-400 mb-1">
                      <span className="truncate max-w-[280px]">{f.factor}</span>
                      <span className="font-mono text-[10px] text-purple-400">
                        {(f.impact * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-[#09090B] h-1.5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${f.impact * 100}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Instant Node Actions inside AI Drawer */}
              <div className="mt-4 pt-4 border-t border-[#23262F]/40 flex gap-2">
                <button
                  onClick={triggerIsolate}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg py-2 text-xs font-medium transition-colors"
                >
                  <ShieldX className="w-3.5 h-3.5" />
                  Isolate Node Context
                </button>
                <button
                  onClick={() => alert("Tracing path details deployed to SIEM dashboard")}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-[#161A22] hover:bg-[#23262F] border border-[#23262F] text-gray-300 rounded-lg py-2 text-xs font-medium transition-colors"
                >
                  <Terminal className="w-3.5 h-3.5 text-gray-400" />
                  Export Telemetry
                </button>
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
                      <span>DarkVector AI Co-pilot</span>
                    </>
                  ) : (
                    <span>Security Analyst (You)</span>
                  )}
                  <span>• {msg.timestamp}</span>
                </div>

                <div
                  className={`max-w-[92%] rounded-xl px-3 py-2 text-xs font-sans leading-relaxed border ${msg.sender === "user"
                    ? "bg-blue-500/10 border-blue-500/30 text-gray-100"
                    : "bg-[#161A22] border-[#23262F] text-gray-300"
                    }`}
                >
                  {/* Markdown inside AI response */}
                  <div className="markdown-body prose prose-invert prose-xs max-w-none">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
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
              className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors shadow shadow-purple-500/20"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
