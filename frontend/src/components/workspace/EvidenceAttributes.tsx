/**
 * EvidenceAttributes
 *
 * Key-value list of forensic fields derived from an Alert.
 * Rendered borderless with clean spacing.
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
      ? { label: "Outlier score", value: String(alert.details.isolationForestScore) }
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
    <div className="divide-y divide-border-custom/30 text-xs font-sans">
      {fields.map((f, i) => (
        <div key={i} className="flex items-start justify-between py-2 gap-4">
          <span className="text-[11px] text-gray-500 shrink-0">{f.label}</span>
          <span className="text-[11px] text-gray-300 font-mono text-right break-all select-all">
            {f.value}
          </span>
        </div>
      ))}
    </div>
  );
}
