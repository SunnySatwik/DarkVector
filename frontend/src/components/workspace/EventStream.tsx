/**
 * EventStream
 *
 * Compact log-style event rows for a given alert.
 * Rendered as plain rows — no bordered cards.
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
      { level: "WARN", source: "auditd",      msg: "sys_clone with anomalous namespace flags" },
      { level: "CRIT", source: "containerd",  msg: `Shell spawned inside: ${alert.source}` },
      { level: "INFO", source: "kernel",      msg: `Parent: ${alert.details.parentProcess || "unknown"}` },
    ],
    network: [
      { level: "WARN", source: "flow-monitor", msg: "Egress volume exceeded threshold" },
      { level: "CRIT", source: "netpol",       msg: `Exfil to ${alert.details.ipAddress || "unknown"}` },
      { level: "INFO", source: "gateway",      msg: `Port ${alert.details.port || 5432} session` },
    ],
    authentication: [
      { level: "CRIT", source: "geo-verify",  msg: "Geographic velocity anomaly — 2 continents in 18 min" },
      { level: "WARN", source: "mfa-hub",     msg: "MFA bypass signature identified" },
      { level: "INFO", source: "auth-srv",    msg: `User: ${alert.details.username || "unknown"}` },
    ],
    system: [
      { level: "CRIT", source: "iam-engine",  msg: "IAM permission delta crossed threshold" },
      { level: "WARN", source: "sts-proxy",   msg: "AssumeRole from unexpected EC2 instance" },
      { level: "INFO", source: "iam-proxy",   msg: `Role: ${alert.details.username || "AssumedRole-S3-Manager"}` },
    ],
  };

  const entries = base[alert.category] ?? base.process;
  return entries.map((e, i) => ({ ...e, id: i }));
}

const LEVEL_DOT: Record<string, string> = {
  CRIT: "bg-red-500",
  WARN: "bg-yellow-500",
  INFO: "bg-gray-600",
};

const LEVEL_TEXT: Record<string, string> = {
  CRIT: "text-red-400",
  WARN: "text-yellow-400",
  INFO: "text-gray-500",
};

interface EventStreamProps {
  alert: Alert;
}

export function EventStream({ alert }: EventStreamProps) {
  const entries = buildEventStream(alert);

  return (
    <div className="space-y-0 divide-y divide-border-custom/15">
      {entries.map((e) => (
        <div key={e.id} className="flex items-start gap-2 py-2 first:pt-0 last:pb-0">
          <span className={`mt-[5px] w-1.5 h-1.5 rounded-full shrink-0 ${LEVEL_DOT[e.level]}`} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5">
              <span className={`text-[9px] font-mono font-bold shrink-0 ${LEVEL_TEXT[e.level]}`}>
                {e.level}
              </span>
              <span className="text-[9px] text-gray-600 font-mono truncate">{e.source}</span>
            </div>
            <p className="text-[10px] text-gray-400 leading-snug mt-0.5">{e.msg}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
