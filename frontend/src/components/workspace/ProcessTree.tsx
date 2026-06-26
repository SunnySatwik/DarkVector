/**
 * ProcessTree
 *
 * Compact indented process chain (parent → spawn → remote connection).
 * Rendered as clean text rows without decorative panels.
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
            label: `${alert.details.ipAddress}:${alert.details.port || 443}`,
            role: "Remote connection",
            status: "error" as const,
          },
        ]
      : []),
  ];
}

const NODE_STYLE: Record<ProcessNode["status"], string> = {
  normal:   "text-gray-400",
  critical: "text-red-400",
  error:    "text-orange-400",
};

interface ProcessTreeProps {
  alert: Alert;
}

export function ProcessTree({ alert }: ProcessTreeProps) {
  const nodes = buildNodes(alert);

  return (
    <div className="space-y-1.5 pl-0.5 font-mono">
      {nodes.map((node, i) => (
        <div key={i} className="flex items-start gap-2">
          <CornerDownRight className="w-3 h-3 text-gray-700 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-[11px] truncate break-all leading-tight ${NODE_STYLE[node.status]}`}>
                {node.label}
              </span>
              {node.highlight && (
                <span className="text-[9px] font-sans px-1 py-px rounded bg-red-500/8 text-red-400 border border-red-500/15">
                  Flagged
                </span>
              )}
            </div>
            <span className="text-[10px] text-gray-600 block font-sans mt-0.5">{node.role}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
