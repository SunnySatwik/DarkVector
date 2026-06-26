/**
 * VectorPanel
 *
 * Right-rail AI analyst panel for InvestigationWorkspace.
 * Contains collapsible sections: Summary, Evidence, Reasoning, Confidence, Actions.
 * Includes an inline chat thread for asking Vector questions.
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  ChevronDown,
  Send,
  FileText,
  Fingerprint,
  BookOpen,
  TrendingUp,
  Zap,
  Unplug,
  Shield,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Alert } from "../../types";

// ─── Collapsible section ─────────────────────────────────────────────────────

interface SectionDef {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SECTIONS: SectionDef[] = [
  { id: "summary", label: "Summary", icon: FileText },
  { id: "evidence", label: "Evidence", icon: Fingerprint },
  { id: "reasoning", label: "Reasoning", icon: BookOpen },
  { id: "confidence", label: "Confidence", icon: TrendingUp },
  { id: "actions", label: "Recommended actions", icon: Zap },
];

function CollapsibleSection({
  section,
  isOpen,
  onToggle,
  children,
}: {
  section: SectionDef;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const Icon = section.icon;
  return (
    <div className="border-b border-[#23262F]/40 last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-3 px-1 text-left hover:bg-[#161A22]/20 rounded transition-colors group"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-gray-500 group-hover:text-gray-400 transition-colors" />
          <span className="text-[11px] font-medium text-gray-300 group-hover:text-gray-200 transition-colors">
            {section.label}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        >
          <ChevronDown className="w-3.5 h-3.5 text-gray-600" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-3 px-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── VectorPanel ─────────────────────────────────────────────────────────────

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
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    summary: true,
    evidence: false,
    reasoning: false,
    confidence: false,
    actions: true,
  });

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

  const toggle = (id: string) =>
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));

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

  const shapFactors = alert.details.shapFactors ?? [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#23262F]/40 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-gray-200">Vector</p>
            <p className="text-[9px] text-gray-500">AI security analyst</p>
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 scrollbar-thin">
        {/* Summary */}
        <CollapsibleSection
          section={SECTIONS[0]}
          isOpen={openSections.summary}
          onToggle={() => toggle("summary")}
        >
          <p className="text-[11px] text-gray-400 leading-relaxed">
            {alert.description} The anomaly score of{" "}
            <strong className="text-gray-300">{alert.score}%</strong> places this incident in the
            critical tier requiring immediate action.
          </p>
        </CollapsibleSection>

        {/* Evidence */}
        <CollapsibleSection
          section={SECTIONS[1]}
          isOpen={openSections.evidence}
          onToggle={() => toggle("evidence")}
        >
          <div className="space-y-2">
            {alert.details.commandLine && (
              <div className="bg-black/30 border border-[#23262F]/40 rounded-lg p-2.5">
                <p className="text-[9px] text-gray-500 mb-1">Command line</p>
                <code className="text-[10px] text-red-300 font-mono break-all">
                  {alert.details.commandLine}
                </code>
              </div>
            )}
            {alert.details.ipAddress && (
              <div className="bg-black/30 border border-[#23262F]/40 rounded-lg p-2.5 flex justify-between items-center">
                <span className="text-[9px] text-gray-500">Destination</span>
                <span className="text-[10px] font-mono text-orange-300">
                  {alert.details.ipAddress}:{alert.details.port || 443}
                </span>
              </div>
            )}
            <div className="bg-black/30 border border-[#23262F]/40 rounded-lg p-2.5 flex justify-between items-center">
              <span className="text-[9px] text-gray-500">Source node</span>
              <span className="text-[10px] font-mono text-blue-300">{alert.source}</span>
            </div>
          </div>
        </CollapsibleSection>

        {/* Reasoning */}
        <CollapsibleSection
          section={SECTIONS[2]}
          isOpen={openSections.reasoning}
          onToggle={() => toggle("reasoning")}
        >
          <div className="space-y-2.5">
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Pattern matches <strong className="text-gray-300">APT-29 (Cozy Bear)</strong>{" "}
              container escape strategy at 92.4% similarity.
            </p>
            <div className="bg-black/30 border border-[#23262F]/30 rounded-lg p-2.5">
              <p className="text-[9px] text-gray-500 mb-1">Correlated CVE</p>
              <p className="text-[10px] text-blue-300 font-mono">CVE-2022-0847 (Dirty Pipe)</p>
              <p className="text-[9px] text-gray-500 mt-0.5">85.1% match on privilege escalation path</p>
            </div>
          </div>
        </CollapsibleSection>

        {/* Confidence */}
        <CollapsibleSection
          section={SECTIONS[3]}
          isOpen={openSections.confidence}
          onToggle={() => toggle("confidence")}
        >
          <div className="space-y-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-400">Overall confidence</span>
              <span className="text-sm font-semibold text-gray-200">{alert.score}%</span>
            </div>
            <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${
                  alert.score >= 85
                    ? "bg-red-500"
                    : alert.score >= 70
                      ? "bg-orange-500"
                      : "bg-yellow-500"
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${alert.score}%` }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>

            {shapFactors.length > 0 && (
              <div className="space-y-2 pt-1">
                <p className="text-[9px] text-gray-500 font-medium">Contributing factors</p>
                {shapFactors.map((f, i) => (
                  <div key={i}>
                    <div className="flex justify-between mb-0.5">
                      <span className="text-[9px] text-gray-500 truncate max-w-[160px]">
                        {f.factor}
                      </span>
                      <span className="text-[9px] text-gray-400 font-mono">
                        {(f.impact * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full h-1 bg-black/40 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-violet-500/70 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${f.impact * 100}%` }}
                        transition={{
                          duration: 0.5,
                          delay: i * 0.08,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Recommended actions */}
        <CollapsibleSection
          section={SECTIONS[4]}
          isOpen={openSections.actions}
          onToggle={() => toggle("actions")}
        >
          <div className="space-y-2.5">
            {/* Isolate */}
            <div className="rounded-lg border border-[#23262F]/60 bg-black/20 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Unplug className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-[11px] font-medium text-gray-200">Isolate node</span>
                </div>
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                    quarantineStatus === "quarantined"
                      ? "text-red-400 bg-red-500/8 border-red-500/20"
                      : quarantineStatus === "quarantining"
                        ? "text-orange-400 bg-orange-500/8 border-orange-500/20"
                        : "text-gray-500 bg-black/30 border-[#23262F]"
                  }`}
                >
                  {quarantineStatus === "quarantined"
                    ? "Isolated"
                    : quarantineStatus === "quarantining"
                      ? "Working…"
                      : "Ready"}
                </span>
              </div>
              <p className="text-[10px] text-gray-500 leading-snug">
                Applies a Kubernetes NetworkPolicy to block all egress from{" "}
                <code className="text-gray-400 text-[9px]">{alert.source}</code>.
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
                className="w-full text-[10px] font-medium py-1.5 rounded-md bg-red-600/80 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
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
              <div className="rounded-lg border border-[#23262F]/60 bg-black/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[11px] font-medium text-gray-200">Block IP</span>
                  </div>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                      isBlockApplied
                        ? "text-emerald-400 bg-emerald-500/8 border-emerald-500/20"
                        : "text-gray-500 bg-black/30 border-[#23262F]"
                    }`}
                  >
                    {isBlockApplied ? "Active" : "Ready"}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 leading-snug">
                  Firewall block for{" "}
                  <code className="text-gray-400 text-[9px]">{alert.details.ipAddress}</code> on
                  port <code className="text-gray-400 text-[9px]">{alert.details.port || 443}</code>.
                </p>
                <button
                  onClick={onBlockIp}
                  disabled={isBlockApplied}
                  className="w-full text-[10px] font-medium py-1.5 rounded-md bg-blue-600/80 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                >
                  {isBlockApplied ? "Shield deployed" : "Commit egress block"}
                </button>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Chat thread */}
        <div className="pt-3 pb-2">
          <p className="text-[9px] text-gray-600 font-medium mb-2 px-1">Ask Vector</p>
          <div className="space-y-3">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                <span className="text-[9px] text-gray-600 mb-1 px-1">
                  {msg.sender === "ai" ? "Vector" : "You"} · {msg.time}
                </span>
                <div
                  className={`max-w-[95%] rounded-xl px-3 py-2 text-[11px] leading-relaxed border ${
                    msg.sender === "user"
                      ? "bg-blue-500/8 border-blue-500/15 text-gray-300"
                      : "bg-[#161A22]/60 border-[#23262F]/60 text-gray-300"
                  }`}
                >
                  <div className="prose prose-invert prose-xs max-w-none [&_p]:my-0 [&_strong]:text-gray-200">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}

            {isResponding && (
              <div className="flex flex-col items-start">
                <span className="text-[9px] text-gray-600 mb-1 px-1">Vector</span>
                <div className="bg-[#161A22]/60 border border-[#23262F]/60 rounded-xl px-3 py-2 flex items-center gap-1">
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
        className="px-4 py-3 border-t border-[#23262F]/40 flex items-center gap-2 shrink-0 bg-[#0d0f13]"
      >
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="Ask Vector anything…"
          className="flex-1 bg-[#161A22]/60 border border-[#23262F]/60 focus:border-violet-500/50 focus:outline-none rounded-lg px-3 py-1.5 text-[11px] text-gray-200 placeholder-gray-600 transition-colors"
        />
        <button
          type="submit"
          className="p-1.5 bg-violet-600/80 hover:bg-violet-600 text-white rounded-lg transition-colors shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
