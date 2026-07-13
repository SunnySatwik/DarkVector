/**
 * VectorReasoningIndicator
 *
 * Replaces the three bouncing dots in the compact conversation panel.
 * Uses the spectral waveform style consistent with VectorOrb reasoning state.
 */

import { memo } from "react";

export const VectorReasoningIndicator = memo(function VectorReasoningIndicator() {
  const bars = [
    { anim: "vectorWave0", h: "10px", delay: "0s" },
    { anim: "vectorWave1", h: "15px", delay: "0.12s" },
    { anim: "vectorWave2", h: "18px", delay: "0.06s" },
    { anim: "vectorWave3", h: "13px", delay: "0.18s" },
    { anim: "vectorWave4", h: "8px",  delay: "0.09s" },
  ];

  return (
    <div
      className="flex flex-col items-start"
      role="status"
      aria-label="Vector is reasoning"
      aria-live="polite"
    >
      <span className="text-[10px] text-gray-600 mb-1 px-0.5 font-mono tracking-wider uppercase select-none">
        Vector
      </span>
      <div className="bg-[#111520]/70 border border-[#23262F]/40 rounded-2xl rounded-tl-sm px-3.5 py-2.5 flex items-center gap-[3px]">
        {bars.map((bar, i) => (
          <div
            key={i}
            style={{
              width: "1.5px",
              height: bar.h,
              borderRadius: "2px",
              background:
                "linear-gradient(to top, rgba(139,92,246,0.4), rgba(167,139,250,0.9))",
              animation: `${bar.anim} 1.4s ease-in-out infinite`,
              animationDelay: bar.delay,
              transformOrigin: "center bottom",
            }}
          />
        ))}
        <span className="ml-2 text-[10px] font-mono text-gray-700 select-none">
          reasoning...
        </span>
      </div>
    </div>
  );
});
