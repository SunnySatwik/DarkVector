import { useState, useMemo } from "react";
import { motion } from "motion/react";
import {
  Briefcase,
  AlertOctagon,
  RefreshCw,
  Sparkles,
  ShieldAlert,
  ShieldX,
  UserCheck,
  Search,
  ChevronRight,
  Shield,
  Activity,
} from "lucide-react";
import { PageHeader } from "../components/ui/DesignSystem";
import { severityBadgeClass } from "../lib/severity";
import { useInvestigations } from "../hooks/useInvestigations";
import { CaseItem, mapInvestigationToCase } from "../lib/investigationMapper";

// ─── Props ────────────────────────────────────────────────────────────────────

interface InvestigationsProps {
  onOpenInvestigation?: (investigationId: string) => void;
}

// ─── Root Component ───────────────────────────────────────────────────────────

export default function Investigations({ onOpenInvestigation }: InvestigationsProps) {
  const { data: investigations, isPending, isError } = useInvestigations();

  // Derive the canonical list from server data. Local state tracks optimistic status moves.
  const serverCases = useMemo<CaseItem[]>(
    () => (investigations ?? []).map(mapInvestigationToCase),
    [investigations]
  );

  // Local optimistic overrides: { [id]: status }
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, CaseItem["status"]>
  >({});

  const cases: CaseItem[] = useMemo(
    () =>
      serverCases.map((c) =>
        statusOverrides[c.id] ? { ...c, status: statusOverrides[c.id] } : c
      ),
    [serverCases, statusOverrides]
  );

  // Search & filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"all" | CaseItem["status"]>("all");

  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      const matchesSearch =
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = selectedFilter === "all" || c.status === selectedFilter;
      return matchesSearch && matchesFilter;
    });
  }, [cases, searchQuery, selectedFilter]);

  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);

  const selectedCase =
    filteredCases.find((c) => c.id === activeCaseId) ??
    filteredCases[0] ??
    null;

  const moveStatus = (caseId: string, newStatus: CaseItem["status"]) => {
    setStatusOverrides((prev) => ({ ...prev, [caseId]: newStatus }));
  };

  // Compute counts for filter chips
  const counts = useMemo(() => {
    return {
      all: cases.length,
      triage: cases.filter((c) => c.status === "triage").length,
      review: cases.filter((c) => c.status === "review").length,
      quarantine: cases.filter((c) => c.status === "quarantine").length,
      resolved: cases.filter((c) => c.status === "resolved").length,
    };
  }, [cases]);

  // ─── Loading state ─────────────────────────────────────────────────────────

  if (isPending) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Investigations"
          subtitle="Track, review, and resolve active security incidents in your environment."
        />
        <div className="flex flex-col items-center justify-center h-64 text-gray-500 font-mono text-xs gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-purple-500" />
          <span>Loading investigations…</span>
        </div>
      </div>
    );
  }

  // ─── Error state ───────────────────────────────────────────────────────────

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Investigations"
          subtitle="Track, review, and resolve active security incidents in your environment."
        />
        <div className="flex flex-col items-center justify-center h-64 text-red-400 font-mono text-xs gap-3">
          <AlertOctagon className="w-6 h-6 text-red-500 animate-pulse" />
          <span>Failed to load investigations. Check the backend connection.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Investigations"
        subtitle="Track, review, and resolve active security incidents in your environment."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Queue, Search, Filters (40%) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Search & Filters Card */}
          <div className="bg-[#111317] border border-[#23262F] rounded-xl p-4 space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search investigations by title or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 border border-[#23262F] focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/20 text-xs font-mono pl-9 pr-4 py-2 rounded-lg text-gray-200 outline-none transition-all placeholder-gray-600"
              />
            </div>

            {/* Filter Chips */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: "all", label: "All", count: counts.all },
                { key: "triage", label: "Incoming", count: counts.triage },
                { key: "review", label: "Review", count: counts.review },
                { key: "quarantine", label: "Contained", count: counts.quarantine },
                { key: "resolved", label: "Resolved", count: counts.resolved },
              ].map((chip) => {
                const isActive = selectedFilter === chip.key;
                return (
                  <button
                    key={chip.key}
                    onClick={() => setSelectedFilter(chip.key as any)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono rounded-md border cursor-pointer transition-all duration-150 ${
                      isActive
                        ? "bg-purple-500/10 text-purple-400 border-purple-500/40 font-semibold"
                        : "bg-transparent text-gray-500 border-[#23262F] hover:border-gray-500/30 hover:text-gray-300"
                    }`}
                  >
                    <span>{chip.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                        isActive ? "bg-purple-500/20 text-purple-400" : "bg-black/40 text-gray-600"
                      }`}
                    >
                      {chip.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scrollable Investigation Queue */}
          <div className="bg-[#111317] border border-[#23262F] rounded-xl p-2 max-h-[640px] overflow-y-auto scrollbar-thin space-y-1.5">
            {filteredCases.map((c) => {
              const isSelected = selectedCase && c.id === selectedCase.id;
              const statusLabels = {
                triage: { text: "Incoming", dot: "bg-red-400" },
                review: { text: "Review", dot: "bg-purple-400" },
                quarantine: { text: "Contained", dot: "bg-orange-400" },
                resolved: { text: "Resolved", dot: "bg-green-400" },
              };
              const statusInfo = statusLabels[c.status];

              return (
                <div
                  key={c.id}
                  onClick={() => setActiveCaseId(c.id)}
                  className={`p-3.5 rounded-lg border text-left cursor-pointer transition-all duration-150 flex items-center justify-between group ${
                    isSelected
                      ? "bg-[#161A22] border-purple-500/60 shadow shadow-purple-500/10"
                      : "bg-black/10 border-transparent hover:bg-black/25 hover:border-[#23262F]"
                  }`}
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[9px] font-mono">
                      <span className="text-purple-400 font-semibold">{c.id}</span>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-500">{c.createdTime}</span>
                    </div>

                    <h4 className="text-xs font-semibold text-gray-200 group-hover:text-white transition-colors truncate">
                      {c.title}
                    </h4>

                    <div className="flex items-center gap-3">
                      <span
                        className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ${severityBadgeClass(
                          c.severity
                        )}`}
                      >
                        {c.severity}
                      </span>
                      <span className="flex items-center gap-1 text-[9px] text-gray-500">
                        <span className={`w-1 h-1 rounded-full ${statusInfo.dot}`} />
                        <span>{statusInfo.text}</span>
                      </span>
                      <span className="text-[9px] text-gray-500 truncate max-w-[90px]">
                        @{c.assignedAnalyst}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pl-3">
                    <div className="text-right shrink-0">
                      <div className="text-[10px] font-mono text-gray-500">Risk</div>
                      <div
                        className={`text-xs font-mono font-bold ${
                          c.riskScore >= 80
                            ? "text-red-400"
                            : c.riskScore >= 55
                            ? "text-orange-400"
                            : "text-blue-400"
                        }`}
                      >
                        {c.riskScore.toFixed(0)}%
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all duration-150 shrink-0" />
                  </div>
                </div>
              );
            })}

            {filteredCases.length === 0 && (
              <div className="py-12 text-center text-gray-600 font-mono text-xs flex flex-col items-center justify-center gap-2">
                <Shield className="w-8 h-8 opacity-25" />
                <span>No matching investigations found.</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Case Detail / Investigation Workspace Preview (60%) */}
        <div className="lg:col-span-7">
          <div className="bg-[#111317] border border-[#23262F] rounded-xl p-5 flex flex-col justify-between min-h-[560px] space-y-6">
            {cases.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-gray-600 font-mono text-xs gap-3">
                <Briefcase className="w-8 h-8 opacity-25" />
                <span>No investigations found in environment.</span>
              </div>
            ) : !selectedCase ? (
              <div className="flex flex-col items-center justify-center py-24 text-gray-600 font-mono text-xs gap-3">
                <ShieldAlert className="w-8 h-8 opacity-25" />
                <span>Select an investigation to view details.</span>
              </div>
            ) : (
              <>
                <div className="space-y-6">
                  {/* Case Header Banner */}
                  <div className="flex items-start justify-between border-b border-[#23262F] pb-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
                          {selectedCase.id}
                        </span>
                        <span
                          className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${severityBadgeClass(
                            selectedCase.severity
                          )}`}
                        >
                          {selectedCase.severity}
                        </span>
                      </div>
                      <h2 className="text-base font-semibold text-gray-100 leading-snug">
                        {selectedCase.title}
                      </h2>
                    </div>

                    <Briefcase className="w-5 h-5 text-purple-400 shrink-0 ml-4 mt-1" />
                  </div>

                  {/* Context Meta Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-black/20 border border-[#23262F]/50 rounded-lg p-3 space-y-1">
                      <span className="text-[10px] font-mono text-gray-500">Assigned To</span>
                      <div className="flex items-center gap-1.5 text-gray-300 font-mono text-xs">
                        <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                        <span>@{selectedCase.assignedAnalyst}</span>
                      </div>
                    </div>

                    <div className="bg-black/20 border border-[#23262F]/50 rounded-lg p-3 space-y-1">
                      <span className="text-[10px] font-mono text-gray-500">Risk Assessment</span>
                      <div className="flex items-center gap-1.5 text-gray-300 font-mono text-xs">
                        <Activity className="w-3.5 h-3.5 text-blue-400" />
                        <span
                          className={`font-semibold ${
                            selectedCase.riskScore >= 80
                              ? "text-red-400"
                              : selectedCase.riskScore >= 55
                              ? "text-orange-400"
                              : "text-blue-400"
                          }`}
                        >
                          {selectedCase.riskScore.toFixed(1)}% Score
                        </span>
                      </div>
                    </div>

                    <div className="bg-black/20 border border-[#23262F]/50 rounded-lg p-3 space-y-1">
                      <span className="text-[10px] font-mono text-gray-500">Relative Time</span>
                      <div className="text-gray-300 font-mono text-xs truncate">
                        {selectedCase.createdTime}
                      </div>
                    </div>
                  </div>

                  {/* Status Controller Pills */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono text-gray-500">Set Investigation Status</span>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { key: "triage", label: "Incoming (Triage)" },
                        { key: "review", label: "Under Review" },
                        { key: "quarantine", label: "Contained" },
                        { key: "resolved", label: "Resolved" },
                      ].map((st) => {
                        const isActive = selectedCase.status === st.key;
                        return (
                          <button
                            key={st.key}
                            onClick={() => moveStatus(selectedCase.id, st.key as any)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-semibold capitalize border cursor-pointer transition-all duration-150 ${
                              isActive
                                ? "bg-purple-500/10 text-purple-400 border-purple-500/40 shadow-sm"
                                : "bg-transparent text-gray-500 border-[#23262F] hover:border-gray-500/40 hover:text-gray-300"
                            }`}
                          >
                            {st.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* AI Summary Section */}
                  {selectedCase.summary && (
                    <div className="bg-[#161A22]/20 border border-[#23262F] rounded-lg p-4 space-y-2">
                      <div className="flex items-center gap-2 text-[10px] font-mono text-purple-400/80">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>AI Reasoning Summary</span>
                      </div>
                      <p className="text-xs font-mono text-gray-400 leading-relaxed">
                        {selectedCase.summary}
                      </p>
                    </div>
                  )}

                  {/* Active Isolation Playbook Section */}
                  <div className="bg-black/10 border border-[#23262F]/50 rounded-lg p-4 space-y-4">
                    <div className="flex items-center gap-2 border-b border-[#23262F]/40 pb-2">
                      <ShieldX className="w-4 h-4 text-orange-400" />
                      <h3 className="text-xs font-mono font-semibold text-gray-200">
                        Active Containment Playbook Dispatcher
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      {/* Anomaly Threshold Slider */}
                      <div className="space-y-2">
                        <div className="font-semibold text-gray-300 flex items-center justify-between font-mono text-[11px]">
                          <span>Isolation Threshold</span>
                          <span className="text-purple-400 font-bold">85%</span>
                        </div>
                        <p className="text-[10px] text-gray-500 font-mono leading-relaxed">
                          Automatically isolate container when anomalous threshold is breached.
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="range"
                            min="50"
                            max="100"
                            defaultValue="85"
                            className="flex-1 accent-purple-500 bg-gray-900 h-1 rounded-lg cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Manual Isolation Trigger */}
                      <div className="flex flex-col justify-between space-y-2">
                        <div className="space-y-1">
                          <div className="font-semibold text-gray-300 font-mono text-[11px]">
                            Manual Network Isolation
                          </div>
                          <p className="text-[10px] text-gray-500 font-mono leading-relaxed">
                            Deploy active isolation policy to segment target interfaces.
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            alert(`Issuing containment trigger to case: ${selectedCase.id}`)
                          }
                          className="w-full bg-orange-600/10 hover:bg-orange-600/20 border border-orange-500/30 text-orange-400 rounded-lg py-2 text-[10px] font-mono font-bold cursor-pointer transition-colors shadow-sm"
                        >
                          Isolate Host [{selectedCase.id.slice(0, 12)}]
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Open Case Action Button */}
                <div className="border-t border-[#23262F]/40 pt-4 mt-6 space-y-3">
                  {onOpenInvestigation && (
                    <button
                      onClick={() => onOpenInvestigation(selectedCase.id)}
                      className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold rounded-lg transition-all duration-150 shadow-lg hover:shadow-purple-500/20 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 animate-pulse" />
                      <span>Open Workspace Case</span>
                    </button>
                  )}
                  <div className="text-center">
                    <span className="text-[10px] font-mono text-gray-500">
                      Vector aggregate intelligence matching active threat signature profile vectors.
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
