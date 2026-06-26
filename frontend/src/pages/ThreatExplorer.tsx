import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  SlidersHorizontal,
  Terminal,
  ShieldAlert,
  Cpu,
  Network,
  CheckCircle,
  Database,
  HelpCircle,
  Eye,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  Button,
  Badge,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableCell,
  TabGroup,
  SectionHeader,
} from "../components/ui/DesignSystem";

interface ThreatLog {
  id: string;
  timestamp: string;
  namespace: string;
  pod: string;
  vector: string;
  severity: "critical" | "high" | "medium" | "low";
  payload: string;
  actionTaken: string;
}

const MOCK_EXPLORER_LOGS: ThreatLog[] = [
  {
    id: "LOG-7402",
    timestamp: "2026-06-25 22:10:04",
    namespace: "kube-system",
    pod: "kube-apiserver-east",
    vector: "CVE-2024-21626 (Docker Escape)",
    severity: "critical",
    payload: "mount -t cgroup -o rdonly none /mnt",
    actionTaken: "Flagged & Alerted",
  },
  {
    id: "LOG-7401",
    timestamp: "2026-06-25 22:08:15",
    namespace: "prod-db",
    pod: "postgres-leader-0",
    vector: "SQL Injection Attempt",
    severity: "high",
    payload: "SELECT * FROM users WHERE id = 1' OR '1'='1",
    actionTaken: "Blocked by WAF",
  },
  {
    id: "LOG-7399",
    timestamp: "2026-06-25 21:55:30",
    namespace: "kube-system",
    pod: "coredns-7c5b9",
    vector: "DNS Tunneling Probe",
    severity: "medium",
    payload: "subdomain.malicious-egress-vector.com",
    actionTaken: "Rate Limited",
  },
  {
    id: "LOG-7398",
    timestamp: "2026-06-25 21:40:12",
    namespace: "default",
    pod: "frontend-nginx-68",
    vector: "HTTP 403 Flooding",
    severity: "low",
    payload: "GET /admin/settings.php?debug=1",
    actionTaken: "Monitored",
  },
  {
    id: "LOG-7395",
    timestamp: "2026-06-25 21:12:00",
    namespace: "finance",
    pod: "ledger-payment-7a",
    vector: "Unauthorized Secret Access",
    severity: "critical",
    payload: "kubectl auth can-i create secrets",
    actionTaken: "IAM Terminated",
  },
  {
    id: "LOG-7392",
    timestamp: "2026-06-25 20:45:18",
    namespace: "default",
    pod: "worker-node-3b",
    vector: "Abnormal Process Fork",
    severity: "high",
    payload: 'python -c "import socket,subprocess,os..."',
    actionTaken: "Process Isolated",
  },
];

export default function ThreatExplorer() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<ThreatLog | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const filteredLogs = MOCK_EXPLORER_LOGS.filter((log) => {
    const matchesSearch =
      log.pod.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.vector.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.payload.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSeverity = selectedSeverity === "all" || log.severity === selectedSeverity;

    return matchesSearch && matchesSeverity;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-bold text-gray-100 tracking-tight flex items-center gap-2">
            Threat Explorer
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Audit cluster namespaces, inspect raw runtime process tracing logs, and query historical
            payload anomalies.
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="secondary"
          size="sm"
          className="self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          <span>Refresh Traces</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Main Search and Log Table View */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="p-3 bg-[#111317]/90">
            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <div className="relative w-full">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Query pod, vector, payload keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#09090B] border border-[#23262F]/80 rounded-lg py-2 pl-9 pr-4 text-xs font-mono text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Severity Quick Filters */}
              <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                {["all", "critical", "high", "medium", "low"].map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setSelectedSeverity(sev)}
                    className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-mono font-medium uppercase tracking-wider transition-all select-none cursor-pointer ${
                      selectedSeverity === sev
                        ? "bg-blue-600/10 text-blue-400 border-blue-500/40"
                        : "bg-black/30 border-[#23262F]/60 text-gray-500 hover:text-gray-300 hover:bg-[#161A22]"
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Results Table */}
          <Card className="p-0">
            <div className="p-4 border-b border-[#23262F]/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-blue-400" />
                <span className="font-mono text-xs font-bold text-gray-200 uppercase tracking-wider">
                  Traced Containers Log Stream
                </span>
              </div>
              <Badge variant="default">{filteredLogs.length} traces found</Badge>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Severity</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Pod Location</TableHead>
                  <TableHead>Attack Vector</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <tbody>
                {filteredLogs.map((log) => (
                  <TableRow
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={`cursor-pointer ${selectedLog?.id === log.id ? "bg-blue-500/5" : ""}`}
                  >
                    <TableCell>
                      <Badge variant={log.severity}>{log.severity}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-[10px] text-gray-400">
                      {log.timestamp.split(" ")[1]}
                    </TableCell>
                    <TableCell className="font-mono">
                      <span className="text-blue-400">{log.namespace}</span>
                      <span className="text-gray-500">/</span>
                      <span className="text-gray-300">{log.pod}</span>
                    </TableCell>
                    <TableCell className="font-sans font-medium text-gray-200">
                      {log.vector}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="xs">
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {filteredLogs.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-gray-500 font-mono text-xs"
                    >
                      No security anomalies matched query constraints.
                    </TableCell>
                  </TableRow>
                )}
              </tbody>
            </Table>
          </Card>
        </div>

        {/* Detailed Side Panel */}
        <div className="lg:col-span-4">
          <AnimatePresence mode="wait">
            {selectedLog ? (
              <motion.div
                key={selectedLog.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                <Card className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#23262F]/40 pb-3">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-purple-400" />
                      <span className="font-mono text-xs font-bold text-gray-200">
                        Trace {selectedLog.id}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedLog(null)}
                      className="text-gray-500 hover:text-gray-300 transition-colors p-0.5"
                    >
                      &times;
                    </button>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    <div>
                      <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                        Pod Environment
                      </div>
                      <div className="font-mono text-gray-200 bg-[#09090B] border border-[#23262F]/50 rounded-md p-1.5 mt-1">
                        Namespace: {selectedLog.namespace}
                        <br />
                        Pod Name: {selectedLog.pod}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                        Injected Raw Payload
                      </div>
                      <div className="font-mono text-blue-400 bg-black/40 border border-blue-500/10 rounded-md p-2 mt-1 whitespace-pre-wrap break-all text-[10px]">
                        {selectedLog.payload}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                        Incident Remediation
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-400 mt-1 font-mono text-[11px]">
                        <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{selectedLog.actionTaken}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[#23262F]/40 pt-3 flex gap-2">
                    <Button variant="primary" className="w-full">
                      Isolate Sandbox Environment
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ) : (
              <Card className="text-center py-12 text-gray-500 space-y-2">
                <SlidersHorizontal className="w-8 h-8 text-gray-600 mx-auto" />
                <p className="text-xs font-mono">
                  Select a trace connection row from the log table stream to audit raw forensic
                  dumps.
                </p>
              </Card>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
