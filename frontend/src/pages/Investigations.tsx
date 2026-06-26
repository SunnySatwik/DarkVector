import { useState } from "react";
import { motion } from "motion/react";
import { MOCK_ALERTS } from "../mockData";
import { Alert } from "../types";
import {
  Briefcase,
  AlertOctagon,
  RefreshCw,
  FolderLock,
  CheckSquare,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  ShieldX,
  Play,
  User,
  Activity,
  UserCheck,
} from "lucide-react";
import { PageHeader } from "../components/ui/DesignSystem";
import { severityBadgeClass } from "../lib/severity";

interface CaseItem {
  id: string;
  title: string;
  assignedAnalyst: string;
  status: "triage" | "review" | "quarantine" | "resolved";
  alert: Alert;
  createdTime: string;
}

interface InvestigationsProps {
  onSelectAlert?: (alert: Alert) => void;
}

export default function Investigations({ onSelectAlert }: InvestigationsProps) {
  const [cases, setCases] = useState<CaseItem[]>([
    {
      id: "CASE-402",
      title: "Pod-escape vector tracing inside Kubernetes kube-system namespace",
      assignedAnalyst: "sunnysatwik95",
      status: "triage",
      alert: MOCK_ALERTS[0],
      createdTime: "2 hours ago",
    },
    {
      id: "CASE-398",
      title: "Anomalous multi-gigabyte egress dump from central finance databases",
      assignedAnalyst: "m_chen@enterprise.com",
      status: "review",
      alert: MOCK_ALERTS[1],
      createdTime: "5 hours ago",
    },
    {
      id: "CASE-391",
      title: "Impossible physical velocity authentication bypass analysis",
      assignedAnalyst: "sunnysatwik95",
      status: "quarantine",
      alert: MOCK_ALERTS[2],
      createdTime: "12 hours ago",
    },
    {
      id: "CASE-384",
      title: "Kerberoasting credential harvesting on corporate AD domains",
      assignedAnalyst: "j_thompson",
      status: "resolved",
      alert: MOCK_ALERTS[6],
      createdTime: "Yesterday",
    },
  ]);

  const [activeCaseId, setActiveCaseId] = useState<string>("CASE-402");

  const selectedCase = cases.find((c) => c.id === activeCaseId) || cases[0];

  const moveStatus = (caseId: string, newStatus: CaseItem["status"]) => {
    setCases((prev) => prev.map((c) => (c.id === caseId ? { ...c, status: newStatus } : c)));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Investigations board"
        subtitle="Track, quarantine and resolve critical security cases powered by isolation forest tree decisions."
      />

      {/* Investigations Columns Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Kanban Board Column */}
        <div className="xl:col-span-7 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Triage Column header */}
            {(["triage", "review", "quarantine", "resolved"] as const).map((colStatus) => {
              const colCases = cases.filter((c) => c.status === colStatus);
              const columnNames = {
                triage: { label: "Triage feed", color: "border-red-500/30 text-red-400" },
                review: { label: "Under review", color: "border-purple-500/30 text-purple-400" },
                quarantine: { label: "Contained", color: "border-orange-500/30 text-orange-400" },
                resolved: { label: "Resolved", color: "border-green-500/30 text-green-400" },
              };

              return (
                <div
                  key={colStatus}
                  className="bg-[#111317] border border-[#23262F] rounded-xl p-3 flex flex-col justify-between min-h-[140px]"
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-[#23262F]/50 pb-2 mb-2">
                      <span
                        className={`text-[10px] font-mono font-bold ${columnNames[colStatus].color}`}
                      >
                        {columnNames[colStatus].label}
                      </span>
                      <span className="text-[10px] font-mono text-gray-500 font-bold bg-black/40 border border-[#23262F] px-2 py-0.5 rounded">
                        {colCases.length}
                      </span>
                    </div>

                    {/* Cards */}
                    <div className="space-y-2">
                      {colCases.map((c) => {
                        const isSelected = c.id === activeCaseId;
                        return (
                          <div
                            key={c.id}
                            onClick={() => setActiveCaseId(c.id)}
                            className={`p-4 rounded-lg border text-left cursor-pointer transition-all ${
                              isSelected
                                ? "bg-[#161A22] border-purple-500/60 shadow shadow-purple-500/10"
                                : "bg-black/20 border-[#23262F]/60 hover:border-gray-500/40"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 text-[9px] font-mono text-gray-500">
                              <span>{c.id}</span>
                              <span>{c.createdTime}</span>
                            </div>
                            <h4 className="text-xs font-semibold text-gray-200 truncate mt-1">
                              {c.title}
                            </h4>
                            <div className="flex items-center justify-between gap-2 mt-2">
                              <span
                                className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded ${severityBadgeClass(c.alert.severity)}`}
                              >
                                {c.alert.severity}
                              </span>
                              <span className="text-[9px] text-gray-500 truncate max-w-[80px]">
                                @{c.assignedAnalyst}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      {colCases.length === 0 && (
                        <div className="py-8 text-center text-gray-600 font-mono text-[9px]">
                          Empty queue
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Node Actions inside Board */}
          <div className="bg-[#111317] border border-[#23262F] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <ShieldX className="w-4 h-4 text-orange-400" />
              <h3 className="text-xs font-mono font-semibold text-gray-200">
                Active isolation playbook dispatcher
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-400">
              <div className="bg-black/20 border border-[#23262F]/50 rounded-lg p-4 space-y-2">
                <div className="font-semibold text-gray-200 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span>Isolation forest threshold</span>
                </div>
                <p className="text-[11px] text-gray-500">
                  Configure automated gRPC container quarantine triggers when model outputs exceed
                  target scores.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="50"
                    max="100"
                    defaultValue="85"
                    className="flex-1 accent-purple-500 bg-gray-900"
                  />
                  <span className="font-mono text-purple-400 font-bold">0.850</span>
                </div>
              </div>

              <div className="bg-black/20 border border-[#23262F]/50 rounded-lg p-4 flex flex-col justify-between">
                <div>
                  <div className="font-semibold text-gray-200">Active node quarantine</div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Terminate all ongoing ingress/egress connections to compromised nodes instantly
                    via API daemon.
                  </p>
                </div>
                <button
                  onClick={() =>
                    alert(`Issuing containment trigger to node: ${selectedCase.alert.source}`)
                  }
                  className="bg-orange-600/10 hover:bg-orange-600/20 border border-orange-500/30 text-orange-400 rounded-lg py-2 text-xs font-mono font-bold mt-2 cursor-pointer transition-colors"
                >
                  Quarantine node [{selectedCase.alert.source.slice(0, 12)}]
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Case Forensic Viewer Detail Panel */}
        <div className="xl:col-span-5 bg-[#111317] border border-[#23262F] rounded-xl p-4 flex flex-col justify-between min-h-[460px]">
          <div>
            <div className="flex items-center justify-between border-b border-[#23262F] pb-2 mb-4">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4.5 h-4.5 text-purple-400" />
                <h3 className="text-xs font-mono font-semibold text-gray-200">
                  Forensic examiner case file
                </h3>
              </div>
              <span className="text-[10px] font-mono text-gray-400 bg-black/40 border border-[#23262F] px-2 py-0.5 rounded">
                {selectedCase.id}
              </span>
            </div>

            {/* Case core metadata */}
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-mono text-gray-500">Investigation scope</span>
                <h2 className="text-sm font-semibold text-gray-100 mt-0.5">{selectedCase.title}</h2>
              </div>

              {/* Status controller pills */}
              <div className="flex flex-wrap gap-2">
                {(["triage", "review", "quarantine", "resolved"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => moveStatus(selectedCase.id, st)}
                    className={`px-2 py-1 rounded text-[10px] font-mono font-semibold capitalize border cursor-pointer transition-all ${
                      selectedCase.status === st
                        ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                        : "bg-transparent text-gray-500 border-[#23262F] hover:border-gray-500"
                    }`}
                  >
                    Set {st}
                  </button>
                ))}
              </div>

              {/* Assignee & Alert Details */}
              <div className="grid grid-cols-2 gap-4 bg-black/20 border border-[#23262F]/50 rounded-lg p-4 text-[11px] font-mono">
                <div>
                  <span className="text-gray-500">Assigned analyst:</span>
                  <div className="flex items-center gap-2 text-gray-300 font-semibold mt-1">
                    <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                    <span>@{selectedCase.assignedAnalyst}</span>
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Incident target:</span>
                  <div className="flex items-center gap-2 text-gray-300 mt-1">
                    <Activity className="w-3.5 h-3.5 text-blue-400" />
                    <span className="truncate max-w-[120px]">{selectedCase.alert.source}</span>
                  </div>
                </div>
              </div>

              {/* Forensic Lineage Diagram */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-gray-500">
                  Process ancestor trace lineage
                </span>
                <div className="bg-[#09090B] border border-[#23262F] rounded-lg p-4 font-mono text-[11px] text-gray-400 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span>systemd (PID 1)</span>
                  </div>
                  <div className="pl-4 border-l border-[#23262F] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span>containerd-shim (PID 8192)</span>
                  </div>
                  <div className="pl-8 border-l border-[#23262F] flex items-center gap-2 text-red-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                    <span>
                      {selectedCase.alert.details.processPath || "bash shell endpoint"} (PID 8210)
                    </span>
                  </div>
                  {selectedCase.alert.details.commandLine && (
                    <div className="pl-12 text-[10px] text-gray-500 break-all select-all bg-black/40 p-2 rounded border border-[#23262F]/40">
                      {selectedCase.alert.details.commandLine}
                    </div>
                  )}
                </div>
              </div>

              {/* SHAP explanation card */}
              <div className="bg-[#161A22]/30 border border-[#23262F] rounded-lg p-4">
                <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Model report: SHAP gain breakdown</span>
                </div>
                <div className="space-y-2 text-[10px] font-mono">
                  {selectedCase.alert.details.shapFactors?.map((sh, idx) => (
                    <div key={idx} className="flex items-center justify-between text-gray-400">
                      <span className="truncate max-w-[180px]">{sh.factor}</span>
                      <span className="text-purple-400">
                        +{(sh.impact * 100).toFixed(0)}% deviation
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-[#23262F]/40 pt-4 mt-4 space-y-3">
            {onSelectAlert && (
              <button
                onClick={() => onSelectAlert(selectedCase.alert)}
                className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold rounded-lg transition-all shadow shadow-purple-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 animate-pulse" />
                <span>Launch immersive workspace</span>
              </button>
            )}
            <div className="text-center">
              <span className="text-[10px] font-mono text-gray-500">
                ChromaDB correlates this case with APT-29 Docker-escape playbooks.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
