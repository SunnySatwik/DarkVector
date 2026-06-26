import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Alert, Severity } from "../types";
import { MOCK_ALERTS } from "../mockData";
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
  FileText,
  Fingerprint,
  BookOpen,
  Check,
  Share2,
  LockKeyhole,
  FileJson,
  UserCheck,
  Layers3,
  FlameKindling,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

interface InvestigationWorkspaceProps {
  activeAlert: Alert;
  openTabs: Alert[];
  onSelectAlert: (alert: Alert) => void;
  onCloseAlertTab: (alertId: string) => void;
  onCloseWorkspace: () => void;
}

export default function InvestigationWorkspace({
  activeAlert,
  openTabs,
  onSelectAlert,
  onCloseAlertTab,
  onCloseWorkspace,
}: InvestigationWorkspaceProps) {
  // UI Panels toggles
  const [activeTab, setActiveTab] = useState<"editor" | "raw-logs" | "relations">("editor");
  const [analystNote, setAnalystNote] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [quarantineStatus, setQuarantineStatus] = useState<string>("active"); // 'active' | 'quarantining' | 'quarantined'
  const [quarantineProgress, setQuarantineProgress] = useState(0);
  const [customIpBlock, setCustomIpBlock] = useState("");
  const [isBlockApplied, setIsBlockApplied] = useState(false);

  // Interactive Weights (SHAP sliders)
  const [shapWeights, setShapWeights] = useState<Record<string, number>>({});

  // Simulated logs specific to this threat
  const [threatLogs, setThreatLogs] = useState<string[]>([]);
  const [logFilter, setLogFilter] = useState("");

  // Chat message thread
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<
    Array<{ sender: "ai" | "user"; text: string; time: string }>
  >([]);
  const [isAiResponding, setIsAiResponding] = useState(false);

  // Timeline events specific to the activeAlert
  const [expandedEvents, setExpandedEvents] = useState<Record<number, boolean>>({
    0: true,
    1: true,
  });

  // Load alert-specific notes and SHAP weights on load
  useEffect(() => {
    // Note loading
    const savedNote = localStorage.getItem(`note-${activeAlert.id}`);
    setAnalystNote(
      savedNote ||
        `## Investigation Scratchpad for ${activeAlert.id}\n- Spawning node: \`${activeAlert.source}\`\n- Isolation score baseline deviation: \`${activeAlert.score}%\`\n\n### Findings:\n1. Outbound target destination matches reputation threats.\n2. Namespace system clone is anomalous to standard container templates.\n\n*Review completed. Safe for Network lockdown.*`
    );
    setIsSaved(false);

    // Dynamic SHAP weight initializer
    if (activeAlert.details?.shapFactors) {
      const weights: Record<string, number> = {};
      activeAlert.details.shapFactors.forEach((factor) => {
        weights[factor.factor] = factor.impact;
      });
      setShapWeights(weights);
    }

    // Populate forensic logs matching alert category
    const categoryLogs: Record<string, string[]> = {
      process: [
        `[${new Date().toLocaleTimeString()}] crit containerd-shim[2810]: Namespace modification detected for ${activeAlert.source}`,
        `[${new Date().toLocaleTimeString()}] info containerd-shim[2810]: Spawning root shell redirection vector (PID 28410)`,
        `[${new Date().toLocaleTimeString()}] warn auditd[1902]: sys_clone syscall execution bypassed normal namespaces filters`,
        `[${new Date().toLocaleTimeString()}] crit sys_filter[812]: Raw shell terminal spawned inside container namespace`,
        `[${new Date().toLocaleTimeString()}] debug cgroup-controller: resource limit boundaries adjusted dynamically`,
      ],
      network: [
        `[${new Date().toLocaleTimeString()}] info gateway-v4: connection request initialized from subnet 10.244.12.0/24`,
        `[${new Date().toLocaleTimeString()}] crit flow-analyzer: massive data transfer egress trigger (size: ${activeAlert.details.bytesTransferred || "4.8GB"})`,
        `[${new Date().toLocaleTimeString()}] warn reputation-check: target IP [${activeAlert.details.ipAddress || "10.240.4.19"}] flagged in reputation list`,
        `[${new Date().toLocaleTimeString()}] crit egress-filter: blocked external socket bridge port ${activeAlert.details.port || 5432}`,
      ],
      authentication: [
        `[${new Date().toLocaleTimeString()}] info auth-srv: token validation requested for user ${activeAlert.details.username || "m_chen@enterprise.com"}`,
        `[${new Date().toLocaleTimeString()}] crit geo-verifier: impossible login velocity detected (Frankfurt -> Toronto: 18min delta)`,
        `[${new Date().toLocaleTimeString()}] warn mfa-hub: dual-token confirmation bypass signature identified`,
        `[${new Date().toLocaleTimeString()}] info session-controller: temporary session id issued for admin context`,
      ],
      system: [
        `[${new Date().toLocaleTimeString()}] info iam-proxy: STS role assumption triggered on EC2 instance i-0a817b`,
        `[${new Date().toLocaleTimeString()}] crit iam-policy-engine: permission delta threshold crossed (Role: S3-Manager)`,
        `[${new Date().toLocaleTimeString()}] warn auditd: s3:ListBucket actions called from non-standard region`,
        `[${new Date().toLocaleTimeString()}] info iam-proxy: role token expired after 3600 seconds`,
      ],
    };

    setThreatLogs(categoryLogs[activeAlert.category] || categoryLogs["process"]);

    // Pre-populate AI response
    setIsAiResponding(true);
    const textIntro = `### 🧬 Gemini forensic evaluator report

I have retrieved the security context from ChromaDB vectors for **\`${activeAlert.id}\`**.

#### 🎯 Forensic analysis:
- **Anomaly vector**: \`${activeAlert.type}\`
- **Deviation score**: \`${activeAlert.score}%\`
- **Identified risk signature**: Anomaly triggers closely correlate with **APT-29 (Cozy Bear)** container breakout strategies and credential exfiltration.

#### 📜 Suggested action plan:
1. Dispatch **network policy firewall shield** block for target IP \`${activeAlert.details.ipAddress || "194.26.135.84"}\`.
2. Apply **gRPC isolation directive** to decouple container namespaces.
3. Export **JSON audit trace** to SIEM servers.`;

    const delay = setTimeout(() => {
      setChatMessages([
        {
          sender: "ai",
          text: textIntro,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setIsAiResponding(false);
    }, 400);

    return () => clearTimeout(delay);
  }, [activeAlert]);

  // Save Notes handler
  const handleSaveNotes = () => {
    localStorage.setItem(`note-${activeAlert.id}`, analystNote);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  // Perform isolation trigger animation
  const handleTriggerIsolation = () => {
    setQuarantineStatus("quarantining");
    setQuarantineProgress(5);
    const interval = setInterval(() => {
      setQuarantineProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setQuarantineStatus("quarantined");
          setChatMessages((prev) => [
            ...prev,
            {
              sender: "ai",
              text: `### 🛑 Container isolation successful\n\n- Node **\`${activeAlert.source}\`** has been successfully isolated inside the Kubernetes network namespace.\n- **Policy applied**: \`block-all-egress\`\n- **Status**: Secure`,
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          ]);
          return 100;
        }
        return p + 20;
      });
    }, 250);
  };

  // Block outbound ip
  const handleBlockIp = () => {
    setIsBlockApplied(true);
    setChatMessages((prev) => [
      ...prev,
      {
        sender: "ai",
        text: `### 🛡️ Outbound network shield active\n\nI have automatically committed a Kubernetes \`NetworkPolicy\` rule to block all outbound sockets destined for: **\`${activeAlert.details.ipAddress || "194.26.135.84"}\`** on port **\`${activeAlert.details.port || 443}\`**.`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  // send chat messaging
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput;
    setChatInput("");
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    setChatMessages((prev) => [...prev, { sender: "user", text: userText, time }]);
    setIsAiResponding(true);

    setTimeout(() => {
      let aiText = "";
      const query = userText.toLowerCase();

      if (query.includes("isolate") || query.includes("quarantine")) {
        aiText = `### 🚨 Isolation protocol activated
        
I am ready to quarantine host **\`${activeAlert.source}\`**.

Would you like to trigger the isolation sequence now? Click the **Apply dispatch** button in the remediation playbook or ask me to export the YAML deployment configurations.`;
      } else if (query.includes("explain") || query.includes("shap") || query.includes("why")) {
        aiText = `### 📊 Explanation of contributing factors (SHAP)
        
Our Isolation Forest identified three core baseline anomalies for **\`${activeAlert.id}\`**:
${activeAlert.details.shapFactors?.map((sh) => `- **${sh.factor}**: Contributed **${(shapWeights[sh.factor] ? shapWeights[sh.factor] * 100 : sh.impact * 100).toFixed(0)}%** to the final score.`).join("\n")}

*These figures indicate substantial deviation from the established cluster baseline (calculated over 100,000 standard transactions).*`;
      } else if (query.includes("notes") || query.includes("write")) {
        aiText = `### 📝 Analyst notes synced
        
I can see your notes indicate anomalous namespace creations. I recommend adding a trace tag for audit queries: \`tag: forensics-${activeAlert.id.toLowerCase()}\`.`;
      } else {
        aiText = `### 🔍 ChromaDB similarity context
        
I parsed your query: *"_**${userText}**_"*.

I have scanned the local threat vector embeddings and correlated this incident with:
1. **CVE-2022-0847 (Dirty Pipe)**: Privilege escalation in container nodes (92% cosine similarity)
2. **Mitre ATT&CK technique T1611**: Escape to host from privileged environment container.

Let me know if you need to generate mitigation scripts for these specific threat templates.`;
      }

      setChatMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: aiText,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setIsAiResponding(false);
    }, 800);
  };

  // Severity color utility
  const getSeverityStyle = (sev: Severity) => {
    switch (sev) {
      case "critical":
        return "text-red-400 bg-red-500/10 border-red-500/30";
      case "high":
        return "text-orange-400 bg-orange-500/10 border-orange-500/30";
      case "medium":
        return "text-blue-400 bg-blue-500/10 border-blue-500/30";
      default:
        return "text-green-400 bg-green-500/10 border-green-500/30";
    }
  };

  // Helper timeline events mapping
  const activeTimelineEvents = [
    {
      title: "Container pod initialization",
      desc: `Namespace isolation parameters verified on ${activeAlert.source}. Baseline matching score: 99.8%.`,
      status: "success",
      icon: <Layers className="w-3.5 h-3.5" />,
      meta: "kube-system replica",
    },
    {
      title: "Anomalous namespace redirection system call",
      desc: `Root process (PID 28410) issued sys_clone with unusual parameters, breaking typical pod baseline configurations.`,
      status: "warning",
      icon: <Cpu className="w-3.5 h-3.5" />,
      meta: activeAlert.details.processPath || "bin/exec-payload",
    },
    {
      title: "Outbound TCP connection request",
      desc: `Socket connection initiated to reputation threat destination ${activeAlert.details.ipAddress || "194.26.135.84"} on port ${activeAlert.details.port || 443}.`,
      status: "error",
      icon: <Network className="w-3.5 h-3.5" />,
      meta: `Target IP: ${activeAlert.details.ipAddress || "194.26.135.84"}`,
    },
    {
      title: "Isolation Forest anomaly alarm flagged",
      desc: `Attributed SHAP score delta crossed critical baseline thresh (Trigger value: ${activeAlert.score}% out-of-bounds).`,
      status: "critical-alert",
      icon: <ShieldAlert className="w-3.5 h-3.5" />,
      meta: `Deviation Score: ${activeAlert.score}%`,
    },
  ];

  return (
    <div className="bg-[#09090B] border border-[#23262F]/60 rounded-xl flex flex-col h-[calc(100vh-140px)] select-none overflow-hidden text-gray-200">
      {/* Top Document Header Tab Bar (Cursor/IDE Style) */}
      <div className="bg-[#111317] border-b border-[#23262F]/60 px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pr-4">
          {/* Logo element resembling file root */}
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-gray-500 border-r border-[#23262F] pr-4 mr-2 select-none shrink-0">
            <Flame className="w-4 h-4 text-red-400" />
            <span className="text-gray-300">DarkVector trace</span>
          </div>

          {/* Opened investigation tabs */}
          {openTabs.map((tab) => {
            const isActive = tab.id === activeAlert.id;
            return (
              <motion.div
                key={tab.id}
                onClick={() => onSelectAlert(tab)}
                layout
                whileTap={{ scale: 0.98 }}
                className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-mono cursor-pointer relative shrink-0 transition-colors duration-250 border ${
                  isActive
                    ? "text-purple-400 border-purple-500/25 font-semibold"
                    : "bg-[#161A22]/20 border-transparent text-gray-500 hover:text-gray-300 hover:bg-[#161A22]/40"
                }`}
              >
                {/* Premium gliding background pill */}
                {isActive && (
                  <motion.div
                    layoutId="workspaceActiveTab"
                    className="absolute inset-0 bg-purple-500/10 rounded border border-purple-500/35 z-0"
                    transition={{ type: "spring", damping: 28, stiffness: 350 }}
                  />
                )}

                <div className="flex items-center gap-2 relative z-10">
                  <FileCode
                    className={`w-3.5 h-3.5 ${isActive ? "text-purple-400" : "text-gray-500"}`}
                  />
                  <span>{tab.id}.dvtrace</span>

                  {/* Close individual tab button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseAlertTab(tab.id);
                    }}
                    className="p-1 hover:bg-[#23262F] rounded text-gray-600 hover:text-gray-300 transition-colors cursor-pointer ml-2 relative z-20"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Escape Fullscreen Workspace button */}
        <button
          onClick={onCloseWorkspace}
          className="flex items-center gap-2 text-[11px] font-mono text-gray-400 hover:text-white bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-4 py-2 rounded transition-colors cursor-pointer shrink-0"
        >
          <X className="w-3.5 h-3.5" />
          <span>Exit workspace</span>
        </button>
      </div>

      {/* Main Figma/Cursor Interactive Splitted Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* LEFT COLUMN: Investigation Workspace Outline Tree & Correlated Assets */}
        <div className="w-64 bg-[#111317]/90 border-r border-[#23262F]/60 flex flex-col justify-between shrink-0 hidden md:flex">
          <div className="flex flex-col h-full min-h-0">
            {/* Outline title */}
            <div className="p-4 border-b border-[#23262F]/40 flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-gray-400 flex items-center gap-2">
                <Layers3 className="w-3.5 h-3.5 text-purple-400" />
                Workspace outline
              </span>
              <span className="text-[8px] font-mono text-gray-500 px-2 py-0.5 rounded bg-black/40 border border-[#23262F]">
                Tree
              </span>
            </div>

            {/* Folder explorer mock files list specific to activeAlert */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500 font-extrabold mb-2">
                  <FolderOpen className="w-3 h-3 text-blue-400" />
                  <span>Case assets</span>
                </div>

                {/* Simulated Document Tree Files */}
                <div className="space-y-1 pl-2 border-l border-[#23262F]/60 ml-2">
                  <button className="w-full flex items-center gap-2 py-1 px-2 bg-purple-500/10 text-purple-400 rounded text-[11px] font-mono text-left">
                    <FileCode className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span className="truncate">{activeAlert.id}.dvtrace</span>
                  </button>

                  <button className="w-full flex items-center gap-2 py-1 px-2 hover:bg-[#161A22]/40 text-gray-500 hover:text-gray-300 rounded text-[11px] font-mono text-left">
                    <FileJson className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">incident-metadata.json</span>
                  </button>

                  <button className="w-full flex items-center gap-2 py-1 px-2 hover:bg-[#161A22]/40 text-gray-500 hover:text-gray-300 rounded text-[11px] font-mono text-left">
                    <Binary className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">memory-dump.bin</span>
                  </button>

                  <button className="w-full flex items-center gap-2 py-1 px-2 hover:bg-[#161A22]/40 text-gray-500 hover:text-gray-300 rounded text-[11px] font-mono text-left">
                    <Database className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">network-flow.pcap</span>
                  </button>
                </div>
              </div>

              {/* Threat Relationships Graph Correlation */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500 font-extrabold mb-2">
                  <Workflow className="w-3.5 h-3.5 text-red-400" />
                  <span>Threat relationships</span>
                </div>

                <div className="space-y-2 pl-2">
                  <div className="bg-black/30 border border-[#23262F]/40 p-2 rounded-lg text-[10px] font-mono space-y-1">
                    <div className="text-gray-400 font-bold flex items-center justify-between">
                      <span>Primary host:</span>
                      <span className="text-blue-400 font-normal">Active</span>
                    </div>
                    <div className="text-gray-300 truncate font-semibold">{activeAlert.source}</div>
                    <div className="text-[9px] text-gray-500">Namespace: kube-system</div>
                  </div>

                  {activeAlert.details.ipAddress && (
                    <div className="bg-red-500/5 border border-red-500/20 p-2 rounded-lg text-[10px] font-mono space-y-1">
                      <div className="text-red-400 font-bold flex items-center justify-between">
                        <span>C2 address:</span>
                        <span className="text-red-400 font-normal">Reputation threat</span>
                      </div>
                      <div className="text-gray-300 truncate font-semibold">
                        {activeAlert.details.ipAddress}
                      </div>
                      <div className="text-[9px] text-gray-500">
                        Port Match: {activeAlert.details.port || 443}
                      </div>
                    </div>
                  )}

                  {activeAlert.details.username && (
                    <div className="bg-blue-500/5 border border-blue-500/20 p-2 rounded-lg text-[10px] font-mono space-y-1">
                      <div className="text-blue-400 font-bold flex items-center justify-between">
                        <span>User security AD:</span>
                        <span className="text-yellow-400 font-bold text-[9px]">Risk 88%</span>
                      </div>
                      <div className="text-gray-300 truncate font-semibold">
                        {activeAlert.details.username}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Core metadata details */}
          <div className="p-4 border-t border-[#23262F]/40 bg-black/30 text-[10px] font-mono text-gray-500">
            <div className="flex items-center justify-between">
              <span>System baseline:</span>
              <span className="text-green-500">Secure</span>
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: Document View (Timeline, SHAP, CVE, Scratchpad, Logs) */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto scrollbar-thin p-6 space-y-6 bg-[#09090B]">
          {/* Top Banner: Core Threat Fingerprint */}
          <div className="bg-[#111317] border border-[#23262F]/80 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-mono font-extrabold border px-2 py-0.5 rounded capitalize ${getSeverityStyle(activeAlert.severity)}`}
                >
                  {activeAlert.severity}
                </span>
                <span className="text-xs font-mono text-gray-500">Id:</span>
                <span className="text-xs font-mono text-purple-400 font-semibold">
                  {activeAlert.id}
                </span>
                <span className="text-xs font-mono text-gray-500">•</span>
                <span className="text-[11px] font-mono text-gray-400 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(activeAlert.timestamp).toUTCString()}
                </span>
              </div>

              <h2 className="text-lg font-bold font-display text-gray-100 mt-1 flex items-center gap-2">
                <FlameKindling className="w-5 h-5 text-red-400 shrink-0" />
                {activeAlert.type}
              </h2>

              <p className="text-xs text-gray-400 max-w-2xl mt-1 leading-relaxed">
                {activeAlert.description}
              </p>
            </div>

            {/* Big anomaly score metrics */}
            <div className="flex items-center gap-4 shrink-0 bg-[#09090B] border border-[#23262F] rounded-lg p-4">
              <div className="text-right">
                <span className="text-[9px] font-mono text-gray-500 block font-bold">
                  Anomaly score
                </span>
                <span className="text-2xl font-mono font-extrabold text-orange-400">
                  {activeAlert.score}%
                </span>
              </div>
              <div className="w-px h-10 bg-[#23262F]" />
              <div className="text-right">
                <span className="text-[9px] font-mono text-gray-500 block font-bold">
                  ChromaDB dist
                </span>
                <span className="text-2xl font-mono font-extrabold text-blue-400">0.0892</span>
              </div>
            </div>
          </div>

          {/* Workspace Tab Content View (Timeline of Events) */}
          <div className="bg-[#111317] border border-[#23262F] rounded-xl p-4 space-y-4">
            {/* Timeline header */}
            <div className="flex items-center justify-between border-b border-[#23262F]/60 pb-2 mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4.5 h-4.5 text-blue-400" />
                <h3 className="text-xs font-mono font-bold text-gray-200">
                  Forensic timeline of events (chronological narrative)
                </h3>
              </div>
              <span className="text-[9px] font-mono text-gray-500">Interactive logs</span>
            </div>

            {/* Vertical Event Timeline sequence */}
            <div className="relative border-l border-[#23262F] ml-3 pl-6 space-y-4 py-2">
              {activeTimelineEvents.map((evt, idx) => {
                const isOpen = expandedEvents[idx];
                return (
                  <div key={idx} className="relative">
                    {/* Event bullet point node */}
                    <div
                      className={`absolute -left-[31px] top-1.5 p-1 rounded-full border bg-black shrink-0 ${
                        evt.status === "success"
                          ? "text-green-400 border-green-500/30"
                          : evt.status === "warning"
                            ? "text-yellow-400 border-yellow-500/30"
                            : evt.status === "error"
                              ? "text-red-400 border-red-500/30"
                              : "text-purple-400 border-purple-500/30 animate-pulse"
                      }`}
                    >
                      {evt.icon}
                    </div>

                    <motion.div
                      onClick={() => setExpandedEvents((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                      whileTap={{ scale: 0.995 }}
                      className="bg-black/25 border border-[#23262F]/40 hover:border-gray-500/25 rounded-lg p-3 transition-colors cursor-pointer select-none"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-gray-200">{evt.title}</span>
                        <div className="flex items-center gap-2 text-[10px] font-mono">
                          <span className="text-gray-500 bg-black/40 px-2 py-0.5 rounded border border-[#23262F]">
                            {evt.meta}
                          </span>
                          <span className="text-gray-600">
                            {isOpen ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </span>
                        </div>
                      </div>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                            className="overflow-hidden"
                          >
                            <p className="text-[11px] text-gray-400 leading-relaxed mt-2 pl-1 border-l border-purple-500/20 pt-1">
                              {evt.desc}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Evidence Board, Baseline Deviations & Retrieved Knowledge */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* EVIDENCE & BASELINE CONTEXT */}
            <div className="bg-[#111317] border border-[#23262F] rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 border-b border-[#23262F]/60 pb-2 mb-4">
                  <Fingerprint className="w-4 h-4 text-red-400" />
                  <h3 className="text-xs font-mono font-bold text-gray-200">
                    Physical evidence & attributes
                  </h3>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  {activeAlert.details.processPath && (
                    <div className="flex items-center justify-between p-2 rounded bg-black/20 border border-[#23262F]/40">
                      <span className="text-gray-500">Binary path:</span>
                      <span className="text-purple-400 text-[11px] select-all font-semibold">
                        {activeAlert.details.processPath}
                      </span>
                    </div>
                  )}

                  {activeAlert.details.commandLine && (
                    <div className="p-2 rounded bg-black/20 border border-[#23262F]/40 space-y-1">
                      <span className="text-gray-500 text-[10px] block font-bold">
                        Spawned command line arguments:
                      </span>
                      <code className="text-red-400 text-[11px] select-all block break-all font-semibold leading-normal font-mono">
                        {activeAlert.details.commandLine}
                      </code>
                    </div>
                  )}

                  {activeAlert.details.ipAddress && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center justify-between p-2 rounded bg-black/20 border border-[#23262F]/40">
                        <span className="text-gray-500">Destination IP:</span>
                        <span className="text-gray-300 text-[11px] font-semibold">
                          {activeAlert.details.ipAddress}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded bg-black/20 border border-[#23262F]/40">
                        <span className="text-gray-500">Target port:</span>
                        <span className="text-gray-300 text-[11px] font-semibold">
                          {activeAlert.details.port || 443}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-2 rounded bg-black/20 border border-[#23262F]/40">
                    <span className="text-gray-500">SHA256 file signature:</span>
                    <span className="text-gray-400 text-[10px] truncate max-w-[200px]">
                      e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#23262F]/30 mt-4 text-[10px] font-mono text-gray-500 flex items-center gap-2">
                <Info className="w-3.5 h-3.5" />
                <span>Forensic indicators cached safely in offline SQLite database.</span>
              </div>
            </div>

            {/* RETRIEVED KNOWLEDGE (CHROME DB VECTORS COGNITION) */}
            <div className="bg-[#111317] border border-[#23262F] rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 border-b border-[#23262F]/60 pb-2 mb-4">
                  <BookOpen className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs font-mono font-bold text-gray-200">
                    Retrieved threat intelligence knowledge
                  </h3>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-black/40 border border-[#23262F] rounded-lg">
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="text-purple-400 font-bold">APT-29 (Cozy Bear) strategy</span>
                      <span className="text-gray-500">Match 92.4%</span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                      Correlated namespace escape vectors matched tactics used in active-threat SVR
                      cyber sweeps.
                    </p>
                  </div>

                  <div className="p-4 bg-black/40 border border-[#23262F] rounded-lg">
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="text-blue-400 font-bold">CVE-2022-0847 exploit base</span>
                      <span className="text-gray-500">Match 85.1%</span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                      Matches system pipe deviations during kernel privilege transitions in root
                      shells.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#23262F]/30 mt-4 flex items-center justify-between text-[10px] font-mono text-gray-500">
                <span>Rag vector database: ChromaDB v1.8</span>
                <span className="text-purple-400">Synced</span>
              </div>
            </div>
          </div>

          {/* Dynamic Contributing Factors & Interactive SHAP Estimators */}
          <div className="bg-[#111317] border border-[#23262F] rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-[#23262F]/60 pb-2 mb-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4.5 h-4.5 text-purple-400" />
                <h3 className="text-xs font-mono font-bold text-gray-200">
                  Explainable AI (SHAP factors) & interactive parameter tweak
                </h3>
              </div>
              <span className="text-[9px] font-mono text-gray-500">
                Dynamic simulator
              </span>
            </div>

            <p className="text-xs text-gray-400 max-w-2xl leading-normal">
              Below are the dynamic influence multipliers calculated by our central Isolation Forest
              decision nodes. Move the sliders to test custom baseline variations.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sliders columns */}
              <div className="bg-[#09090B] border border-[#23262F]/60 rounded-lg p-4 space-y-4">
                {activeAlert.details.shapFactors?.map((f, i) => {
                  const curVal =
                    shapWeights[f.factor] !== undefined ? shapWeights[f.factor] : f.impact;
                  return (
                    <div key={i} className="space-y-1 font-mono text-xs">
                      <div className="flex justify-between text-[11px] text-gray-400">
                        <span className="truncate max-w-[180px]">{f.factor}</span>
                        <span className="text-purple-400 font-bold">
                          {(curVal * 100).toFixed(0)}% weight
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={curVal}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setShapWeights((prev) => ({ ...prev, [f.factor]: val }));
                          }}
                          className="flex-1 accent-purple-500 bg-black h-1 rounded appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Tweak simulation status message */}
              <div className="bg-[#09090B] border border-[#23262F]/60 rounded-lg p-4 flex flex-col justify-between text-xs text-gray-400">
                <div className="space-y-2">
                  <div className="font-mono text-[10px] text-gray-500 font-extrabold">
                    Simulation recalculation outflow:
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Tweaking parameters dynamically overrides isolation weights in the model
                    simulator pipeline.
                  </p>

                  <div className="p-2 bg-purple-500/5 border border-purple-500/10 rounded font-mono text-[11px] space-y-1 text-gray-300">
                    <div>
                      Calculated contamination index:{" "}
                      <span className="text-purple-400 font-bold">
                        {(
                          (Object.values(shapWeights).reduce((a, b) => a + b, 0) /
                            (Object.keys(shapWeights).length || 1)) *
                          2.1
                        ).toFixed(4)}
                      </span>
                    </div>
                    <div>
                      Baseline status:{" "}
                      <span className="text-red-400 font-bold animate-pulse">
                        Dev out-of-bounds
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    // Reset sliders
                    if (activeAlert.details?.shapFactors) {
                      const weights: Record<string, number> = {};
                      activeAlert.details.shapFactors.forEach((factor) => {
                        weights[factor.factor] = factor.impact;
                      });
                      setShapWeights(weights);
                    }
                  }}
                  className="mt-4 py-1 bg-black border border-[#23262F] hover:border-gray-500 rounded text-[10px] font-mono text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  Reset factory baselines
                </button>
              </div>
            </div>
          </div>

          {/* Analyst Scratchpad Persistent Notes & Raw Telemetry Streams */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* NOTES SCRATCHPAD (PERSISTENT VIA LOCALSTORAGE) */}
            <div className="bg-[#111317] border border-[#23262F] rounded-xl p-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-[#23262F]/60 pb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <h3 className="text-xs font-mono font-bold text-gray-200">
                      Analyst scratchpad & notes (persistent)
                    </h3>
                  </div>

                  <span className="text-[9px] font-mono text-gray-500">
                    Markdown supported
                  </span>
                </div>

                <p className="text-[11px] text-gray-400 font-sans leading-relaxed">
                  These notes are persistently cached in your local browser storage and linked to
                  case ID {activeAlert.id}.
                </p>

                <textarea
                  value={analystNote}
                  onChange={(e) => setAnalystNote(e.target.value)}
                  placeholder="Draft your diagnostic findings here..."
                  className="w-full bg-[#09090B] border border-[#23262F] hover:border-purple-500/40 focus:border-purple-500 focus:outline-none rounded-lg p-2 text-xs text-gray-200 font-mono h-40 resize-none font-mono"
                />
              </div>

              <div className="pt-4 border-t border-[#23262F]/30 mt-4 flex items-center justify-between">
                <button
                  onClick={handleSaveNotes}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all shadow-sm shadow-blue-500/10 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSaved ? "Notes saved!" : "Save markdown notes"}</span>
                </button>
                <span className="text-[9px] font-mono text-gray-500">
                  Auto-saved to localStorage
                </span>
              </div>
            </div>

            {/* RAW TELEMETRY LOGS OUTPUT */}
            <div className="bg-[#111317] border border-[#23262F] rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[#23262F]/60 pb-2 mb-4">
                  <div className="flex items-center gap-2">
                    <TerminalIcon className="w-4 h-4 text-purple-400" />
                    <h3 className="text-xs font-mono font-bold text-gray-200">
                      Interactive raw log stream
                    </h3>
                  </div>

                  <input
                    type="text"
                    value={logFilter}
                    onChange={(e) => setLogFilter(e.target.value)}
                    placeholder="Grep logs..."
                    className="bg-black border border-[#23262F] text-[9px] font-mono rounded px-2 py-0.5 text-gray-300 focus:outline-none focus:border-purple-500 placeholder-gray-600 w-28"
                  />
                </div>

                <div className="bg-black/40 border border-[#23262F] rounded-xl p-2 font-mono text-[10px] leading-relaxed max-h-48 overflow-y-auto min-h-[140px] space-y-2 scrollbar-thin text-gray-400">
                  {threatLogs
                    .filter(
                      (log) => !logFilter || log.toLowerCase().includes(logFilter.toLowerCase())
                    )
                    .map((log, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setChatInput(`/explain this specific console trace line: "${log}"`);
                        }}
                        className="p-1 rounded hover:bg-[#161A22]/40 transition-colors cursor-pointer flex items-start gap-2 group"
                      >
                        <span className="text-purple-400 font-bold select-none shrink-0">
                          [Log]
                        </span>
                        <span className="text-gray-300 break-all flex-1">{log}</span>
                        <span className="opacity-0 group-hover:opacity-100 text-[8px] text-purple-400 font-bold shrink-0 ml-1 font-mono">
                          [Feed copilot]
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="pt-4 border-t border-[#23262F]/30 mt-4 text-[10px] font-mono text-gray-500">
                * Click any trace logs to feed its contents directly to the Gemini Evaluator chat on
                the right.
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive AI Copilot & Remediation Control Center */}
        <div className="w-80 bg-[#111317] border-l border-[#23262F]/60 flex flex-col justify-between shrink-0 hidden lg:flex">
          {/* Header containing Copilot status info */}
          <div className="p-4 bg-[#161A22]/30 border-b border-[#23262F]/60 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                <span className="text-xs font-mono font-bold text-gray-200">
                  Gemini forensics copilot
                </span>
              </div>
              <span className="text-[8px] font-mono text-purple-400 bg-black/40 border border-[#23262F] px-2 py-0.5 rounded">
                Sec-agent-2.5
              </span>
            </div>
          </div>

          {/* Scrollable Copilot chat space */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin min-h-0">
            {/* Direct Playbooks Trigger Panel inside Right rail */}
            <div className="space-y-2 border-b border-[#23262F]/50 pb-4 mb-4">
              <span className="text-[10px] font-mono font-extrabold text-gray-500 block">
                Remediation playbook actions
              </span>

              {/* Action 1: Network Quarantine */}
              <div className="p-4 bg-black/30 border border-[#23262F] rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-mono font-bold text-gray-200 flex items-center gap-2">
                    <Unplug className="w-3.5 h-3.5 text-red-400" />
                    Container lockdown
                  </span>
                  <span
                    className={`text-[8px] font-mono font-bold px-1 rounded ${
                      quarantineStatus === "quarantined"
                        ? "bg-red-500/10 text-red-400"
                        : "bg-orange-500/10 text-orange-400"
                    }`}
                  >
                    {quarantineStatus === "quarantined"
                      ? "Isolated"
                      : quarantineStatus === "quarantining"
                        ? "Blocking..."
                        : "Disarmed"}
                  </span>
                </div>

                <p className="text-[9px] text-gray-500 font-sans leading-tight">
                  Decouples container egress interfaces. Prevents exfiltration to IP{" "}
                  {activeAlert.details.ipAddress || "194.26.135.84"}.
                </p>

                {quarantineStatus === "quarantining" && (
                  <div className="w-full bg-[#09090B] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-red-500 h-full transition-all duration-150"
                      style={{ width: `${quarantineProgress}%` }}
                    />
                  </div>
                )}

                <button
                  onClick={handleTriggerIsolation}
                  disabled={quarantineStatus !== "active"}
                  className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-mono text-[9px] font-bold py-1 px-2 rounded cursor-pointer transition-colors shadow shadow-red-500/15"
                >
                  {quarantineStatus === "quarantined"
                    ? "Node quarantined"
                    : quarantineStatus === "quarantining"
                      ? "Applying policies..."
                      : "Dispatch lockdown policy"}
                </button>
              </div>

              {/* Action 2: Apply egress firewall block */}
              {activeAlert.details.ipAddress && (
                <div className="p-4 bg-black/30 border border-[#23262F] rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-mono font-bold text-gray-200 flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-blue-400" />
                      Egress shield policy
                    </span>
                    <span
                      className={`text-[8px] font-mono font-bold px-1 rounded ${
                        isBlockApplied
                          ? "bg-green-500/10 text-green-400"
                          : "bg-gray-500/10 text-gray-500"
                      }`}
                    >
                      {isBlockApplied ? "Active" : "Ready"}
                    </span>
                  </div>

                  <p className="text-[9px] text-gray-500 font-sans leading-tight">
                    Apply targeted IP firewall block for threat node:{" "}
                    <code className="text-gray-300 font-mono">{activeAlert.details.ipAddress}</code>
                    .
                  </p>

                  <button
                    onClick={handleBlockIp}
                    disabled={isBlockApplied}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-mono text-[9px] font-bold py-1 px-2 rounded cursor-pointer transition-colors shadow shadow-blue-500/15"
                  >
                    {isBlockApplied ? "Shield deployed" : "Commit firewall policy"}
                  </button>
                </div>
              )}
            </div>

            {/* Conversational chat messages */}
            <div className="space-y-4">
              <span className="text-[10px] font-mono font-extrabold text-gray-500 block">
                Forensic reasoning & agent
              </span>

              {chatMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                >
                  <span className="text-[9px] font-mono text-gray-500 mb-1 px-1">
                    {msg.sender === "ai" ? "🤖 Sec copilot" : "👤 Analyst"} • {msg.time}
                  </span>
                  <div
                    className={`max-w-[95%] rounded-xl px-3 py-2 text-[11px] font-sans leading-relaxed border ${
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

              {isAiResponding && (
                <div className="flex flex-col items-start">
                  <span className="text-[9px] font-mono text-gray-500 mb-1 px-1">
                    🤖 Sec copilot is thinking...
                  </span>
                  <div className="bg-[#09090B] border border-[#23262F] rounded-xl px-3 py-2 text-xs text-gray-500 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce delay-75" />
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce delay-150" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Chat Input pinned to bottom of right panel */}
          <form
            onSubmit={handleSendChat}
            className="p-4 bg-[#161A22]/30 border-t border-[#23262F]/60 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask Copilot..."
              className="flex-1 bg-[#09090B] border border-[#23262F] focus:border-purple-500 focus:outline-none rounded-lg px-3 py-2 text-xs text-gray-200 font-mono placeholder-gray-600 transition-colors"
            />
            <button
              type="submit"
              className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg cursor-pointer transition-colors shadow shadow-purple-500/20 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
