/**
 * VectorComposer
 *
 * Premium message composer with 6 visual states.
 * - Auto-growing textarea (up to 6 rows)
 * - Reactive border illumination per state
 * - Keyboard shortcut hint on focus
 * - Draft preservation: chatInput state lives in VectorPanel
 * - No accidental double submission
 */

import {
  useRef,
  useLayoutEffect,
  useState,
  useCallback,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, Loader } from "lucide-react";

interface VectorComposerProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  isResponding: boolean;
  isError?: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function VectorComposer({
  value,
  onChange,
  onSubmit,
  isResponding,
  isError = false,
  inputRef,
}: VectorComposerProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [rows, setRows] = useState(1);
  const innerRef = useRef<HTMLTextAreaElement>(null);

  // Sync external ref
  useLayoutEffect(() => {
    if (inputRef && "current" in inputRef) {
      (inputRef as React.MutableRefObject<HTMLTextAreaElement | null>).current =
        innerRef.current;
    }
  });

  // Auto-grow
  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    el.style.height = "auto";
    const lineHeight = 22; // px per row
    const newRows = Math.min(6, Math.max(1, Math.ceil(el.scrollHeight / lineHeight)));
    setRows(newRows);
  }, [value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!isResponding && value.trim()) {
          onSubmit();
        }
      }
    },
    [isResponding, value, onSubmit]
  );

  const canSend = !isResponding && value.trim().length > 0;

  // Border state
  const borderClass = isError
    ? "border-red-500/35 focus-within:border-red-500/50"
    : isResponding
    ? "border-violet-500/20"
    : isFocused
    ? "border-violet-500/50"
    : "border-[#23262F]/50 hover:border-[#2D3140]/70";

  // Glow state
  const glowStyle =
    isResponding
      ? { animation: "vectorComposerWait 2.4s ease-in-out infinite" }
      : isFocused
      ? { boxShadow: "0 0 0 3px rgba(139,92,246,0.07)" }
      : {};

  return (
    <div className="px-8 py-4 border-t border-[#23262F]/30 bg-[#0A0C12]/40 shrink-0">
      <div className="max-w-[800px] mx-auto space-y-2">
        {/* Composer shell */}
        <div
          className={`flex items-end gap-3 bg-[#0D1018]/70 rounded-2xl border transition-all duration-200 px-4 py-3 ${borderClass}`}
          style={glowStyle}
        >
          <textarea
            ref={innerRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={isResponding}
            placeholder={
              isResponding
                ? "Vector is analyzing the investigation evidence..."
                : isError
                ? "Request failed — try again..."
                : "Ask Vector to explain evidence, suggest next steps, or analyze the MITRE mapping..."
            }
            rows={rows}
            aria-label="Message Vector"
            className={`flex-1 bg-transparent resize-none outline-none text-[13.5px] font-sans leading-6 placeholder-gray-600 transition-colors duration-150 scrollbar-none ${
              isResponding
                ? "text-gray-600 cursor-not-allowed"
                : isError
                ? "text-red-300 placeholder-red-800"
                : "text-gray-200"
            }`}
            style={{ minHeight: "24px", maxHeight: "132px" }}
          />

          {/* Send button */}
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSend}
            aria-label="Send message to Vector"
            className={`shrink-0 p-2.5 rounded-xl transition-all duration-150 cursor-pointer ${
              canSend
                ? "bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-900/30 active:scale-95"
                : isResponding
                ? "bg-[#161A22]/60 text-gray-700 cursor-not-allowed"
                : "bg-[#161A22]/60 text-gray-600 cursor-not-allowed opacity-40"
            }`}
          >
            <AnimatePresence mode="wait" initial={false}>
              {isResponding ? (
                <motion.div
                  key="loader"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.15 }}
                >
                  <Loader className="w-4 h-4 animate-spin text-violet-500" />
                </motion.div>
              ) : (
                <motion.div
                  key="send"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.15 }}
                >
                  <Send className="w-4 h-4" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* Keyboard hint — shown when focused */}
        <AnimatePresence>
          {isFocused && !isResponding && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="text-[10px] text-gray-700 font-mono pl-1 select-none"
            >
              <kbd className="text-[9px] bg-white/5 border border-white/10 px-1 py-0.5 rounded text-gray-600">Enter</kbd>
              {" "}to send{" · "}
              <kbd className="text-[9px] bg-white/5 border border-white/10 px-1 py-0.5 rounded text-gray-600">⇧ Enter</kbd>
              {" "}for new line{" · "}
              <kbd className="text-[9px] bg-white/5 border border-white/10 px-1 py-0.5 rounded text-gray-600">Esc</kbd>
              {" "}to minimize
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
