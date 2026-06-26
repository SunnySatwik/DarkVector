/**
 * ProcessTree
 *
 * Vertical indented process chain (parent → spawn → remote connection).
 * Used in the center column of InvestigationWorkspace.
 */

import { CornerDownRight } from "lucide-react";
import type { Alert } from "../../types";

interface ProcessNode {
  label: string;
  role: string;
  status: "normal" | "critical" | "error";
  highlight?: boolean;
}

function buildNodes(alert: Alert): ProcessNode[] {
  return [
    {
      label: alert.details.parentProcess || "containerd-shim",
      role: "Parent process",
      status: "normal",
    },
    {
      label: alert.details.processPath || "/usr/bin/bash",
      role: "Spawned binary",
      status: "critical",
      highlight: true,
    },
    ...(alert.details.ipAddress
      ? [
          {
            label: `→ ${alert.details.ipAddress}:${alert.details.port || 443}`,
            role: "Remote connection",
            status: "error" as const,
          },
        ]
      : []),
  ];
}

const NODE_STYLE: Record<ProcessNode["status"], string> = {
  normal: "border-[#23262F]/60 bg-[#161A22]/30 text-gray-300",
  critical: "border-red-500/30 bg-red-500/5 text-red-300",
  error: "border-orange-500/25 bg-orange-500/5 text-orange-300",
};

interface ProcessTreeProps {
  alert: Alert;
}

export function ProcessTree({ alert }: ProcessTreeProps) {
  const nodes = buildNodes(alert);

  return (
    <div className="space-y-1.5 pl-2">
      {nodes.map((node, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className="flex flex-col items-center mt-2 shrink-0">
            {i > 0 && <div className="w-px h-3 bg-[#23262F] -mt-1 mb-0.5" />}
            <CornerDownRight className="w-3 h-3 text-gray-600" />
          </div>
          <div
            className={`flex-1 rounded-lg border px-3 py-2 text-xs ${NODE_STYLE[node.status]} ${
              node.highlight ? "ring-1 ring-red-500/20" : ""
            }`}
          >
            <span className="font-mono block truncate">{node.label}</span>
            <span className="text-[10px] text-gray-500 mt-0.5 block">{node.role}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
