/**
 * ProcessTree
 *
 * Vertical indented process chain (parent → spawn → remote connection).
 * Rendered borderless for clean, text-focused layout.
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
  normal: "text-gray-300",
  critical: "text-red-400 font-semibold",
  error: "text-orange-400",
};

interface ProcessTreeProps {
  alert: Alert;
}

export function ProcessTree({ alert }: ProcessTreeProps) {
  const nodes = buildNodes(alert);

  return (
    <div className="space-y-3.5 pl-1 font-mono text-xs">
      {nodes.map((node, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="flex flex-col items-center mt-1 shrink-0">
            <CornerDownRight className="w-3.5 h-3.5 text-gray-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`truncate break-all ${NODE_STYLE[node.status]}`}>{node.label}</span>
              {node.highlight && (
                <span className="text-[9px] font-sans px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 font-medium">
                  Flagged
                </span>
              )}
            </div>
            <span className="text-[10px] text-gray-500 block font-sans mt-0.5">{node.role}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
