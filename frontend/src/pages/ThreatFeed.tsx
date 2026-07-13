import { useState } from "react";
import { motion } from "motion/react";
import { useAlerts } from "../hooks/useAlerts";
import { Alert } from "../types";
import { formatLocalTimeOnly } from "../lib/timeFormatter";

import {
  ShieldAlert,
  Search,
  Filter,
  Terminal,
  Clock,
  HardDrive,
  Network,
  Lock,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { PageHeader } from "../components/ui/DesignSystem";
import { severityBadgeClass } from "../lib/severity";

interface ThreatFeedProps {
  onSelectAlert: (alert: Alert) => void;
}

export default function ThreatFeed({ onSelectAlert }: ThreatFeedProps) {
  const { alerts } = useAlerts();
  console.log("Dashboard alerts:", alerts.length);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeSeverity, setActiveSeverity] = useState<string>("all");
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);

  const filteredAlerts = alerts.filter((alert) => {
    const matchesSearch =
      alert.id.toLowerCase().includes(search.toLowerCase()) ||
      alert.source.toLowerCase().includes(search.toLowerCase()) ||
      alert.type.toLowerCase().includes(search.toLowerCase()) ||
      alert.description.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = activeCategory === "all" || alert.category === activeCategory;
    const matchesSeverity = activeSeverity === "all" || alert.severity === activeSeverity;

    return matchesSearch && matchesCategory && matchesSeverity;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "authentication":
        return <Lock className="w-4 h-4 text-red-400" />;
      case "network":
        return <Network className="w-4 h-4 text-blue-400" />;
      case "process":
        return <Terminal className="w-4 h-4 text-purple-400" />;
      default:
        return <HardDrive className="w-4 h-4 text-green-400" />;
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedAlertId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security Threat Feed"
        subtitle="Chronological real-time forensic timeline of suspicious telemetry and host events."
      />

      {/* Filters & Search Toolbar */}
      <div className="bg-[#111317] border border-[#23262F] rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search host, ID, process or hash..."
            className="w-full bg-[#09090B] border border-[#23262F] rounded-lg pl-9 pr-4 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
          {["all", "authentication", "network", "process", "system"].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium capitalize transition-all cursor-pointer ${activeCategory === cat
                  ? "bg-blue-500/15 text-blue-400 border border-blue-500/35"
                  : "bg-transparent text-gray-500 hover:text-gray-300"
                }`}
            >
              {cat === "all" ? "All Logs" : cat}
            </button>
          ))}
        </div>

        {/* Severity Filter Dropdown */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-3.5 h-3.5 text-gray-500 shrink-0" />
          <select
            value={activeSeverity}
            onChange={(e) => setActiveSeverity(e.target.value)}
            className="w-full md:w-auto bg-[#09090B] border border-[#23262F] text-xs font-mono text-gray-400 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
          >
            <option value="all">Severity: All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Logs Timeline List */}
      <div className="space-y-3">
        {filteredAlerts.map((alert) => {
          const isExpanded = expandedAlertId === alert.id;
          return (
            <div
              key={alert.id}
              className={`bg-[#111317] border rounded-xl overflow-hidden transition-all duration-200 ${isExpanded
                  ? "border-purple-500/40 shadow-lg shadow-purple-500/5"
                  : "border-[#23262F] hover:border-[#23262F]/80"
                }`}
            >
              {/* Log Header Row */}
              <div
                onClick={() => toggleExpand(alert.id)}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none"
              >
                <div className="flex items-start gap-3 min-w-0">
                  {/* Category Indicator Icon */}
                  <div className="p-2 bg-black/40 border border-[#23262F]/60 rounded-lg shrink-0 mt-0.5">
                    {getCategoryIcon(alert.category)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-bold text-gray-500">{alert.id}</span>
                      <span className="text-xs font-mono text-blue-400 font-semibold">
                        {alert.source}
                      </span>
                      <span className="text-[10px] font-mono text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatLocalTimeOnly(alert.timestamp)}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-100 mt-1">{alert.type}</h3>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                  <span
                    className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${severityBadgeClass(alert.severity)}`}
                  >
                    {alert.severity}
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectAlert(alert);
                    }}
                    className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white font-mono text-[10px] px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold shadow shadow-blue-500/20"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Investigate</span>
                  </button>

                  <div className="text-gray-500">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </div>
              </div>

              {/* Collapsed/Expanded Detailed Telemetry Panel */}
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-[#23262F] bg-black/25 p-5 text-xs font-sans leading-relaxed text-gray-300 space-y-4"
                >
                  <p className="text-sm text-gray-200 bg-[#161A22]/40 border border-[#23262F]/40 rounded-lg p-3">
                    {alert.description}
                  </p>

                  {/* Forensic Variables Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Parameters list */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider font-bold">
                        Forensic Telemetry Parameters
                      </div>
                      <div className="bg-[#111317]/60 border border-[#23262F]/50 rounded-lg divide-y divide-[#23262F]/30 overflow-hidden font-mono text-[11px]">
                        {alert.details.ipAddress && (
                          <div className="flex items-center justify-between p-2">
                            <span className="text-gray-500">IP ADDRESS:</span>
                            <span className="text-gray-300 font-semibold">
                              {alert.details.ipAddress}
                            </span>
                          </div>
                        )}
                        {alert.details.port && (
                          <div className="flex items-center justify-between p-2">
                            <span className="text-gray-500">DESTINATION PORT:</span>
                            <span className="text-gray-300">{alert.details.port}</span>
                          </div>
                        )}
                        {alert.details.processPath && (
                          <div className="flex items-center justify-between p-2">
                            <span className="text-gray-500">BINARY PATH:</span>
                            <span
                              className="text-purple-400 truncate max-w-[200px]"
                              title={alert.details.processPath}
                            >
                              {alert.details.processPath}
                            </span>
                          </div>
                        )}
                        {alert.details.parentProcess && (
                          <div className="flex items-center justify-between p-2">
                            <span className="text-gray-500">PARENT PROCESS:</span>
                            <span
                              className="text-gray-400 truncate max-w-[200px]"
                              title={alert.details.parentProcess}
                            >
                              {alert.details.parentProcess}
                            </span>
                          </div>
                        )}
                        {alert.details.username && (
                          <div className="flex items-center justify-between p-2">
                            <span className="text-gray-500">AUTHORIZED USERNAME:</span>
                            <span className="text-blue-400 font-semibold">
                              {alert.details.username}
                            </span>
                          </div>
                        )}
                        {alert.details.bytesTransferred && (
                          <div className="flex items-center justify-between p-2">
                            <span className="text-gray-500">PAYLOAD EGRESS SIZE:</span>
                            <span className="text-red-400 font-semibold">
                              {(alert.details.bytesTransferred / (1024 * 1024)).toFixed(2)} MB
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* SHAP Weights in Expanded View */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider font-bold">
                        Explainable AI Attribution (SHAP)
                      </div>
                      <div className="bg-[#111317]/60 border border-[#23262F]/50 rounded-lg p-3 space-y-2.5">
                        {alert.details.shapFactors?.map((shap, index) => (
                          <div key={index} className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] text-gray-400">
                              <span>{shap.factor}</span>
                              <span className="font-mono text-purple-400 text-[10px] font-bold">
                                {(shap.impact * 100).toFixed(0)}% contribution
                              </span>
                            </div>
                            <div className="w-full bg-[#09090B] h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full"
                                style={{ width: `${shap.impact * 100}%` }}
                              />
                            </div>
                          </div>
                        )) || (
                            <div className="text-gray-500 text-center font-mono py-6">
                              No explainability vectors generated for this class.
                            </div>
                          )}
                      </div>
                    </div>
                  </div>

                  {/* Shell Command preview */}
                  {alert.details.commandLine && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider font-bold">
                        Spawned Process Arguments
                      </div>
                      <div className="bg-[#09090B] border border-[#23262F] rounded-lg p-2.5 font-mono text-red-400 text-[11px] overflow-x-auto break-all">
                        {alert.details.commandLine}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          );
        })}

        {filteredAlerts.length === 0 && (
          <div className="bg-[#111317] border border-[#23262F] rounded-xl py-20 text-center flex flex-col items-center justify-center text-gray-500">
            <ShieldAlert className="w-8 h-8 mb-3 text-gray-600" />
            <h3 className="font-mono text-xs">No threats found matching current query</h3>
            <p className="text-[11px] mt-1 font-sans">
              Try expanding your search parameters or selecting other logs tags.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
