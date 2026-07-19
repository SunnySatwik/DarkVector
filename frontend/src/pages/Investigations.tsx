import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
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
  FileText,
  Archive,
  RotateCcw,
  Trash2,
  AlertCircle,
  Clock,
  Check,
} from "lucide-react";
import { PageHeader } from "../components/ui/DesignSystem";
import { severityBadgeClass } from "../lib/severity";
import { useInvestigations, useUpdateInvestigationStatus } from "../hooks/useInvestigations";
import { CaseItem, mapInvestigationToCase } from "../lib/investigationMapper";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import EmptyStateMonitor from "../components/EmptyStateMonitor";
import {
  archiveInvestigation,
  restoreInvestigation,
  dismissInvestigation,
  deleteInvestigation,
  bulkArchiveDemoInvestigations,
  bulkDeleteDemoInvestigations,
} from "../api/investigations";

// ─── Props ────────────────────────────────────────────────────────────────────

interface InvestigationsProps {
  onOpenInvestigation?: (investigationId: string) => void;
  onOpenReport?: (investigationId: string) => void;
}

// ─── Root Component ───────────────────────────────────────────────────────────

export default function Investigations({ onOpenInvestigation, onOpenReport }: InvestigationsProps) {
  // Always fetch including archived to allow local client-side filtering and counts
  const { data: investigations, isPending, isError } = useInvestigations(true);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: "", visible: false });

  const [deleteConfirmCaseId, setDeleteConfirmCaseId] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isPermanentDelete, setIsPermanentDelete] = useState(false);
  const [bulkPermanent, setBulkPermanent] = useState(false);

  const queryClient = useQueryClient();

  const showSuccessToast = (msg: string) => {
    setToast({ message: msg, visible: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

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
      
      // Default list (all) hides archived cases. Users click "archived" filter explicitly.
      if (selectedFilter === "all") {
        return matchesSearch && c.status !== "archived";
      }
      const matchesFilter = c.status === selectedFilter;
      return matchesSearch && matchesFilter;
    });
  }, [cases, searchQuery, selectedFilter]);

  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);

  const selectedCase =
    filteredCases.find((c) => c.id === activeCaseId) ??
    filteredCases[0] ??
    null;

  const updateStatusMutation = useUpdateInvestigationStatus(selectedCase?.id || "");

  const moveStatus = (caseId: string, newStatus: CaseItem["status"]) => {
    setStatusOverrides((prev) => ({ ...prev, [caseId]: newStatus }));
  };

  // MUTATIONS (with Optimistic UI support)
  const archiveMutation = useMutation({
    mutationFn: archiveInvestigation,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["investigations"] });
      const previousInvs = queryClient.getQueryData(["investigations", true]);
      moveStatus(id, "archived");
      return { previousInvs };
    },
    onError: (err, id, context) => {
      if (context?.previousInvs) {
        queryClient.setQueryData(["investigations", true], context.previousInvs);
      }
      setStatusOverrides((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      showSuccessToast("Failed to archive investigation.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investigations"] });
      showSuccessToast("Investigation archived successfully.");
    }
  });

  const restoreMutation = useMutation({
    mutationFn: restoreInvestigation,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["investigations"] });
      const previousInvs = queryClient.getQueryData(["investigations", true]);
      moveStatus(id, "new");
      return { previousInvs };
    },
    onError: (err, id, context) => {
      if (context?.previousInvs) {
        queryClient.setQueryData(["investigations", true], context.previousInvs);
      }
      setStatusOverrides((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      showSuccessToast("Failed to restore investigation.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investigations"] });
      showSuccessToast("Investigation restored to queue.");
    }
  });

  const dismissMutation = useMutation({
    mutationFn: dismissInvestigation,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["investigations"] });
      const previousInvs = queryClient.getQueryData(["investigations", true]);
      moveStatus(id, "archived");
      return { previousInvs };
    },
    onError: (err, id, context) => {
      if (context?.previousInvs) {
        queryClient.setQueryData(["investigations", true], context.previousInvs);
      }
      setStatusOverrides((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      showSuccessToast("Failed to dismiss investigation.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investigations"] });
      showSuccessToast("Investigation resolved and archived.");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, permanent }: { id: string; permanent: boolean }) =>
      deleteInvestigation(id, permanent),
    onMutate: async ({ id, permanent }) => {
      await queryClient.cancelQueries({ queryKey: ["investigations"] });
      const previousInvs = queryClient.getQueryData(["investigations", true]);
      if (!permanent) {
        // Optimistic soft delete: hide from view list
        setStatusOverrides((prev) => ({ ...prev, [id]: "archived" })); // custom trigger
      }
      return { previousInvs };
    },
    onError: (err, { id }, context) => {
      if (context?.previousInvs) {
        queryClient.setQueryData(["investigations", true], context.previousInvs);
      }
      setStatusOverrides((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      showSuccessToast("Failed to delete investigation.");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["investigations"] });
      showSuccessToast(
        variables.permanent
          ? "Investigation permanently deleted."
          : "Investigation soft-deleted."
      );
      setDeleteConfirmCaseId(null);
      setIsPermanentDelete(false);
    }
  });

  const bulkArchiveMutation = useMutation({
    mutationFn: () => bulkArchiveDemoInvestigations({ demo_only: true }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["investigations"] });
      showSuccessToast("All generated demo investigations have been archived.");
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: ({ permanent }: { permanent: boolean }) =>
      bulkDeleteDemoInvestigations(permanent, { demo_only: true }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["investigations"] });
      showSuccessToast(
        variables.permanent
          ? "Bulk permanently deleted demo investigations."
          : "Bulk soft-deleted demo investigations."
      );
      setShowBulkDeleteConfirm(false);
      setBulkPermanent(false);
    }
  });

  // Compute counts for filter chips
  const counts = useMemo(() => {
    return {
      all: cases.filter((c) => c.status !== "archived").length,
      new: cases.filter((c) => c.status === "new").length,
      investigating: cases.filter((c) => c.status === "investigating").length,
      contained: cases.filter((c) => c.status === "contained").length,
      resolved: cases.filter((c) => c.status === "resolved").length,
      archived: cases.filter((c) => c.status === "archived").length,
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
        {/* LEFT COLUMN: Queue, Search, Filters, Bulk actions (40%) */}
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
                { key: "new", label: "New", count: counts.new },
                { key: "investigating", label: "Investigating", count: counts.investigating },
                { key: "contained", label: "Contained", count: counts.contained },
                { key: "resolved", label: "Resolved", count: counts.resolved },
                { key: "archived", label: "Archived", count: counts.archived },
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

          {/* Bulk Actions Maintenance Card */}
          <div className="bg-[#111317] border border-[#23262F] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 border-b border-[#23262F]/40 pb-2">
              <Activity className="w-3.5 h-3.5 text-purple-400" />
              <h3 className="text-xs font-mono font-semibold text-gray-200">
                Incidents Maintenance & Bulk Actions
              </h3>
            </div>
            
            <p className="text-[10px] text-gray-500 font-sans leading-relaxed">
              Quickly cleanup generated legacy ML demo cases. Bypasses active correlated behavioral telemetry.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => bulkArchiveMutation.mutate()}
                disabled={bulkArchiveMutation.isPending}
                className="flex-1 py-2 text-[10px] font-mono font-bold rounded-lg cursor-pointer bg-[#161A22] border border-[#23262F] hover:bg-[#23262F] text-gray-300 transition-all duration-150 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <span>Bulk Archive Demo</span>
              </button>
              
              <button
                onClick={() => setShowBulkDeleteConfirm(true)}
                disabled={bulkDeleteMutation.isPending}
                className="flex-1 py-2 text-[10px] font-mono font-bold rounded-lg cursor-pointer bg-red-950/10 border border-red-500/20 hover:bg-red-500/10 text-red-400 transition-all duration-150 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <span>Bulk Delete Demo</span>
              </button>
            </div>
          </div>

          {/* Scrollable Investigation Queue */}
          <div key={filteredCases.length} className="bg-[#111317] border border-[#23262F] rounded-xl p-2 max-h-[480px] overflow-y-auto scrollbar-thin space-y-1.5 list-update-pulse">
            {filteredCases.map((c, i) => {
              const isSelected = selectedCase && c.id === selectedCase.id;
              const statusLabels = {
                new: { text: "New", dot: "bg-red-400" },
                investigating: { text: "Investigating", dot: "bg-purple-400" },
                contained: { text: "Contained", dot: "bg-orange-400" },
                resolved: { text: "Resolved", dot: "bg-green-400" },
                archived: { text: "Archived", dot: "bg-gray-400" },
              };
              const statusInfo = statusLabels[c.status] || { text: "Unknown", dot: "bg-gray-600" };

              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(5, i) * 0.04, ease: "easeOut" }}
                  onClick={() => setActiveCaseId(c.id)}
                  className={`investigation-card p-3.5 rounded-lg border text-left cursor-pointer flex items-center justify-between group ${
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
                        <span className="relative flex shrink-0">
                          <span className={`w-1.5 h-1.5 rounded-full status-chip ${statusInfo.dot}`} />
                          {(c.status === "new" || c.status === "investigating") && (
                            <span className={`absolute inset-0 rounded-full ${statusInfo.dot} opacity-60`}
                              style={{ animation: "doublePulseOuter 2.5s cubic-bezier(0.16, 1, 0.3, 1) infinite" }}
                            />
                          )}
                        </span>
                        <span className="status-chip">{statusInfo.text}</span>
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
                </motion.div>
              );
            })}

            {filteredCases.length === 0 && (
              <EmptyStateMonitor variant="queue" />
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Case Detail / Workspace Preview (60%) */}
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedCase?.id || "empty"}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[#111317] border border-[#23262F] rounded-xl p-5 flex flex-col justify-between min-h-[560px] space-y-6"
            >
              {cases.length === 0 ? (
                <EmptyStateMonitor variant="investigations" />
              ) : !selectedCase ? (
                <div className="flex flex-col items-center justify-center py-24 text-gray-400 font-mono text-xs gap-3">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
                  </span>
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
                          { key: "new", label: "New", backend: "NEW" },
                          { key: "investigating", label: "Investigating", backend: "INVESTIGATING" },
                          { key: "contained", label: "Contained", backend: "CONTAINED" },
                          { key: "resolved", label: "Resolved", backend: "RESOLVED" },
                          { key: "archived", label: "Archived", backend: "ARCHIVED" },
                        ].map((st) => {
                          const isActive = selectedCase.status === st.key;
                          return (
                            <button
                              key={st.key}
                              onClick={() => {
                                if (!isActive) {
                                  const old = selectedCase.status;
                                  moveStatus(selectedCase.id, st.key as any);
                                  updateStatusMutation.mutate(st.backend, {
                                    onError: () => {
                                      moveStatus(selectedCase.id, old);
                                    }
                                  });
                                }
                              }}
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
                        <p className="text-xs font-mono text-gray-400 leading-relaxed select-text">
                          {selectedCase.summary}
                        </p>
                      </div>
                    )}

                    {/* Containment Job Progress details */}
                    {selectedCase.containmentStatus && (
                      <div className="bg-[#161A22]/10 border border-[#23262F]/80 rounded-lg p-4 space-y-2 text-xs font-mono">
                        <div className="flex items-center justify-between text-gray-400">
                          <span>Containment Task Execution:</span>
                          <span className={`font-bold uppercase ${
                            selectedCase.containmentStatus === "COMPLETED" ? "text-emerald-400" :
                            selectedCase.containmentStatus === "FAILED" ? "text-red-400" : "text-orange-400 animate-pulse"
                          }`}>{selectedCase.containmentStatus}</span>
                        </div>
                        <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              selectedCase.containmentStatus === "COMPLETED" ? "bg-emerald-500 w-full" :
                              selectedCase.containmentStatus === "EXECUTING" ? "bg-orange-500 w-2/3" : "bg-orange-600 w-1/3 animate-pulse"
                            }`}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Row */}
                  <div className="border-t border-[#23262F]/40 pt-4 mt-6 flex flex-wrap items-center gap-2">
                    {onOpenInvestigation && (
                      <button
                        onClick={() => onOpenInvestigation(selectedCase.id)}
                        className="flex-1 min-w-[120px] h-9 px-3 bg-purple-600 hover:bg-purple-500 text-white font-mono text-[11px] font-bold rounded-lg transition-all duration-150 shadow-lg hover:shadow-purple-500/20 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <Sparkles className="w-3.5 h-3.5 shrink-0 animate-pulse" />
                        <span>Open Workspace</span>
                      </button>
                    )}
                    
                    {onOpenReport && (
                      <button
                        onClick={() => onOpenReport(selectedCase.id)}
                        className="flex-1 min-w-[120px] h-9 px-3 bg-[#161A22] border border-[#23262F] hover:bg-[#23262F] text-gray-300 hover:text-white font-mono text-[11px] font-bold rounded-lg transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <FileText className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span>View Report</span>
                      </button>
                    )}

                    {/* QoL Dismiss */}
                    {selectedCase.status !== "archived" && (
                      <button
                        onClick={() => {
                          const old = selectedCase.status;
                          moveStatus(selectedCase.id, "archived");
                          dismissMutation.mutate(selectedCase.id, {
                            onError: () => moveStatus(selectedCase.id, old)
                          });
                        }}
                        className="flex-1 min-w-[100px] h-9 px-3 bg-emerald-950/10 border border-emerald-500/20 hover:bg-emerald-500/10 text-emerald-400 hover:text-emerald-300 font-mono text-[11px] font-bold rounded-lg transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span>Dismiss</span>
                      </button>
                    )}

                    {/* Archive/Restore */}
                    {selectedCase.status === "archived" ? (
                      <button
                        onClick={() => {
                          const old = selectedCase.status;
                          moveStatus(selectedCase.id, "new");
                          restoreMutation.mutate(selectedCase.id, {
                            onError: () => moveStatus(selectedCase.id, old)
                          });
                        }}
                        className="h-9 px-3 bg-[#161A22] border border-[#23262F] hover:bg-[#23262F] text-gray-300 hover:text-white font-mono text-[11px] font-bold rounded-lg transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        <span>Restore</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          const old = selectedCase.status;
                          moveStatus(selectedCase.id, "archived");
                          archiveMutation.mutate(selectedCase.id, {
                            onError: () => moveStatus(selectedCase.id, old)
                          });
                        }}
                        className="h-9 px-3 bg-[#161A22] border border-[#23262F] hover:bg-[#23262F] text-gray-300 hover:text-white font-mono text-[11px] font-bold rounded-lg transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <Archive className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>Archive</span>
                      </button>
                    )}

                    {/* Soft Delete */}
                    <button
                      onClick={() => setDeleteConfirmCaseId(selectedCase.id)}
                      className="h-9 px-3 bg-red-950/10 border border-red-500/20 hover:bg-red-500/10 text-red-400 hover:text-red-300 font-mono text-[11px] font-bold rounded-lg transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Delete</span>
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmCaseId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#111317] border border-[#23262F] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center gap-3 text-red-400">
                <AlertCircle className="w-5 h-5" />
                <h3 className="text-base font-semibold font-sans text-gray-200">Delete Investigation</h3>
              </div>
              
              <p className="text-xs text-gray-400 font-sans leading-relaxed">
                Are you sure you want to delete investigation <span className="font-mono text-purple-400">{deleteConfirmCaseId}</span>?
              </p>
              
              <div className="flex items-center gap-2 bg-[#161A22] border border-[#23262F] p-3 rounded-lg">
                <input
                  type="checkbox"
                  id="permanent"
                  checked={isPermanentDelete}
                  onChange={(e) => setIsPermanentDelete(e.target.checked)}
                  className="rounded border-[#23262F] text-purple-600 focus:ring-purple-500/20 bg-black/40"
                />
                <label htmlFor="permanent" className="text-[11px] font-sans text-gray-300 cursor-pointer select-none">
                  Permanently delete from database (bypasses soft-delete)
                </label>
              </div>
              
              <div className="flex justify-end gap-2 pt-2 text-xs font-mono">
                <button
                  onClick={() => {
                    setDeleteConfirmCaseId(null);
                    setIsPermanentDelete(false);
                  }}
                  className="px-4 py-2 rounded-lg border border-[#23262F] text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    deleteMutation.mutate({ id: deleteConfirmCaseId, permanent: isPermanentDelete });
                  }}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {deleteMutation.isPending ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Delete Confirmation Modal */}
      <AnimatePresence>
        {showBulkDeleteConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#111317] border border-[#23262F] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center gap-3 text-red-400">
                <AlertCircle className="w-5 h-5" />
                <h3 className="text-base font-semibold font-sans text-gray-200">Bulk Delete Demo Investigations</h3>
              </div>
              
              <p className="text-xs text-gray-400 font-sans leading-relaxed">
                Are you sure you want to delete all generated demo investigations (ML pipeline alerts)? This action is destructive.
              </p>
              
              <div className="flex items-center gap-2 bg-[#161A22] border border-[#23262F] p-3 rounded-lg">
                <input
                  type="checkbox"
                  id="bulk-permanent"
                  checked={bulkPermanent}
                  onChange={(e) => setBulkPermanent(e.target.checked)}
                  className="rounded border-[#23262F] text-purple-600 focus:ring-purple-500/20 bg-black/40"
                />
                <label htmlFor="bulk-permanent" className="text-[11px] font-sans text-gray-300 cursor-pointer select-none">
                  Permanently delete from database (bypasses soft-delete)
                </label>
              </div>
              
              <div className="flex justify-end gap-2 pt-2 text-xs font-mono">
                <button
                  onClick={() => {
                    setShowBulkDeleteConfirm(false);
                    setBulkPermanent(false);
                  }}
                  className="px-4 py-2 rounded-lg border border-[#23262F] text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    bulkDeleteMutation.mutate({ permanent: bulkPermanent });
                  }}
                  disabled={bulkDeleteMutation.isPending}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {bulkDeleteMutation.isPending ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast.visible && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[#111317] border border-emerald-500/30 shadow-xl shadow-emerald-500/5 px-4 py-3 rounded-xl text-gray-200 font-sans text-xs"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
            <div className="w-2 h-2 rounded-full bg-emerald-500 absolute left-4 shrink-0" />
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
