/**
 * EventStream
 *
 * Filtered, categorised event log feed for a given alert.
 * Used in the left column of InvestigationWorkspace.
 */

import type { Alert } from "../../types";

interface StreamEntry {
  id: number;
  level: "CRIT" | "WARN" | "INFO";
  source: string;
  msg: string;
}

function buildEventStream(alert: Alert): StreamEntry[] {
  const base: Record<string, Omit<StreamEntry, "id">[]> = {
    process: [
      { level: "WARN", source: "auditd", msg: "sys_clone issued with anomalous namespace flags" },
      { level: "CRIT", source: "containerd", msg: `Raw shell spawned inside container: ${alert.source}` },
      { level: "INFO", source: "kernel", msg: `Parent process: ${alert.details.parentProcess || "unknown"}` },
    ],
    network: [
      { level: "WARN", source: "flow-monitor", msg: "Egress transfer volume exceeded threshold" },
      { level: "CRIT", source: "netpol", msg: `Data exfil to ${alert.details.ipAddress || "unknown"} detected` },
      { level: "INFO", source: "gateway", msg: `Port ${alert.details.port || 5432} session opened` },
    ],
    authentication: [
      { level: "CRIT", source: "geo-verify", msg: "Geographic velocity anomaly — 2 continents in 18min" },
      { level: "WARN", source: "mfa-hub", msg: "MFA bypass signature identified" },
      { level: "INFO", source: "auth-srv", msg: `User: ${alert.details.username || "unknown"}` },
    ],
    system: [
      { level: "CRIT", source: "iam-engine", msg: "IAM permission delta crossed threshold" },
      { level: "WARN", source: "sts-proxy", msg: "AssumeRole triggered from unexpected EC2 instance" },
      { level: "INFO", source: "iam-proxy", msg: `Role: ${alert.details.username || "AssumedRole-S3-Manager"}` },
    ],
  };

  const entries = base[alert.category] ?? base.process;
  return entries.map((e, i) => ({ ...e, id: i }));
}

const LEVEL_TEXT: Record<string, string> = {
  CRIT: "text-red-400",
  WARN: "text-yellow-400",
  INFO: "text-gray-500",
};

const LEVEL_BG: Record<string, string> = {
  CRIT: "bg-red-500/8 border-red-500/15",
  WARN: "bg-yellow-500/8 border-yellow-500/15",
  INFO: "bg-[#161A22]/40 border-[#23262F]/30",
};

interface EventStreamProps {
  alert: Alert;
}

export function EventStream({ alert }: EventStreamProps) {
  const entries = buildEventStream(alert);

  return (
    <div className="space-y-1.5">
      {entries.map((e) => (
        <div key={e.id} className={`rounded-lg border px-2.5 py-2 ${LEVEL_BG[e.level]}`}>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={`text-[9px] font-mono font-bold ${LEVEL_TEXT[e.level]}`}>
              {e.level}
            </span>
            <span className="text-[9px] text-gray-600 font-mono">{e.source}</span>
          </div>
          <p className="text-[10px] text-gray-400 leading-snug">{e.msg}</p>
        </div>
      ))}
    </div>
  );
}
