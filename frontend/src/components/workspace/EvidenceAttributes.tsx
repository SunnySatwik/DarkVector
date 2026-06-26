/**
 * EvidenceAttributes
 *
 * Key-value list of forensic fields derived from an Alert.
 * Rendered as compact label/value rows with monospace values.
 * Used in both the left rail and center column of InvestigationWorkspace.
 */

import type { Alert } from "../../types";

interface Field {
  label: string;
  value: string;
}

function buildFields(alert: Alert): Field[] {
  return [
    alert.details.commandLine
      ? { label: "Command", value: alert.details.commandLine }
      : null,
    alert.details.processPath
      ? { label: "Binary", value: alert.details.processPath }
      : null,
    alert.details.ipAddress
      ? { label: "Destination", value: alert.details.ipAddress }
      : null,
    alert.details.port
      ? { label: "Port", value: String(alert.details.port) }
      : null,
    alert.details.username
      ? { label: "User", value: alert.details.username }
      : null,
    { label: "Score", value: `${alert.score} / 100` },
    alert.details.isolationForestScore !== undefined
      ? { label: "Outlier", value: String(alert.details.isolationForestScore) }
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
    <div className="space-y-0 divide-y divide-border-custom/12">
      {fields.map((f, i) => (
        <div key={i} className="flex items-baseline gap-4 py-1.5 first:pt-0 last:pb-0">
          <span className="text-[10px] text-gray-500 font-sans tracking-wider uppercase shrink-0 w-20">
            {f.label}
          </span>
          <span className="text-[11px] font-mono text-gray-300 min-w-0 flex-1 truncate select-all">
            {f.value}
          </span>
        </div>
      ))}
    </div>
  );
}
