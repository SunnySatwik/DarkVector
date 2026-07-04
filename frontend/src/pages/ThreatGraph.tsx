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
import { useInvestigation, useInvestigations } from "../hooks/useInvestigations";
import { Alert, Severity } from "../types";
import { ContextEnrichment } from "../api/types";

interface Node {
  id: string;
  label: string;
  type: "pod" | "process" | "database" | "external-ip";
  severity: Severity | "none";
  x: number;
  y: number;
  details: string;
}

interface Link {
  source: string;
  target: string;
  isThreat: boolean;
}

interface ThreatGraphProps {
  activeAlert?: Alert | null;
  activeInvestigationId?: string | null;
}

function buildGraphData(alert: Alert, context?: ContextEnrichment): { nodes: Node[]; links: Link[] } {
  const nodes: Node[] = [];
  const links: Link[] = [];

  // 1. Source Node (always exists)
  nodes.push({
    id: "source",
    label: alert.source,
    type: alert.source.includes("db-") ? "database" : "pod",
    severity: alert.severity,
    x: 100,
    y: 150,
    details: `Incident origin source asset node '${alert.source}'. Initial classification: ${alert.severity.toUpperCase()}. Category: ${alert.category}.`,
  });

  let lastNodeId = "source";

  // 2. User Node (if username exists)
  if (alert.details?.username) {
    nodes.push({
      id: "user",
      label: alert.details.username,
      type: "pod",
      severity: "none",
      x: 250,
      y: 70,
      details: `Associated credential account session: ${alert.details.username}. Verified alignment with historic location profile.`,
    });
    links.push({ source: "source", target: "user", isThreat: false });
  }

  // 3. Parent Process Node (if parentProcess exists)
  if (alert.details?.parentProcess) {
    nodes.push({
      id: "parent-process",
      label: alert.details.parentProcess,
      type: "pod",
      severity: "none",
      x: 250,
      y: 230,
      details: `Parent execution process lineage node: ${alert.details.parentProcess}. Spawned by container initialization sequence.`,
    });
    links.push({ source: "source", target: "parent-process", isThreat: false });
    lastNodeId = "parent-process";
  }

  // 4. Spawned Binary Node (if processPath exists)
  if (alert.details?.processPath) {
    nodes.push({
      id: "process",
      label: alert.details.processPath,
      type: "process",
      severity: "critical",
      x: 430,
      y: 150,
      details: `Flagged anomalous execution node: ${alert.details.processPath}. Command line arguments: "${alert.details.commandLine || 'none'}". Isolation Forest score: ${alert.score}/100.`,
    });
    links.push({ source: lastNodeId, target: "process", isThreat: true });
    lastNodeId = "process";
  }

  // 5. Remote Destination Node (if ipAddress exists)
  if (alert.details?.ipAddress) {
    const rep = context?.threat_intelligence.reputation || "unknown";
    const sev = rep === "malicious" ? "critical" : rep === "suspicious" ? "high" : "none";
    nodes.push({
      id: "remote-ip",
      label: `${alert.details.ipAddress}${alert.details.port ? `:${alert.details.port}` : ""}`,
      type: "external-ip",
      severity: sev as any,
      x: 610,
      y: 150,
      details: `Remote connection endpoint: ${alert.details.ipAddress} on port ${alert.details.port || 'N/A'}. Reputation: ${rep.toUpperCase()}. Category: ${context?.threat_intelligence.category || 'Unclassified'}. Summary: ${context?.threat_intelligence.summary || 'No threat details.'}`,
    });
    links.push({ source: lastNodeId, target: "remote-ip", isThreat: true });
  }

  return { nodes, links };
}

