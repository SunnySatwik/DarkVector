import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Network,
  ShieldAlert,
  Cpu,
  Database,
  Server,
  ExternalLink,
  Shield,
  HelpCircle,
} from "lucide-react";
import { Card, Button, Badge, SectionHeader } from "../components/ui/DesignSystem";

interface Node {
  id: string;
  label: string;
  type: "pod" | "process" | "database" | "external-ip";
  severity: "critical" | "high" | "medium" | "none";
  x: number;
  y: number;
  details: string;
}

interface Link {
  source: string;
  target: string;
  isThreat: boolean;
}

const MOCK_NODES: Node[] = [
  {
    id: "1",
    label: "ingress-nginx",
    type: "pod",
    severity: "none",
    x: 100,
    y: 150,
    details: "Public-facing reverse proxy routing inbound HTTP vectors.",
  },
  {
    id: "2",
    label: "auth-service",
    type: "pod",
    severity: "medium",
    x: 280,
    y: 150,
    details: "Handles authentication and core user authorization claims.",
  },
  {
    id: "3",
    label: "k8s-api-agent",
    type: "process",
    severity: "critical",
    x: 460,
    y: 100,
    details: "Injected namespace container running hijacked terminal process.",
  },
  {
    id: "4",
    label: "postgres-leader",
    type: "database",
    severity: "none",
    x: 460,
    y: 220,
    details: "Main system backend database housing application records.",
  },
  {
    id: "5",
    label: "194.26.135.84",
    type: "external-ip",
    severity: "critical",
    x: 640,
    y: 100,
    details: "Known command-and-control server (C2) hosting secondary payloads.",
  },
];

const MOCK_LINKS: Link[] = [
  { source: "1", target: "2", isThreat: false },
  { source: "2", target: "3", isThreat: true },
  { source: "2", target: "4", isThreat: false },
  { source: "3", target: "5", isThreat: true },
];

export default function ThreatGraph() {
  const [selectedNode, setSelectedNode] = useState<Node | null>(MOCK_NODES[2]); // Default to critical hijacked process
  const [nodes, setNodes] = useState<Node[]>(MOCK_NODES);
  const [isolatedNodes, setIsolatedNodes] = useState<string[]>([]);

  const handleIsolate = (nodeId: string) => {
    if (isolatedNodes.includes(nodeId)) {
      setIsolatedNodes((prev) => prev.filter((id) => id !== nodeId));
    } else {
      setIsolatedNodes((prev) => [...prev, nodeId]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-display font-bold text-gray-100 tracking-tight flex items-center gap-2">
          Security Threat Graph
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Interactive forensic topology mapper correlating container processes, socket paths, and
          active C2 threat connections.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* SVG Graph Canvas */}
        <div className="lg:col-span-8">
          <Card className="p-0 bg-black/45 overflow-hidden">
            <div className="p-4 border-b border-[#23262F]/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-blue-400" />
                <span className="font-mono text-xs font-bold text-gray-200 uppercase tracking-wider">
                  Threat Propagation Vector Map
                </span>
              </div>
              <div className="flex gap-2">
                <Badge variant="critical">Critical Link Triggered</Badge>
              </div>
            </div>

            {/* Interactive Topology Graph Canvas */}
            <div className="relative w-full overflow-x-auto min-h-[400px] flex justify-center items-center p-6 cyber-grid">
              <svg className="w-[750px] h-[300px] select-none" viewBox="0 0 750 300">
                {/* Connections (Links) */}
                {MOCK_LINKS.map((link, idx) => {
                  const sourceNode = nodes.find((n) => n.id === link.source);
                  const targetNode = nodes.find((n) => n.id === link.target);
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
                {nodes.map((node) => {
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
                        className={`text-[10px] font-mono font-medium ${isIsolated ? "fill-gray-600" : isSelected ? "fill-white" : "fill-gray-400"}`}
                      >
                        {node.label}
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
                  <circle cx="4" cy="4" r="3" fill="#EF4444" /> Critical Threat Vector
                </span>
                <span className="flex items-center gap-1">
                  <circle cx="4" cy="4" r="3" fill="#3B82F6" /> Connected Pod
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
                  Socket Egress Connection
                </span>
              </div>
              <span>Click nodes to inspect metadata</span>
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
                transition={{ duration: 0.18 }}
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
                      <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                        Asset Name
                      </div>
                      <div className="text-xs font-mono font-bold text-gray-200 mt-0.5">
                        {selectedNode.label}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                        Asset Category
                      </div>
                      <div className="text-xs text-gray-400 capitalize font-medium mt-0.5">
                        {selectedNode.type}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
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
                        RE-ESTABLISH ASSET TRUST
                      </Button>
                    ) : (
                      <Button
                        variant="danger"
                        onClick={() => handleIsolate(selectedNode.id)}
                        className="w-full py-2 cursor-pointer font-bold"
                      >
                        ISOLATE / CONTAIN ASSET
                      </Button>
                    )}
                  </div>
                </Card>
              </motion.div>
            ) : (
              <Card className="text-center py-12 text-gray-500">
                <HelpCircle className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-xs font-mono">
                  Select a topology element on the map canvas to trigger forensic inspection.
                </p>
              </Card>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
