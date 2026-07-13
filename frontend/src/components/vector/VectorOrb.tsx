/**
 * VectorOrb
 *
 * Animated Vector identity orb with meaningful state visualization.
 * States: idle | typing | reasoning | responding | error
 *
 * Performance: CSS animations only for idle/reasoning states.
 * No JS animation loops. Respects prefers-reduced-motion.
 */

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, AlertTriangle } from "lucide-react";

export type VectorOrbState = "idle" | "typing" | "reasoning" | "responding" | "error";

interface VectorOrbProps {
  state: VectorOrbState;
  size?: "sm" | "md";
}

/** Spectral waveform reasoning indicator — 5 bars with staggered CSS animations */
function ReasoningWaveform() {
  const bars = [
    { anim: "vectorWave0", h: "12px", delay: "0s" },
    { anim: "vectorWave1", h: "18px", delay: "0.12s" },
    { anim: "vectorWave2", h: "22px", delay: "0.06s" },
    { anim: "vectorWave3", h: "16px", delay: "0.18s" },
    { anim: "vectorWave4", h: "10px", delay: "0.09s" },
  ];

  return (
    <div
      className="flex items-center gap-[2.5px]"
      aria-label="Vector is reasoning"
      role="img"
    >
      {bars.map((bar, i) => (
        <div
          key={i}
          style={{
            width: "1.5px",
            height: bar.h,
            borderRadius: "2px",
            background: "linear-gradient(to top, rgba(139,92,246,0.5), rgba(167,139,250,1))",
            animation: `${bar.anim} 1.4s ease-in-out infinite`,
            animationDelay: bar.delay,
            transformOrigin: "center bottom",
          }}
        />
      ))}
    </div>
  );
}

export function VectorOrb({ state, size = "md" }: VectorOrbProps) {
  const isSmall = size === "sm";
  const dim = isSmall ? "w-7 h-7" : "w-9 h-9";
  const iconSize = isSmall ? "w-3.5 h-3.5" : "w-4 h-4";

  const isReasoning = state === "reasoning";
  const isError = state === "error";
  const isTyping = state === "typing";
  const isResponding = state === "responding";

  return (
    <div className={`relative ${dim} shrink-0`} aria-hidden="true">
      {/* Rotating gradient background ring — idle only */}
      {!isError && (
        <div
          className="absolute inset-0 rounded-xl overflow-hidden"
          style={{
            background: isReasoning
              ? "radial-gradient(circle at 50% 50%, rgba(139,92,246,0.25) 0%, rgba(109,40,217,0.08) 70%)"
              : isTyping
              ? "radial-gradient(circle at 50% 50%, rgba(139,92,246,0.18) 0%, transparent 70%)"
              : "radial-gradient(circle at 50% 50%, rgba(109,40,217,0.15) 0%, transparent 70%)",
          }}
        />
      )}

      {/* Spinning gradient halo — visible during idle */}
      {state === "idle" && (
        <div
          className="absolute inset-[-2px] rounded-xl opacity-30"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0%, rgba(139,92,246,0.4) 30%, transparent 60%)",
            animation: "vectorOrbSpin 6s linear infinite",
          }}
        />
      )}

      {/* Error flicker overlay */}
      {isError && (
        <div
          className="absolute inset-0 rounded-xl"
          style={{
            background: "radial-gradient(circle, rgba(239,68,68,0.2) 0%, transparent 70%)",
            animation: "vectorErrorFlicker 1.5s ease-in-out 3",
          }}
        />
      )}

      {/* Core orb shell */}
      <div
        className={`absolute inset-0 rounded-xl flex items-center justify-center border transition-all duration-300 ${
          isError
            ? "bg-red-950/40 border-red-500/25"
            : isReasoning
            ? "bg-violet-950/60 border-violet-500/35"
            : isTyping
            ? "bg-violet-950/30 border-violet-400/30"
            : "bg-violet-950/20 border-violet-500/15"
        }`}
        style={
          state === "idle"
            ? {
                animation: "vectorOrbBreath 3.5s ease-in-out infinite",
              }
            : undefined
        }
      >
        <AnimatePresence mode="wait">
          {isReasoning ? (
            <motion.div
              key="reasoning"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.18 }}
            >
              <ReasoningWaveform />
            </motion.div>
          ) : isError ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, rotate: -10 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <AlertTriangle className={`${iconSize} text-red-400`} />
            </motion.div>
          ) : (
            <motion.div
              key="sparkles"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.18 }}
            >
              <Sparkles
                className={`${iconSize} transition-colors duration-300 ${
                  isTyping || isResponding
                    ? "text-violet-300"
                    : "text-violet-400"
                }`}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Active state indicator dot */}
      {(isReasoning || isTyping || isResponding) && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#090b11]"
          style={{
            background: isReasoning
              ? "rgba(139,92,246,1)"
              : isResponding
              ? "rgba(52,211,153,1)"
              : "rgba(139,92,246,0.7)",
          }}
        />
      )}
    </div>
  );
}
