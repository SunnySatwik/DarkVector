/**
 * EvidenceAttributes
 *
 * Key-value grid of forensic fields derived from an Alert.
 * Used in the center column of InvestigationWorkspace.
 */

import type { Alert } from "../../types";

interface Field {
  label: string;
  value: string;
}

function buildFields(alert: Alert): Field[] {
  return [
    alert.details.commandLine
      ? { label: "Command line", value: alert.details.commandLine }
      : null,
    alert.details.processPath
      ? { label: "Binary path", value: alert.details.processPath }
      : null,
    alert.details.ipAddress
      ? { label: "Destination IP", value: alert.details.ipAddress }
      : null,
    alert.details.port
      ? { label: "Port", value: String(alert.details.port) }
      : null,
    alert.details.username
      ? { label: "Subject user", value: alert.details.username }
      : null,
    { label: "Anomaly score", value: `${alert.score}%` },
    alert.details.isolationForestScore !== undefined
      ? { label: "Isolation Forest", value: String(alert.details.isolationForestScore) }
      : null,
    { label: "SHA-256", value: "e3b0c44298fc1c149afbf4c8996fb924" },
  ].filter(Boolean) as Field[];
}

interface EvidenceAttributesProps {
  alert: Alert;
}

export function EvidenceAttributes({ alert }: EvidenceAttributesProps) {
  const fields = buildFields(alert);

  return (
    <div className="grid grid-cols-1 gap-1.5">
      {fields.map((f, i) => (
        <div
          key={i}
          className="flex items-start justify-between gap-4 px-3 py-2 rounded-lg bg-black/20 border border-[#23262F]/40"
        >
          <span className="text-[10px] text-gray-500 shrink-0">{f.label}</span>
          <span className="text-[11px] text-gray-300 font-mono text-right break-all max-w-[220px]">
            {f.value}
          </span>
        </div>
      ))}
    </div>
  );
}
