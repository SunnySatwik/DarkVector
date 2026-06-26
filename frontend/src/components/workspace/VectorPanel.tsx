/**
 * VectorPanel
 *
 * Right-rail AI analyst panel for InvestigationWorkspace.
 * Focuses purely on Recommended actions and Chat Conversation with Vector.
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Send,
  Unplug,
  Shield,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Alert } from "../../types";

export interface VectorPanelProps {
  alert: Alert;
  quarantineStatus: "active" | "quarantining" | "quarantined";
  quarantineProgress: number;
  isBlockApplied: boolean;
  onIsolate: () => void;
  onBlockIp: () => void;
}

export function VectorPanel({
  alert,
  quarantineStatus,
  quarantineProgress,
  isBlockApplied,
  onIsolate,
  onBlockIp,
}: VectorPanelProps) {
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<
    { sender: "ai" | "user"; text: string; time: string }[]
  >([]);
  const [isResponding, setIsResponding] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Seed initial Vector message on alert change
  useEffect(() => {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const categorySummary: Record<string, string> = {
      process: "a container escape attempt via namespace manipulation",
      network: "data exfiltration through an unauthorized egress path",
      authentication: "credential compromise through geographic anomaly",
      system: "privilege escalation via IAM policy drift",
    };

    setChatMessages([
      {
        sender: "ai",
        text: `I've reviewed the evidence for **${alert.id}**. The primary indicators suggest ${
          categorySummary[alert.category] ?? "an anomalous security event"
        }. Ask me anything about this case.`,
        time,
      },
    ]);
  }, [alert]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isResponding]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const text = chatInput.trim();
    setChatInput("");
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setChatMessages((prev) => [...prev, { sender: "user", text, time }]);
    setIsResponding(true);

    setTimeout(() => {
      const q = text.toLowerCase();
      let reply: string;

      if (q.includes("isolate") || q.includes("quarantine")) {
        reply = `To isolate **\`${alert.source}\`**, I'll apply a Kubernetes NetworkPolicy with \`spec.policyTypes: [Egress]\` blocking all outbound routes. Use the **Isolate node** action below to dispatch.`;
      } else if (q.includes("explain") || q.includes("why") || q.includes("shap")) {
        const factors = alert.details.shapFactors ?? [];
        reply = `The top contributing factors for **${alert.id}** are:\n\n${factors
          .map((f) => `- **${f.factor}**: ${(f.impact * 100).toFixed(0)}% influence`)
          .join("\n")}\n\nThese deviations together pushed the score above the critical threshold.`;
      } else if (q.includes("cve") || q.includes("mitre") || q.includes("threat")) {
        reply = `This incident correlates with **MITRE ATT&CK T1611** (Escape to Host) at 92% similarity and **CVE-2022-0847 (Dirty Pipe)** at 85%. The namespace manipulation technique is consistent with APT-29 container breakout patterns.`;
      } else {
        reply = `I've cross-referenced your query against the case context for **${alert.id}**. The source node \`${alert.source}\` is currently ${
          quarantineStatus === "quarantined" ? "isolated" : "active"
        }. Would you like me to generate a remediation script or draft a report?`;
      }

      setChatMessages((prev) => [...prev, { sender: "ai", text: reply, time }]);
      setIsResponding(false);
    }, 700);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-3.5 py-3 border-b border-border-custom/40 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <div>
            <p className="text-secondary-body font-medium text-gray-200 font-sans">Vector</p>
            <p className="text-caption text-gray-500">AI security partner</p>
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto min-h-0 px-3.5 py-3.5 scrollbar-thin space-y-5">
        
        {/* Recommended Actions */}
        <div className="space-y-2.5">
          <p className="text-caption text-gray-500 font-sans">Recommended actions</p>
          
          <div className="space-y-3">
            {/* Isolate */}
            <div className="rounded-lg bg-surface/40 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Unplug className="w-3.5 h-3.5 text-red-400/90" />
                  <span className="text-secondary-body font-medium text-gray-200">Isolate node</span>
                </div>
                <span
                  className={`text-mono-small font-mono px-1.5 py-0.5 rounded border ${
                    quarantineStatus === "quarantined"
                      ? "text-red-400 bg-red-500/8 border-red-500/20"
                      : quarantineStatus === "quarantining"
                        ? "text-orange-400 bg-orange-500/8 border-orange-500/20"
                        : "text-gray-500 bg-black/30 border-border-custom/40"
                  }`}
                >
                  {quarantineStatus === "quarantined"
                    ? "Isolated"
                    : quarantineStatus === "quarantining"
                      ? "Working…"
                      : "Ready"}
                </span>
              </div>
              <p className="text-caption text-gray-500 leading-snug">
                Applies a Kubernetes NetworkPolicy to block all egress from{" "}
                <code className="text-gray-400 text-mono-small font-mono">{alert.source}</code>.
              </p>
              {quarantineStatus === "quarantining" && (
                <div className="w-full h-1 bg-black/40 rounded-full overflow-hidden">
                  <div
                    className="bg-red-500 h-full transition-all duration-200 rounded-full"
                    style={{ width: `${quarantineProgress}%` }}
                  />
                </div>
              )}
              <button
                onClick={onIsolate}
                disabled={quarantineStatus !== "active"}
                className="w-full text-caption font-medium py-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors cursor-pointer"
              >
                {quarantineStatus === "quarantined"
                  ? "Node isolated"
                  : quarantineStatus === "quarantining"
                    ? "Applying…"
                    : "Dispatch isolation"}
              </button>
            </div>

            {/* Block IP */}
            {alert.details.ipAddress && (
              <div className="rounded-lg bg-surface/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-blue-400/90" />
                    <span className="text-secondary-body font-medium text-gray-200">Block IP</span>
                  </div>
                  <span
                    className={`text-mono-small font-mono px-1.5 py-0.5 rounded border ${
                      isBlockApplied
                        ? "text-emerald-400 bg-emerald-500/8 border-emerald-500/20"
                        : "text-gray-500 bg-black/30 border-border-custom/40"
                    }`}
                  >
                    {isBlockApplied ? "Active" : "Ready"}
                  </span>
                </div>
                <p className="text-caption text-gray-500 leading-snug">
                  Firewall block for{" "}
                  <code className="text-gray-400 text-mono-small font-mono">{alert.details.ipAddress}</code> on
                  port <code className="text-gray-400 text-mono-small font-mono">{alert.details.port || 443}</code>.
                </p>
                <button
                  onClick={onBlockIp}
                  disabled={isBlockApplied}
                  className="w-full text-caption font-medium py-1.5 rounded-lg bg-blue-600/80 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors cursor-pointer"
                >
                  {isBlockApplied ? "Shield deployed" : "Commit egress block"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Conversation */}
        <div className="space-y-2.5 pt-1.5">
          <p className="text-caption text-gray-500 font-sans">Conversation</p>
          <div className="space-y-3.5">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                <span className="text-mono-small text-gray-500 mb-1 px-1">
                  {msg.sender === "ai" ? "Vector" : "You"} · {msg.time}
                </span>
                <div
                  className={`max-w-[95%] rounded-xl px-3 py-2 text-secondary-body leading-relaxed border ${
                    msg.sender === "user"
                      ? "bg-primary-blue/10 border-primary-blue/20 text-gray-300"
                      : "bg-surface border-border-custom/30 text-gray-300"
                  }`}
                >
                  <div className="prose prose-invert prose-xs max-w-none [&_p]:my-0 [&_strong]:text-gray-200 font-sans">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}

            {isResponding && (
              <div className="flex flex-col items-start">
                <span className="text-mono-small text-gray-500 mb-1 px-1">Vector</span>
                <div className="bg-surface border border-border-custom/30 rounded-xl px-3 py-2 flex items-center gap-1">
                  {[0, 75, 150].map((delay) => (
                    <span
                      key={delay}
                      className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>
      </div>

      {/* Chat input */}
      <form
        onSubmit={handleSend}
        className="px-3.5 py-3 border-t border-border-custom/40 flex items-center gap-2 shrink-0 bg-surface/50"
      >
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="Ask Vector anything…"
          className="flex-1 bg-surface border border-border-custom/40 focus:border-violet-500/40 focus:outline-none rounded-lg px-3 py-1.5 text-secondary-body text-gray-200 placeholder-gray-600 transition-colors"
        />
        <button
          type="submit"
          className="p-1.5 bg-violet-600/80 hover:bg-violet-600 text-white rounded-lg transition-colors shrink-0 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