export default function ThreatGraph({
  activeAlert,
  activeInvestigationId,
}: ThreatGraphProps) {
  // Query investigations queue
  const { data: investigations, isPending: isListPending, isError: isListError } = useInvestigations();

  // Determine target investigation ID: use props if present, else fallback to the latest in the queue
  const targetId = useMemo(() => {
    if (activeInvestigationId) return activeInvestigationId;
    if (investigations && investigations.length > 0) {
      return investigations[0].investigation_id;
    }
    return undefined;
  }, [activeInvestigationId, investigations]);

  // Load detailed investigation state (including alerts and context lookups)
  const { data: detailData, isPending: isDetailPending, isError: isDetailError } = useInvestigation(targetId);

  const isPending = isListPending || isDetailPending;
  const isError = isListError || isDetailError;

  // Selected node inspection state
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isolatedNodes, setIsolatedNodes] = useState<string[]>([]);

  // Dynamically build graph data when detailed investigation completes loading
  const graph = useMemo(() => {
    if (!detailData) return { nodes: [], links: [] };
    const alertData = detailData.alert as Alert;
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

  if (isError || !detailData) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Evidence Graph"
          subtitle="Visualize relationships between container processes, socket files, and active network connections in an interactive evidence map."
        />
        <div className="flex flex-col items-center justify-center h-64 text-red-400 font-mono text-xs gap-3">
          <AlertTriangle className="w-6 h-6 text-red-500 animate-pulse" />
          <span>No active investigation data available to map. Please trigger an alert.</span>
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

      <div className="bg-[#161A22]/20 border border-border-custom/20 rounded-xl p-5 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-gray-300 font-sans">
        <div className="space-y-1">
          {activeInvestigationId ? (
            <>
              <p className="text-xs text-gray-500 font-mono">Showing evidence for:</p>
              <h2 className="text-base font-bold text-gray-100 font-mono tracking-tight">
                {detailData.investigation.investigation_id}
              </h2>
              <p className="text-sm font-medium text-purple-400">
                {detailData.investigation.title}
              </p>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold text-orange-400 uppercase tracking-wider font-mono">
                ⚠ No investigation selected.
              </p>
              <p className="text-xs text-gray-500">
                Displaying the most recent investigation.
              </p>
              <h2 className="text-sm font-bold text-gray-200 font-mono mt-1">
                {detailData.investigation.investigation_id} · {detailData.investigation.title}
              </h2>
            </>
          )}
        </div>
        <Badge variant={detailData.investigation.status.toLowerCase() === "resolved" ? "success" : "default"} className="self-start sm:self-center">
          {detailData.investigation.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* SVG Graph Canvas */}
        <div className="lg:col-span-8">
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

                  return (
                    <g key={idx}>
                      <line
                        x1={sourceNode.x}
                        y1={sourceNode.y}
                        x2={targetNode.x}
                        y2={targetNode.y}
                        stroke={
                          isSourceIsolated || isTargetIsolated
                            ? "#23262F"
                            : link.isThreat
                              ? "#EF4444"
                              : "#23262F"
                        }
                        strokeWidth={link.isThreat ? "2" : "1.5"}
                        strokeDasharray={link.isThreat ? "4,4" : undefined}
                        className={
                          link.isThreat && !(isSourceIsolated || isTargetIsolated)
                            ? "animate-[dash_10s_linear_infinite]"
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

                  // Node icons
                  const renderIcon = (type: string) => {
                    switch (type) {
                      case "pod":
                        return <Server className="w-4 h-4" />;
                      case "process":
                        return <Cpu className="w-4 h-4" />;
                      case "database":
                        return <Database className="w-4 h-4" />;
                      default:
                        return <ExternalLink className="w-4 h-4" />;
                    }
                  };

                  return (
                    <g
                      key={node.id}
                      onClick={() => setSelectedNode(node)}
                      className="cursor-pointer"
                    >
                      {/* Node indicator ring on selection */}
                      {isSelected && (
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r="28"
                          fill="none"
                          stroke={
                            node.severity === "critical"
                              ? "rgba(239, 68, 68, 0.25)"
                              : "rgba(59, 130, 246, 0.25)"
                          }
                          strokeWidth="2"
                        />
                      )}

                      {/* Main Node bubble */}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r="20"
                        fill={isIsolated ? "#111317" : isSelected ? "#161A22" : "#09090B"}
                        stroke={
                          isIsolated
                            ? "#23262F"
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
                      <foreignObject
                        x={node.x - 8}
                        y={node.y - 8}
                        width="16"
                        height="16"
                        className={`pointer-events-none ${isIsolated ? "text-gray-600" : node.severity === "critical" ? "text-red-400" : node.severity === "medium" ? "text-blue-400" : "text-gray-400"}`}
                      >
                        <div className="flex items-center justify-center">
                          {renderIcon(node.type)}
                        </div>
                      </foreignObject>

                      {/* Label Text below node */}
                      <text
                        x={node.x}
                        y={node.y + 35}
                        textAnchor="middle"
                        className={`text-[9px] font-mono font-medium ${isIsolated ? "fill-gray-600" : isSelected ? "fill-white" : "fill-gray-400"}`}
                      >
                        {node.label.length > 20 ? `${node.label.slice(0, 18)}...` : node.label}
                      </text>

                      {/* Isolation Line Slash marker if isolated */}
                      {isIsolated && (
                        <line
                          x1={node.x - 14}
                          y1={node.y + 14}
                          x2={node.x + 14}
                          y2={node.y - 14}
                          stroke="#EF4444"
                          strokeWidth="2.5"
                        />
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Quick legend footer */}
            <div className="px-4 py-3 border-t border-[#23262F]/40 bg-[#161A22]/20 flex items-center justify-between text-[10px] font-mono text-gray-500">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <circle cx="4" cy="4" r="3" fill="#EF4444" /> Target Host / Threat Vector
                </span>
                <span className="flex items-center gap-1">
                  <circle cx="4" cy="4" r="3" fill="#3B82F6" /> Connected Pod / Asset
                </span>
                <span className="flex items-center gap-1">
                  <line
                    x1="0"
                    y1="4"
                    x2="8"
                    y2="4"
                    stroke="#EF4444"
                    strokeWidth="2"
                    strokeDasharray="2,2"
                  />{" "}
                  Socket egress connection
                </span>
              </div>
              <span>Click nodes to inspect telemetry metadata</span>
            </div>
          </Card>
        </div>

        {/* Selected Node Details sidecard */}
        <div className="lg:col-span-4">
          <AnimatePresence mode="wait">
            {selectedNode ? (
              <motion.div
                key={selectedNode.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <Card className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#23262F]/40 pb-3">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-400" />
                      <span className="font-mono text-xs font-bold text-gray-200">Asset Audit</span>
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
                        Asset Name
                      </div>
                      <div className="text-xs font-mono font-bold text-gray-200 mt-0.5 break-all">
                        {selectedNode.label}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-mono text-gray-500">
                        Asset Category
                      </div>
                      <div className="text-xs text-gray-400 capitalize font-medium mt-0.5">
                        {selectedNode.type}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-mono text-gray-500">
                        Technical Forensic Details
                      </div>
                      <p className="text-[11px] text-gray-400 leading-relaxed mt-1 font-sans bg-[#09090B] border border-[#23262F]/50 rounded-lg p-2.5">
                        {selectedNode.details}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-[#23262F]/40 pt-3.5">
                    {isolatedNodes.includes(selectedNode.id) ? (
                      <Button
                        variant="success"
                        onClick={() => handleIsolate(selectedNode.id)}
                        className="w-full py-2 cursor-pointer font-bold"
                      >
                        Re-establish Asset Trust
                      </Button>
                    ) : (
                      <Button
                        variant="danger"
                        onClick={() => handleIsolate(selectedNode.id)}
                        className="w-full py-2 cursor-pointer font-bold"
                      >
                        Isolate / Contain Asset
                      </Button>
                    )}
                  </div>
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
