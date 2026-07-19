/**
 * AmbientBackground
 *
 * 3-layer ambient background system:
 *   1. Radial corner glows (blue TL, purple BR) — slow breathing
 *   2. Drifting topology grid
 *   3. Vignette overlay (darkens edges)
 *
 * All layers are pointer-events-none and GPU-composited.
 * Respects prefers-reduced-motion.
 *
 * Reference: Raycast, Linear, Cursor — "less is more".
 */

export default function AmbientBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Layer 1 — Corner radial glow: top-left blue */}
      <div
        className="ambient-glow-tl absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full"
        style={{ opacity: 0.04 }}
      />

      {/* Layer 1b — Corner radial glow: bottom-right purple */}
      <div
        className="ambient-glow-br absolute -bottom-32 -right-32 w-[480px] h-[480px] rounded-full"
        style={{ opacity: 0.035 }}
      />

      {/* Layer 2 — Drifting topology grid */}
      <div className="absolute inset-0 cyber-grid-drifting opacity-[0.18]" />

      {/* Layer 3 — Vignette */}
      <div className="ambient-vignette absolute inset-0" />
    </div>
  );
}
