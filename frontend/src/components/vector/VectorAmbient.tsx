/**
 * VectorAmbient
 *
 * Pure CSS ambient intelligence layer for the expanded Vector modal.
 * Zero JS animation loops. Zero React re-renders after mount.
 * All animations via GPU-accelerated CSS keyframes.
 *
 * Severity mapping affects the edge illumination color.
 */

import { memo } from "react";

interface VectorAmbientProps {
  severity?: string;
}

const SEVERITY_GLOW: Record<string, string> = {
  critical: "rgba(249,115,22,0.35)",  // orange
  high:     "rgba(239,68,68,0.25)",   // red
  medium:   "rgba(245,158,11,0.20)",  // amber
  low:      "rgba(59,130,246,0.18)",  // blue
};

export const VectorAmbient = memo(function VectorAmbient({ severity }: VectorAmbientProps) {
  const sev = (severity || "medium").toLowerCase();
  const glowColor = SEVERITY_GLOW[sev] ?? SEVERITY_GLOW.medium;

  return (
    <>
      {/* Drifting radial gradient blob — extremely subtle */}
      <div
        className="vector-ambient-layer absolute inset-0 pointer-events-none rounded-2xl overflow-hidden"
        aria-hidden="true"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 70% 30%, rgba(109,40,217,0.06) 0%, transparent 70%)`,
        }}
      />

      {/* Secondary drift blob (opposite phase) */}
      <div
        className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden"
        aria-hidden="true"
        style={{
          background: `radial-gradient(ellipse 50% 60% at 25% 70%, rgba(79,70,229,0.04) 0%, transparent 70%)`,
          animation: "vectorAmbientDrift 30s ease-in-out infinite reverse",
          willChange: "transform, opacity",
        }}
      />

      {/* Top edge illumination — severity-colored */}
      <div
        className="vector-edge-pulse absolute top-0 left-0 right-0 h-px pointer-events-none rounded-t-2xl"
        aria-hidden="true"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${glowColor} 30%, ${glowColor} 70%, transparent 100%)`,
        }}
      />

      {/* Subtle inner vignette to give depth */}
      <div
        className="absolute inset-0 pointer-events-none rounded-2xl"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 100% 100% at 50% 0%, transparent 60%, rgba(0,0,0,0.15) 100%)",
        }}
      />
    </>
  );
});
