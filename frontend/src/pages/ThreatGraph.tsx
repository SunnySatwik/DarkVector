import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Network,
  Cpu,
  Database,
  Server,
  ExternalLink,
  Shield,
  HelpCircle,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { Card, Button, Badge, PageHeader } from "../components/ui/DesignSystem";
import { useInvestigationWorkspace, useInvestigations } from "../hooks/useInvestigations";
import { Alert, Severity } from "../types";
import { ContextEnrichment } from "../api/types";
import {
  Node,
  Link,
  buildGraphData,
  buildBehavioralGraphData
} from "../lib/graphBuilder";
import { computeTargetId } from "../lib/graphSelector";

interface ThreatGraphProps {
  activeAlert?: Alert | null;
  activeInvestigationId?: string | null;
}


export default function ThreatGraph({
  activeAlert,
  activeInvestigationId,
}: ThreatGraphProps) {
  // Query investigations queue
  const { data: investigations, isPending: isListPending, isError: isListError } = useInvestigations();

  // Explicitly selected investigation ID state
  const [selectedInvestigationId, setSelectedInvestigationId] = useState<string | undefined>(undefined);

  // Sync state if activeInvestigationId changes from parent/nav context
  useEffect(() => {
    if (activeInvestigationId) {
      setSelectedInvestigationId(activeInvestigationId);
    }
  }, [activeInvestigationId]);

  // Determine target investigation ID using explicit requirements
  const targetId = useMemo(() => {
    let storedSelectedId: string | null = null;
    try {
      storedSelectedId = localStorage.getItem("last_selected_investigation_id");
    } catch (e) {}

    return computeTargetId({
      selectedInvestigationId,
      activeInvestigationId: activeInvestigationId || undefined,
      storedSelectedId,
      investigations,
    });
  }, [selectedInvestigationId, activeInvestigationId, investigations]);


  // Load detailed investigation workspace state
  const { data: detailData, isPending: isDetailPending, isError: isDetailError } = useInvestigationWorkspace(targetId);

  const isPending = isListPending || isDetailPending;
  const isError = isListError || isDetailError;

  // Selected node inspection state
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isolatedNodes, setIsolatedNodes] = useState<string[]>([]);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Reset selected node and containment states when the active target investigation changes
  useEffect(() => {
    setSelectedNode(null);
    setIsolatedNodes([]);
    setHoveredNodeId(null);
  }, [targetId]);

  // Dynamically build graph data when detailed investigation completes loading
  const graph = useMemo(() => {
    if (!detailData) return { nodes: [], links: [] };
    const alertData = detailData.alert as Alert | null;
    if (!alertData) {
      return buildBehavioralGraphData(detailData);
    }
    const contextData = detailData.analysis?.context;
    return buildGraphData(alertData, contextData);
  }, [detailData]);

  // Default to selecting the source or process node when graph is loaded
  useEffect(() => {
    if (graph.nodes.length > 0) {
      const processNode = graph.nodes.find((n) => n.id === "process");
      setSelectedNode(processNode || graph.nodes[0]);
    } else {
      setSelectedNode(null);
    }
  }, [graph]);

  // Handler for explicit selection dropdown
  const handleSelectInvestigation = (id: string) => {
    setSelectedInvestigationId(id);
    setSelectedNode(null); // clear stale selected graph nodes
    setIsolatedNodes([]); // clear containment states
    try {
      localStorage.setItem("last_selected_investigation_id", id);
    } catch (e) {}
  };

  const handleIsolate = (nodeId: string) => {
    if (isolatedNodes.includes(nodeId)) {
      setIsolatedNodes((prev) => prev.filter((id) => id !== nodeId));
    } else {
      setIsolatedNodes((prev) => [...prev, nodeId]);
    }
  };

  if (isPending) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Evidence Graph"
          subtitle="Visualize relationships between container processes, socket files, and active network connections in an interactive evidence map."
        />
        <div className="flex flex-col items-center justify-center h-64 text-gray-500 font-mono text-xs gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-purple-500" />
          <span>Generating evidence graph from active telemetry...</span>
        </div>
      </div>
    );
  }

  // Proper empty state when there are genuinely no investigations in system
  if (!isPending && (!investigations || investigations.length === 0)) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Evidence Graph"
          subtitle="Visualize relationships between container processes, socket files, and active network connections in an interactive evidence map."
        />
        <div className="flex flex-col items-center justify-center h-80 text-gray-500 font-mono text-xs gap-3 p-8 border border-dashed border-[#23262F]/30 rounded-xl bg-black/10">
          <AlertTriangle className="w-8 h-8 text-purple-400 animate-pulse" />
          <span className="font-bold text-gray-300 text-sm">No Investigations Found</span>
          <span className="text-gray-500 max-w-xs text-center leading-relaxed">
            There are currently no active or archived investigations in the database. Please trigger behavioral detections to populate this view.
          </span>
        </div>
      </div>
    );
  }

  if (isError || !detailData) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Evidence Graph"
          subtitle="Visualize relationships between container processes, socket files, and active network connections in an interactive evidence map."
        />
        <div className="flex flex-col items-center justify-center h-64 text-red-400 font-mono text-xs gap-3">
          <AlertTriangle className="w-6 h-6 text-red-500 animate-pulse" />
          <span>Failed to load selected investigation workspace data. Please verify database availability.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Evidence Graph"
        subtitle="Visualize relationships between container processes, socket files, and active network connections in an interactive evidence map."
      />

      <div className="bg-[#161A22]/20 border border-border-custom/20 rounded-xl p-5 text-sm flex flex-col md:flex-row md:items-center justify-between gap-4 text-gray-300 font-sans">
        <div className="space-y-1 flex-1">
          <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">Active Context</p>
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
            <h2 className="text-base font-bold text-gray-100 font-mono tracking-tight break-all">
              {detailData.investigation.investigation_id}
            </h2>
            <span className="hidden sm:inline text-gray-600">·</span>
            <span className="text-sm font-semibold text-purple-400">
              {detailData.investigation.title}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <Badge variant={detailData.investigation.status.toLowerCase() === "resolved" ? "success" : "default"}>
              {detailData.investigation.status}
            </Badge>
            <span className="text-xs text-gray-500 font-mono">
              Severity: <span className="font-semibold text-orange-400">{detailData.investigation.severity.toUpperCase()}</span>
            </span>
            <span className="text-xs text-gray-500 font-mono">
              Risk: <span className="font-semibold text-red-400">{detailData.investigation.risk_score.toFixed(0)}%</span>
            </span>
            {!activeInvestigationId && (
              <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/15 px-2 py-0.5 rounded font-mono">
                Fallback Selection
              </span>
            )}
          </div>
        </div>

        {/* Dropdown Selector */}
        {investigations && investigations.length > 0 && (
          <div className="flex flex-col gap-1.5 shrink-0 min-w-[280px]">
            <label htmlFor="investigation-select" className="text-[10px] text-gray-500 font-mono uppercase tracking-wide">
              Select Investigation Context
            </label>
            <select
              id="investigation-select"
              value={detailData.investigation.investigation_id}
              onChange={(e) => handleSelectInvestigation(e.target.value)}
              className="w-full bg-[#111317] border border-[#23262F]/30 hover:border-gray-500/40 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-purple-500/50 transition-colors font-mono cursor-pointer"
            >
              {investigations.map((inv) => (
                <option key={inv.investigation_id} value={inv.investigation_id}>
                  {inv.investigation_id} · {inv.title.length > 25 ? `${inv.title.slice(0, 22)}...` : inv.title} [{inv.severity.toUpperCase()}]
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* SVG Graph Canvas */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={detailData.investigation.investigation_id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
            >
              <Card className="p-0 bg-black/45 overflow-hidden">
                <div className="p-4 border-b border-[#23262F]/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-blue-400" />
                <span className="font-mono text-xs font-bold text-gray-200">
                  Interactive Evidence Map
                </span>
              </div>
              <div className="flex gap-2">
                <Badge variant="critical">Telemetry stream verified</Badge>
              </div>
            </div>

            {/* Interactive Topology Graph Canvas */}
            <div className="relative w-full overflow-x-auto min-h-[400px] flex justify-center items-center p-6 bg-black/25">
              <svg className="w-[750px] h-[300px] select-none" viewBox="0 0 750 300">
                {/* Connections (Links) */}
                {graph.links.map((link, idx) => {
                  const sourceNode = graph.nodes.find((n) => n.id === link.source);
                  const targetNode = graph.nodes.find((n) => n.id === link.target);
                  if (!sourceNode || !targetNode) return null;

                  const isSourceIsolated = isolatedNodes.includes(sourceNode.id);
                  const isTargetIsolated = isolatedNodes.includes(targetNode.id);

                  const isLinkHighlighted = hoveredNodeId !== null && (link.source === hoveredNodeId || link.target === hoveredNodeId);
                  const isLinkDimmed = hoveredNodeId !== null && !isLinkHighlighted;

                  const linkStrokeColor = isLinkHighlighted
                    ? "#A855F7"
                    : isSourceIsolated || isTargetIsolated
                    ? "#23262F"
                    : link.isThreat
                    ? "#EF4444"
                    : "#23262F";

                  const linkStrokeWidth = isLinkHighlighted ? "2.5" : link.isThreat ? "2" : "1.5";
                  const linkOpacity = isLinkDimmed ? 0.12 : 1;

                  return (
                    <g key={idx}>
                      <motion.line
                        initial={{ x1: 375, y1: 150, x2: 375, y2: 150 }}
                        animate={{ x1: sourceNode.x, y1: sourceNode.y, x2: targetNode.x, y2: targetNode.y }}
                        transition={{
                          type: "spring",
                          stiffness: 140,
                          damping: 15,
                          mass: 0.7,
                          delay: Math.min(6, sourceNode.id.charCodeAt(0) % 6) * 0.04
                        }}
                        stroke={linkStrokeColor}
                        strokeWidth={linkStrokeWidth}
                        strokeOpacity={linkOpacity}
                        strokeDasharray={link.isThreat && !(isSourceIsolated || isTargetIsolated) ? "4,4" : undefined}
                        className={
                          link.isThreat && !(isSourceIsolated || isTargetIsolated)
                            ? "threat-link-dash"
                            : ""
                        }
                      />
                    </g>
                  );
                })}

                {/* Nodes rendering */}
                {graph.nodes.map((node) => {
                  const isSelected = selectedNode?.id === node.id;
                  const isIsolated = isolatedNodes.includes(node.id);

                  const isDimmed = hoveredNodeId !== null && 
                    node.id !== hoveredNodeId && 
                    !graph.links.some(l => 
                      (l.source === hoveredNodeId && l.target === node.id) || 
                      (l.target === hoveredNodeId && l.source === node.id)
                    );

                  // Node icons
                  const renderIcon = (type: string) => {
                    switch (type) {
                      case "investigation":
                        return <Shield className="w-4 h-4" />;
                      case "detection":
                        return <AlertTriangle className="w-4 h-4" />;
                      case "host":
                      case "pod":
                        return <Server className="w-4 h-4" />;
                      case "process":
                        return <Cpu className="w-4 h-4" />;
                      case "database":
                        return <Database className="w-4 h-4" />;
                      case "mitre":
                        return <Network className="w-4 h-4" />;
                      default:
                        return <ExternalLink className="w-4 h-4" />;
                    }
                  };

                  return (
                    <motion.g
                      key={node.id}
                      tabIndex={0}
                      role="button"
                      aria-label={`Inspect ${node.type} node: ${node.label}`}
                      onClick={() => setSelectedNode(node)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedNode(node);
                        }
                      }}
                      onMouseEnter={() => setHoveredNodeId(node.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                      onFocus={() => setHoveredNodeId(node.id)}
                      onBlur={() => setHoveredNodeId(null)}
                      className="cursor-pointer outline-none focus:ring-1 focus:ring-purple-500/50 rounded-full"
                      style={{ opacity: isDimmed ? 0.35 : 1 }}
                      animate={{
                        y: [0, -3, 0],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 3.5 + (node.id.charCodeAt(0) % 4) * 0.5,
                        ease: "easeInOut",
                        delay: (node.id.charCodeAt(0) % 6) * 0.2
                      }}
                    >
                      {/* Node indicator ring on selection */}
                      {isSelected && (
                        <motion.circle
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: [1, 1.08, 1], opacity: 1 }}
                          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                          cx={node.x}
                          cy={node.y}
                          r="28"
                          fill="none"
                          stroke={
                            node.type === "detection" || node.severity === "critical"
                              ? "rgba(239, 68, 68, 0.25)"
                              : node.type === "investigation"
                                ? "rgba(168, 85, 247, 0.25)"
                                : "rgba(59, 130, 246, 0.25)"
                          }
                          strokeWidth="2"
                        />
                      )}

                      {/* Main Node bubble */}
                      <motion.circle
                        initial={{ cx: 375, cy: 150, r: 0 }}
                        animate={{ cx: node.x, cy: node.y, r: 20 }}
                        transition={{
                          type: "spring",
                          stiffness: 140,
                          damping: 15,
                          mass: 0.7,
                          delay: Math.min(6, node.id.charCodeAt(0) % 6) * 0.04
                        }}
                        fill={isIsolated ? "#111317" : isSelected ? "#161A22" : "#09090B"}
                        stroke={
                          isIsolated
                            ? "#23262F"
                            : node.type === "investigation"
                              ? "#A855F7"
                              : node.type === "detection"
                                ? "#EF4444"
                                : node.type === "process"
                                  ? "#3B82F6"
                                  : node.type === "mitre"
                                    ? "#F59E0B"
                                    : node.severity === "critical"
                                      ? "#EF4444"
                                      : node.severity === "high"
                                        ? "#F59E0B"
                                        : node.severity === "medium"
                                          ? "#3B82F6"
                                          : "#23262F"
                        }
                        strokeWidth={isSelected ? "2" : "1.2"}
                      />

                      {/* Embed small foreignObject for Lucide Icons */}
                      <motion.foreignObject
                        initial={{ x: 375 - 8, y: 150 - 8 }}
                        animate={{ x: node.x - 8, y: node.y - 8 }}
                        transition={{
                          type: "spring",
                          stiffness: 140,
                          damping: 15,
                          mass: 0.7,
                          delay: Math.min(6, node.id.charCodeAt(0) % 6) * 0.04
                        }}
                        width="16"
                        height="16"
                        className={`pointer-events-none ${
                          isIsolated 
                            ? "text-gray-600" 
                            : node.type === "investigation"
                              ? "text-purple-400"
                              : node.type === "detection"
                                ? "text-red-400"
                                : node.type === "process"
                                  ? "text-blue-400"
                                  : node.type === "mitre"
                                    ? "text-yellow-400"
                                    : node.severity === "critical" 
                                      ? "text-red-400" 
                                      : node.severity === "medium" 
                                        ? "text-blue-400" 
                                        : "text-gray-400"
                        }`}
                      >
                        <div className="flex items-center justify-center">
                          {renderIcon(node.type)}
                        </div>
                      </motion.foreignObject>

                      {/* Label Text below node */}
                      <motion.text
                        initial={{ x: 375, y: 150 + 35 }}
                        animate={{ x: node.x, y: node.y + 35 }}
                        transition={{
                          type: "spring",
                          stiffness: 140,
                          damping: 15,
                          mass: 0.7,
                          delay: Math.min(6, node.id.charCodeAt(0) % 6) * 0.04
                        }}
                        textAnchor="middle"
                        className={`text-[9px] font-mono font-medium ${isIsolated ? "fill-gray-600" : isSelected ? "fill-white" : "fill-gray-400"}`}
                      >
                        {node.label.length > 20 ? `${node.label.slice(0, 18)}...` : node.label}
                      </motion.text>

                      {/* Isolation Line Slash marker if isolated */}
                      {isIsolated && (
                        <motion.line
                          initial={{ x1: 375 - 14, y1: 150 + 14, x2: 375 + 14, y2: 150 - 14 }}
                          animate={{ x1: node.x - 14, y1: node.y + 14, x2: node.x + 14, y2: node.y - 14 }}
                          transition={{
                            type: "spring",
                            stiffness: 140,
                            damping: 15,
                            mass: 0.7
                          }}
                          stroke="#EF4444"
                          strokeWidth="2.5"
                        />
                      )}
                    </motion.g>
                  );
                })}
              </svg>
            </div>

            {/* Quick legend footer */}
            <div className="px-4 py-3 border-t border-[#23262F]/40 bg-[#161A22]/20 flex items-center justify-between text-[10px] font-mono text-gray-500">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block" /> Investigation
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" /> Detection
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" /> Process
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block" /> MITRE ATT&CK
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500 inline-block" /> Host
                </span>
              </div>
              <span>Click nodes to inspect metadata</span>
            </div>
          </Card>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Selected Node Details sidecard */}
        <div className="lg:col-span-4">
          <AnimatePresence mode="wait">
            {selectedNode ? (
              <motion.div
                key={selectedNode.id}
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ type: "spring" as const, stiffness: 300, damping: 26 }}
              >
                <Card className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#23262F]/40 pb-3">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-400" />
                      <span className="font-mono text-xs font-bold text-gray-200">Evidence Inspector</span>
                    </div>
                    <Badge
                      variant={selectedNode.severity === "none" ? "default" : selectedNode.severity}
                    >
                      {selectedNode.severity === "none" ? "Clear" : selectedNode.severity}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="text-[10px] font-mono text-gray-500">
                        Entity Name
                      </div>
                      <div className="text-xs font-mono font-bold text-gray-200 mt-0.5 break-all">
                        {selectedNode.label}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-mono text-gray-500">
                        Entity Category
                      </div>
                      <div className="text-xs text-gray-400 capitalize font-medium mt-0.5">
                        {selectedNode.type}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-mono text-gray-500">
                        Technical Forensic Details
                      </div>
                      <p className="whitespace-pre-line text-[11px] text-gray-400 leading-relaxed mt-1 font-sans bg-[#09090B] border border-[#23262F]/50 rounded-lg p-2.5 break-all">
                        {selectedNode.details}
                      </p>
                    </div>
                  </div>

                  {/* Containment actions only appear where supported (host or process or legacy pod/source) */}
                  {(selectedNode.type === "host" || selectedNode.type === "process" || selectedNode.type === "pod" || selectedNode.id === "source") && (
                    <div className="border-t border-[#23262F]/40 pt-3.5">
                      {isolatedNodes.includes(selectedNode.id) ? (
                        <Button
                          variant="success"
                          onClick={() => handleIsolate(selectedNode.id)}
                          className="w-full py-2 cursor-pointer font-bold text-xs font-mono"
                        >
                          {selectedNode.type === "process" ? "Re-enable Process" : "Re-establish Host Trust"}
                        </Button>
                      ) : (
                        <Button
                          variant="danger"
                          onClick={() => handleIsolate(selectedNode.id)}
                          className="w-full py-2 cursor-pointer font-bold text-xs font-mono"
                        >
                          {selectedNode.type === "process" ? "Terminate Process" : "Isolate Host"}
                        </Button>
                      )}
                    </div>
                  )}
                </Card>
              </motion.div>
            ) : (
              <Card className="text-center py-12 text-gray-500">
                <HelpCircle className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-xs font-mono">
                  Select a node on the map to view details.
                </p>
              </Card>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

