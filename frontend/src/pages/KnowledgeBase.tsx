import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  BookOpen,
  ShieldAlert,
  Cpu,
  Sparkles,
  HelpCircle,
  Check,
  Terminal,
} from "lucide-react";
import { Card, Button, Badge } from "../components/ui/DesignSystem";

interface Tactic {
  id: string;
  technique: string;
  tacticName: string;
  description: string;
  aptCorrelations: string[];
  mitigationCmd: string;
}

const MOCK_TACTICS: Tactic[] = [
  {
    id: "T1059.004",
    technique: "Unix Shell Execution",
    tacticName: "Execution",
    description:
      "Adversaries may abuse Unix shell utilities to execute malicious scripts, redirect stdout streams, and spawn reverse shell egress vectors.",
    aptCorrelations: ["APT-29 (Cozy Bear)", "APT-28 (Fancy Bear)"],
    mitigationCmd: "auditctl -a always,exit -F arch=b64 -S execve -k audit-commands",
  },
  {
    id: "T1611",
    technique: "Escape to Host Container",
    tacticName: "Privilege Escalation",
    description:
      "Abusing mounted control groups (cgroups), Docker socket paths, or container capabilities to break virtualization constraints and execute code on bare-metal masters.",
    aptCorrelations: ["APT-29 (Cozy Bear)", "Sandworm Team"],
    mitigationCmd:
      "kubectl patch securityContext --type merge -p '{\"readOnlyRootFilesystem\": true}'",
  },
  {
    id: "T1071.001",
    technique: "Web Protocols C2 Connection",
    tacticName: "Command & Control",
    description:
      "Adversaries may communicate with command-and-control servers using web protocols like HTTPS/gRPC to bypass perimeter firewall egress restrictions.",
    aptCorrelations: ["Lazarus Group", "APT-41 (Double Dragon)"],
    mitigationCmd: "istioctl secure-egress-gateway --direction=OUTBOUND",
  },
  {
    id: "T1055",
    technique: "Process Injection Traceback",
    tacticName: "Defense Evasion",
    description:
      "Injecting malicious dynamic libraries or payloads into verified systemd or Kubernetes daemonsets to spoof active monitor metrics.",
    aptCorrelations: ["APT-28 (Fancy Bear)", "Turla"],
    mitigationCmd: "sysctl -w kernel.yama.ptrace_scope=2",
  },
];

export default function KnowledgeBase() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTactic, setSelectedTactic] = useState<Tactic | null>(MOCK_TACTICS[1]); // Default to Docker escape
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyCmd = (tacticId: string, cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedId(tacticId);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const filteredTactics = MOCK_TACTICS.filter(
    (t) =>
      t.technique.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-display font-bold text-gray-100 tracking-tight flex items-center gap-2">
          MITRE ATT&CK Knowledge Base
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Explore tactical detection signatures, reference security controls catalog, and fetch
          verified terminal containment scripts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Playbook List */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search technique ID, TTP profile, or tactic keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#09090B] border border-[#23262F]/80 rounded-lg py-2 pl-9 pr-4 text-xs font-mono text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </Card>

          <Card className="p-0">
            <div className="p-4 border-b border-[#23262F]/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-400" />
                <span className="font-mono text-xs font-bold text-gray-200 uppercase tracking-wider">
                  Tactics Reference Grid
                </span>
              </div>
              <Badge variant="default">{filteredTactics.length} techniques indexed</Badge>
            </div>

            <div className="divide-y divide-[#23262F]/30">
              {filteredTactics.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTactic(t)}
                  className={`p-4 transition-colors duration-150 cursor-pointer text-left ${
                    selectedTactic?.id === t.id ? "bg-blue-500/5" : "hover:bg-[#161A22]/20"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="font-mono text-[10px] text-gray-500 uppercase font-semibold">
                        {t.id} • {t.tacticName}
                      </span>
                      <h4 className="text-xs font-semibold text-gray-200 mt-0.5">{t.technique}</h4>
                    </div>
                    <Badge variant={t.tacticName === "Privilege Escalation" ? "critical" : "blue"}>
                      {t.tacticName}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2 line-clamp-2">{t.description}</p>
                </div>
              ))}

              {filteredTactics.length === 0 && (
                <div className="p-8 text-center text-gray-500 font-mono text-xs">
                  No matching threat tactics found.
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Detailed mitigation Playbook view */}
        <div className="lg:col-span-6">
          <AnimatePresence mode="wait">
            {selectedTactic ? (
              <motion.div
                key={selectedTactic.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                <Card className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#23262F]/40 pb-3">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-purple-400" />
                      <span className="font-mono text-xs font-bold text-gray-200">
                        Mitigation Directive
                      </span>
                    </div>
                    <span className="font-mono text-[10px] font-bold text-purple-400">
                      {selectedTactic.id}
                    </span>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div>
                      <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                        Active Correlated APTs
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {selectedTactic.aptCorrelations.map((apt, idx) => (
                          <Badge key={idx} variant="purple">
                            {apt}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                        Symptom Overview
                      </div>
                      <p className="text-[11px] text-gray-300 leading-relaxed mt-1 font-sans">
                        {selectedTactic.description}
                      </p>
                    </div>

                    <div>
                      <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-gray-500" />
                        <span>Containment / Mitigation Command</span>
                      </div>
                      <div className="bg-[#09090B] border border-[#23262F]/60 rounded-lg p-3 mt-1.5 relative group">
                        <pre className="font-mono text-[10px] text-emerald-400 overflow-x-auto whitespace-pre-wrap break-all pr-8 select-all">
                          {selectedTactic.mitigationCmd}
                        </pre>
                        <button
                          onClick={() =>
                            handleCopyCmd(selectedTactic.id, selectedTactic.mitigationCmd)
                          }
                          className="absolute right-2 top-2 p-1.5 rounded bg-[#161A22] border border-[#23262F] hover:bg-[#1f2430] hover:text-white text-gray-400 transition-colors cursor-pointer"
                          title="Copy command to clipboard"
                        >
                          {copiedId === selectedTactic.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <svg
                              className="w-3 h-3"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[#23262F]/40 pt-3 flex gap-2">
                    <div className="flex items-center gap-2 text-gray-500 text-[10px] font-mono">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>Command aligned with standard K8s cis-benchmarks catalog</span>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ) : (
              <Card className="text-center py-12 text-gray-500">
                <HelpCircle className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-xs font-mono">
                  Select a tactic from the reference list to inspect aligned playbooks.
                </p>
              </Card>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
