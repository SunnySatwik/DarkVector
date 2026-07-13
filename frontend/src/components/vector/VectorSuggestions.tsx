/**
 * VectorSuggestions
 *
 * Contextual investigation action chip strip.
 * - Horizontal scroll with overflow fade mask
 * - Tool-like chip design (not chatbot bubble pill)
 * - Directional arrow affordance on hover
 * - Disabled state during reasoning
 */

import { memo } from "react";
import { ArrowRight } from "lucide-react";

interface VectorSuggestionsProps {
  prompts: string[];
  disabled: boolean;
  onSelect: (prompt: string) => void;
}

export const VectorSuggestions = memo(function VectorSuggestions({
  prompts,
  disabled,
  onSelect,
}: VectorSuggestionsProps) {
  if (prompts.length === 0) return null;

  return (
    <div className="px-8 py-3 border-t border-[#23262F]/20 bg-[#090B11]/60 shrink-0">
      <div className="relative max-w-[800px] mx-auto">
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
          {prompts.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => !disabled && onSelect(prompt)}
              disabled={disabled}
              aria-label={`Suggested investigation action: ${prompt}`}
              className={`
                vector-chip
                flex-shrink-0 flex items-center gap-2 
                px-3.5 py-2 rounded-lg
                text-[11px] font-sans
                border-l-2 border border-[#23262F]/40
                transition-all duration-150
                cursor-pointer
                group
                ${disabled
                  ? "opacity-30 cursor-not-allowed border-l-gray-700/40 text-gray-600 bg-transparent"
                  : "border-l-violet-500/35 border-[#23262F]/35 text-gray-400 hover:text-gray-200 bg-[#0E1118]/60 hover:bg-[#131720]/80 hover:border-[#2D3140]/60"
                }
              `}
            >
              <span className="leading-none">{prompt}</span>
              <ArrowRight
                className={`w-3 h-3 shrink-0 transition-all duration-150 ${
                  disabled
                    ? "text-gray-700"
                    : "text-gray-600 group-hover:text-violet-400/70 group-hover:translate-x-0.5"
                }`}
              />
            </button>
          ))}
        </div>

        {/* Fade mask on right edge */}
        <div className="absolute right-0 top-0 bottom-0.5 w-12 bg-gradient-to-l from-[#090B11]/80 to-transparent pointer-events-none" />
      </div>
    </div>
  );
});
