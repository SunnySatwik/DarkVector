import { useState, useEffect, useRef } from "react";
import { Play, Pause, Trash2, Terminal, ShieldCheck, Database, Search } from "lucide-react";
import { PageHeader } from "../components/ui/DesignSystem";
import { formatLocalTimeOnly } from "../lib/timeFormatter";


interface LogLine {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "critical";
  service: string;
  message: string;
}

export default function LiveEvents() {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Generate mock logs
  const LOG_TEMPLATES = [
    {
      level: "info",
      service: "grpc-sensor-02",
      message: "gRPC stream heartbeat validated. Latency: 4ms",
    },
    {
      level: "info",
      service: "vector-classifier",
      message: "Isolation Forest inference processed on srv-db-backup. Anomaly Score: 0.124",
    },
    {
      level: "info",
      service: "auth-daemon",
      message: "Successful MFA validation. Username: sunnysatwik95@gmail.com",
    },
    {
      level: "warn",
      service: "k8s-ingress-controller",
      message: "HTTP 404 burst threshold reached on endpoint /v1/private/system-telemetry",
    },
    {
      level: "info",
      service: "process-tracker",
      message: "Docker process parent validation completed successfully on node-srv-k8s-04",
    },
    {
      level: "critical",
      service: "auth-daemon",
      message: "SSH brute force threshold trigger: 12 failed attempts from 185.190.140.22",
    },
    {
      level: "warn",
      service: "grpc-sensor-01",
      message: "Sensor payload size spike detected. Received 14.8MB from srv-k8s-api-01",
    },
    {
      level: "info",
      service: "network-monitor",
      message: "TLS 1.3 key exchange negotiated on interface eth0. Cryptography: X25519",
    },
    {
      level: "critical",
      service: "process-tracker",
      message: "LSASS.exe read access handle requested by cv_parser_pro.exe",
    },
  ] as const;

  useEffect(() => {
    // Seed initial logs
    const seedLogs: LogLine[] = Array.from({ length: 15 }).map((_, i) => {
      const template = LOG_TEMPLATES[Math.floor(Math.random() * LOG_TEMPLATES.length)];
      return {
        id: `LOG-${1000 + i}`,
        timestamp: new Date(Date.now() - (15 - i) * 2000).toISOString(),
        level: template.level,
        service: template.service,
        message: template.message,
      };
    });
    setLogs(seedLogs);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      const template = LOG_TEMPLATES[Math.floor(Math.random() * LOG_TEMPLATES.length)];
      const newLog: LogLine = {
        id: `LOG-${Date.now()}`,
        timestamp: new Date().toISOString(),
        level: template.level,
        service: template.service,
        message: template.message,
      };

      setLogs((prev) => {
        const nextLogs = [...prev, newLog];
        // Keep max 100 logs in terminal to optimize render performance
        return nextLogs.length > 100 ? nextLogs.slice(nextLogs.length - 100) : nextLogs;
      });
    }, 1800);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Scroll to bottom on log stream
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const filteredLogs = logs.filter((l) => {
    const matchesLevel = levelFilter === "all" || l.level === levelFilter;
    const matchesSearch =
      l.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  const getLogLevelStyle = (level: string) => {
    switch (level) {
      case "critical":
        return "text-red-400 font-bold";
      case "warn":
        return "text-orange-400 font-semibold";
      default:
        return "text-blue-400";
    }
  };

  const toolbar = (
    <div className="flex items-center gap-2.5">
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border cursor-pointer transition-colors ${
          isPlaying
            ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
            : "bg-green-500/10 text-green-400 border-green-500/20 animate-pulse"
        }`}
      >
        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        <span>{isPlaying ? "PAUSE STREAM" : "RESUME STREAM"}</span>
      </button>
      <button
        onClick={() => setLogs([])}
        className="flex items-center gap-1 bg-[#161A22] border border-[#23262F] hover:bg-[#23262F] text-gray-400 hover:text-gray-200 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold cursor-pointer transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span>CLEAR</span>
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Telemetry Terminal"
        subtitle="Real-time stdout streams of container network interfaces, authentication states, and AI model scores."
        action={toolbar}
      />

      {/* Terminal View */}
      <div className="bg-[#09090B] border border-[#23262F] rounded-xl overflow-hidden flex flex-col h-[520px]">
        {/* Terminal Header controls */}
        <div className="bg-[#111317] px-4 py-2.5 border-b border-[#23262F] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
            <Terminal className="w-4 h-4 text-purple-400" />
            <span>vector-agent-daemon@darkvector:~</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Level Selector */}
            <div className="flex items-center gap-1 text-[10px] font-mono text-gray-500">
              <span className="uppercase font-bold">LEVEL:</span>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="bg-[#09090B] border border-[#23262F] text-[10px] font-mono text-gray-400 rounded px-2 py-0.5 focus:outline-none"
              >
                <option value="all">ALL LEVELS</option>
                <option value="info">INFO</option>
                <option value="warn">WARN</option>
                <option value="critical">CRITICAL</option>
              </select>
            </div>

            {/* In-Terminal Search */}
            <div className="relative">
              <Search className="w-3 h-3 text-gray-500 absolute left-2 top-1.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="grep service or message..."
                className="bg-[#09090B] border border-[#23262F] text-[10px] font-mono text-gray-400 rounded-lg pl-7 pr-3 py-1 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Terminal Text Area */}
        <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-gray-300 space-y-1.5 scrollbar-thin select-text">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="hover:bg-[#161A22]/30 px-2 py-0.5 rounded transition-colors flex items-start gap-2.5"
            >
              <span className="text-gray-500 shrink-0">
                [{formatLocalTimeOnly(log.timestamp)}]
              </span>
              <span className={`uppercase font-bold shrink-0 w-16 ${getLogLevelStyle(log.level)}`}>
                {log.level}
              </span>
              <span className="text-purple-400 shrink-0 font-semibold w-36 truncate">
                {log.service}:
              </span>
              <span className="text-gray-300 break-all">{log.message}</span>
            </div>
          ))}

          {filteredLogs.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <span className="text-xs font-mono uppercase tracking-wider text-gray-600">
                [ No terminal logs streamed match the filter parameters ]
              </span>
            </div>
          )}

          <div ref={terminalEndRef} />
        </div>

        {/* Terminal Status bar */}
        <div className="bg-[#111317] border-t border-[#23262F] px-4 py-2 flex items-center justify-between text-[10px] font-mono text-gray-500 shrink-0">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-purple-400" />
              <span>
                Log Buffer: <strong>{logs.length} Lines</strong>
              </span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-green-400 font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span>DAEMON OPERATIONAL</span>
          </div>
        </div>
      </div>
    </div>
  );
}
