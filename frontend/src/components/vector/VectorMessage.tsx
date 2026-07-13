/**
 * VectorMessage
 *
 * Premium message renderer for Vector AI conversation.
 * - User messages: right-aligned, violet-tinted pill
 * - Vector responses: left-aligned, full typography treatment
 * - Evidence citation block rendered separately from body prose
 * - Copy action with animated confirmation
 * - Entrance animation via CSS class
 */

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Copy, Check, FileText } from "lucide-react";

export interface ChatMessage {
  sender: "ai" | "user";
  text: string;
  time: string;
}

interface VectorMessageProps {
  msg: ChatMessage;
  index: number;
  isNew?: boolean;
}

/** Extract evidence citations from AI response text */
function extractEvidenceCitation(text: string): { body: string; citation: string | null } {
  // Look for a section starting with "Evidence Used" or "**Evidence Used**"
  const patterns = [
    /\*\*Evidence Used[^*]*\*\*[:\s]*([\s\S]+?)(?=\n\n|\n##|\n\*\*[A-Z]|$)/i,
    /Evidence Used[:\s]*([\s\S]+?)(?=\n\n|\n##|$)/i,
    /Sources Used[:\s]*([\s\S]+?)(?=\n\n|\n##|$)/i,
    /\*\*Sources[^*]*\*\*[:\s]*([\s\S]+?)(?=\n\n|\n##|\n\*\*[A-Z]|$)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const citation = match[1].trim();
      const body = text.replace(match[0], "").trim();
      return { body, citation };
    }
  }
  return { body: text, citation: null };
}

/** Parse citation text into individual evidence items */
function parseCitationItems(citation: string): string[] {
  return citation
    .split(/\n|,|;/)
    .map((item) =>
      item
        .replace(/^[-*•·]\s*/, "")
        .replace(/\*\*/g, "")
        .trim()
    )
    .filter((item) => item.length > 2);
}

export function VectorMessage({ msg, index, isNew = false }: VectorMessageProps) {
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(!isNew);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isNew) {
      const t = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(t);
    }
  }, [isNew]);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isAI = msg.sender === "ai";

  if (!isAI) {
    return (
      <div
        ref={ref}
        className={`flex flex-col items-end ${isNew ? "vector-msg-enter" : ""}`}
        style={{ animationDelay: "0ms" }}
      >
        <span className="text-[10px] text-gray-600 mb-1 pr-1 font-mono tracking-wider uppercase select-none">
          You · {msg.time}
        </span>
        <div className="flex items-start gap-2 max-w-[78%] group">
          <div className="rounded-2xl rounded-tr-sm px-4 py-2.5 text-[13px] leading-relaxed bg-violet-950/40 text-gray-200 border border-violet-500/20 select-text">
            {msg.text}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy message"
            className="opacity-0 group-hover:opacity-100 mt-1 p-1.5 rounded-lg text-gray-600 hover:text-gray-300 transition-opacity duration-150 cursor-pointer shrink-0"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    );
  }

  // AI message — extract evidence block
  const { body, citation } = extractEvidenceCitation(msg.text);
  const citationItems = citation ? parseCitationItems(citation) : [];

  return (
    <div
      ref={ref}
      className={`flex flex-col items-start ${isNew ? "vector-msg-enter" : ""}`}
      style={{ animationDelay: "0ms" }}
    >
      <span className="text-[10px] text-gray-600 mb-1.5 pl-1 font-mono tracking-wider uppercase select-none">
        Vector · {msg.time}
      </span>

      <div className="flex items-start gap-2.5 max-w-[92%] group relative">
        <div className="flex-1 min-w-0">
          {/* Main response body */}
          <div className="rounded-2xl rounded-tl-sm bg-[#111520]/70 border border-[#23262F]/50 px-5 py-4 shadow-sm">
            <div
              className="
                prose prose-invert prose-sm max-w-none select-text
                [&_p]:text-[13.5px] [&_p]:leading-7 [&_p]:text-gray-300 [&_p]:my-2.5
                [&_strong]:text-gray-100 [&_strong]:font-semibold
                [&_em]:text-gray-300 [&_em]:italic
                [&_h3]:text-[12px] [&_h3]:font-mono [&_h3]:uppercase [&_h3]:tracking-wider [&_h3]:text-gray-500 [&_h3]:mt-4 [&_h3]:mb-2
                [&_ul]:space-y-1.5 [&_ul]:my-2.5 [&_ul]:pl-0
                [&_ol]:space-y-1.5 [&_ol]:my-2.5 [&_ol]:pl-0
                [&_li]:text-[13px] [&_li]:leading-6 [&_li]:text-gray-300 [&_li]:list-none [&_li]:pl-3 [&_li]:before:content-['→'] [&_li]:before:text-violet-400/60 [&_li]:before:mr-2 [&_li]:before:font-mono [&_li]:before:text-[10px]
                [&_ol_li]:before:content-none [&_ol_li]:list-decimal [&_ol_li]:ml-5
                [&_code]:text-violet-300 [&_code]:bg-black/50 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-[12px] [&_code]:border [&_code]:border-violet-500/15
                [&_pre]:bg-black/60 [&_pre]:border [&_pre]:border-[#23262F]/60 [&_pre]:rounded-xl [&_pre]:px-4 [&_pre]:py-3 [&_pre]:overflow-x-auto [&_pre]:my-3
                [&_pre_code]:bg-transparent [&_pre_code]:border-0 [&_pre_code]:p-0 [&_pre_code]:text-[12px]
                [&_blockquote]:border-l-2 [&_blockquote]:border-violet-500/30 [&_blockquote]:pl-3 [&_blockquote]:text-gray-400 [&_blockquote]:italic
              "
            >
              <ReactMarkdown>{body}</ReactMarkdown>
            </div>

            {/* Evidence citation block */}
            {citationItems.length > 0 && (
              <div className="mt-4 pt-3.5 border-t border-[#23262F]/40">
                <div className="flex items-center gap-1.5 mb-2">
                  <FileText className="w-3 h-3 text-gray-600" />
                  <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">
                    Evidence Used
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {citationItems.map((item, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono text-gray-500 bg-black/30 border border-[#23262F]/50 max-w-[200px] truncate"
                      title={item}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Copy button */}
        <button
          type="button"
          onClick={handleCopy}
          aria-label={`Copy Vector response ${index + 1}`}
          className="opacity-0 group-hover:opacity-100 mt-2 p-1.5 rounded-lg text-gray-600 hover:text-gray-300 transition-opacity duration-150 cursor-pointer shrink-0"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
