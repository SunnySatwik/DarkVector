/**
 * VectorContextHeader
 *
 * Refined investigation identity + context indicator strip.
 * - Brand identity row (orb + name + case ID + severity + risk)
 * - Context chip horizontal strip with overflow fade mask
 * - Subtle scan animation on chips when Vector is reasoning
 * - Compact: full header under ~96px
 */

import { memo } from "react";
import { VectorOrb, VectorOrbState } from "./VectorOrb";

interface VectorContextHeaderProps {
  investigationId?: string;
  alertId?: string;
  title?: string;
  severity?: string;
  riskScore?: number;
  contextChips: string[];
  orbState: VectorOrbState;
  onClose: () => void;
}

const SEVERITY_COLORS: Record<string, { border: string; badge: string; text: string }> = {
  critical: {
    border: "border-orange-500/40",
    badge: "bg-orange-950/50 border-orange-500/25 text-orange-400",
    text: "text-orange-400",
  },
  high: {
    border: "border-red-500/30",
    badge: "bg-red-950/50 border-red-500/20 text-red-400",
    text: "text-red-400",
  },
  medium: {
    border: "border-amber-500/25",
    badge: "bg-amber-950/40 border-amber-500/20 text-amber-400",
    text: "text-amber-400",
  },
  low: {
    border: "border-blue-500/20",
    badge: "bg-blue-950/40 border-blue-500/15 text-blue-400",
    text: "text-blue-400",
  },
};

const DEFAULT_COLORS = {
  border: "border-gray-500/20",
  badge: "bg-gray-800/40 border-gray-500/20 text-gray-400",
  text: "text-gray-400",
};

function RiskBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const color =
    pct >= 85
      ? "bg-red-500"
      : pct >= 65
      ? "bg-amber-500"
      : pct >= 40
      ? "bg-yellow-500"
      : "bg-blue-500";

  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-[10px] font-mono tabular-nums ${pct >= 85 ? "text-red-400" : pct >= 65 ? "text-amber-400" : "text-gray-400"}`}>
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

export const VectorContextHeader = memo(function VectorContextHeader({
  investigationId,
  alertId,
  title,
  severity,
  riskScore,
  contextChips,
  orbState,
  onClose,
}: VectorContextHeaderProps) {
  const caseId = investigationId || alertId;
  const sev = (severity || "medium").toLowerCase();
  const colors = SEVERITY_COLORS[sev] ?? DEFAULT_COLORS;
  const isReasoning = orbState === "reasoning";

  return (
    <div
      className={`shrink-0 border-b ${colors.border} bg-[#0A0C12]/80 backdrop-blur-sm`}
    >
      {/* Brand + case identity row */}
      <div className="px-6 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <VectorOrb state={orbState} size="md" />

          <div className="min-w-0 flex-1">
            {/* Brand row */}
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[13px] font-semibold text-gray-100 font-sans tracking-tight">
                Vector
              </span>
              <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">
                AI Investigation Partner
              </span>
            </div>
            {/* Case identity row */}
            <div className="flex items-center gap-2 min-w-0">
              {caseId && (
                <span className="text-[10px] font-mono text-gray-600 shrink-0">
                  {caseId}
                </span>
              )}
              {caseId && title && (
                <span className="text-gray-700 text-[9px] shrink-0">·</span>
              )}
              {title && (
                <span className="text-[11px] text-violet-400/80 font-sans truncate min-w-0">
                  {title}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Severity + risk + close */}
        <div className="flex items-center gap-3 shrink-0">
          {severity && (
            <span
              className={`text-[9px] font-mono px-2 py-0.5 rounded border uppercase tracking-wider ${colors.badge}`}
            >
              {sev}
            </span>
          )}
          {riskScore !== undefined && <RiskBar score={riskScore} />}

          {/* Minimize/close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Minimize Vector conversation"
            className="p-1.5 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-all duration-150 cursor-pointer"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="text-current"
            >
              <path
                d="M3 8h10M10 5l3 3-3 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Context chip strip */}
      {contextChips.length > 0 && (
        <div className="relative px-6 pb-2.5 overflow-hidden">
          {/* Scan line when reasoning */}
          {isReasoning && (
            <div
              className="absolute inset-0 pointer-events-none"
              aria-hidden="true"
            >
              <div
                className="absolute inset-y-0 w-12 bg-gradient-to-r from-transparent via-violet-500/8 to-transparent"
                style={{
                  animation: "vectorChipScan 2.4s ease-in-out infinite",
                }}
              />
            </div>
          )}

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5">
            <span className="text-[9px] font-mono text-gray-700 uppercase tracking-widest shrink-0">
              Context:
            </span>
            {contextChips.map((chip, idx) => (
              <span
                key={idx}
                className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono border transition-colors duration-300 ${
                  isReasoning
                    ? "bg-violet-950/40 border-violet-500/20 text-violet-400/80"
                    : "bg-white/3 border-white/8 text-gray-600"
                }`}
              >
                <span
                  className={`w-1 h-1 rounded-full shrink-0 ${
                    isReasoning ? "bg-violet-400" : "bg-gray-700"
                  }`}
                  style={
                    isReasoning
                      ? { animation: "vectorEdgePulse 1.8s ease-in-out infinite", animationDelay: `${idx * 0.15}s` }
                      : undefined
                  }
                />
                {chip}
              </span>
            ))}
          </div>

          {/* Fade mask on right edge for overflow */}
          <div className="absolute right-0 top-0 bottom-2.5 w-12 bg-gradient-to-l from-[#0A0C12] to-transparent pointer-events-none" />
        </div>
      )}
    </div>
  );
});
