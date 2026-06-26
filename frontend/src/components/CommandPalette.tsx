import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  ShieldAlert,
  Cpu,
  Settings,
  FileText,
  Sliders,
  Activity,
  CornerDownLeft,
} from "lucide-react";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: string) => void;
}

interface CommandItem {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  action: () => void;
}

export default function CommandPalette({ isOpen, onClose, onNavigate }: CommandPaletteProps) {
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const commands: CommandItem[] = [
    {
      id: "nav-dashboard",
      category: "Navigation",
      title: "Go to overview",
      subtitle: "Analyze live anomaly traces, continue investigations, and ask Vector",
      icon: Activity,
      action: () => {
        onNavigate("dashboard");
        onClose();
      },
    },
    {
      id: "nav-investigations",
      category: "Navigation",
      title: "Go to investigate",
      subtitle: "Active case records, container quarantine logs, and incidents list",
      icon: CornerDownLeft,
      action: () => {
        onNavigate("investigations");
        onClose();
      },
    },
    {
      id: "nav-graph",
      category: "Navigation",
      title: "Go to graph",
      subtitle: "Trace threat lineage flows, process ancestry, and alert clusters",
      icon: Activity,
      action: () => {
        onNavigate("graph");
        onClose();
      },
    },
    {
      id: "nav-models",
      category: "Navigation",
      title: "Go to models",
      subtitle: "Configure isolation forest trees and contamination indexes",
      icon: Cpu,
      action: () => {
        onNavigate("models");
        onClose();
      },
    },
    {
      id: "nav-reports",
      category: "Navigation",
      title: "Go to reports",
      subtitle: "Export executive compliance reviews and automated explanations",
      icon: FileText,
      action: () => {
        onNavigate("reports");
        onClose();
      },
    },
    {
      id: "nav-settings",
      category: "Navigation",
      title: "Go to settings",
      subtitle: "Configure gRPC telemetry, sensor parameters, and security credentials",
      icon: Settings,
      action: () => {
        onNavigate("settings");
        onClose();
      },
    },
    {
      id: "act-scan",
      category: "Quick actions",
      title: "Trigger isolation forest scan",
      subtitle: "Force immediate check on all active log nodes",
      icon: Sliders,
      action: () => {
        alert("Triggering full anomalous trace scanning... Isolated tree nodes verified.");
        onClose();
      },
    },
    {
      id: "act-isolate",
      category: "Quick actions",
      title: "Isolate critical container node srv-k8s-api-01",
      subtitle: "Quarantine privileged containers immediately via gRPC",
      icon: ShieldAlert,
      action: () => {
        alert("Node quarantine command issued.");
        onClose();
      },
    },
  ];

  const filteredCommands = commands.filter(
    (cmd) =>
      cmd.title.toLowerCase().includes(search.toLowerCase()) ||
      cmd.category.toLowerCase().includes(search.toLowerCase()) ||
      cmd.subtitle.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (isOpen) onClose();
      }

      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  // Handle clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          id="cmd-palette-overlay"
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-24 px-4"
        >
          <motion.div
            id="cmd-palette-modal"
            ref={containerRef}
            initial={{ opacity: 0, scale: 0.985, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.985, y: -8 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-2xl bg-[#111317] border border-[#23262F] rounded-xl overflow-hidden shadow-2xl shadow-black/80"
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#23262F]">
              <Search className="w-5 h-5 text-gray-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Type a command or search platform views..."
                className="w-full bg-transparent text-gray-100 placeholder-gray-500 focus:outline-none text-sm font-sans"
              />
              <span className="text-[10px] text-gray-500 font-mono bg-[#161A22] border border-[#23262F] px-1.5 py-0.5 rounded">
                Esc
              </span>
            </div>

            {/* Content List */}
            <div className="max-h-[380px] overflow-y-auto p-2">
              {filteredCommands.length === 0 ? (
                <div className="py-12 text-center text-gray-500 text-xs font-mono">
                  No vectors matched "{search}"
                </div>
              ) : (
                <div>
                  {/* We group commands by category */}
                  {Array.from(new Set(filteredCommands.map((c) => c.category))).map((category) => (
                    <div key={category} className="mb-2">
                      <div className="text-[10px] font-mono font-semibold text-gray-500 tracking-wider px-3 py-1.5">
                        {category}
                      </div>
                      <div className="space-y-0.5">
                        {filteredCommands
                          .map((cmd, index) => ({
                            cmd,
                            originalIndex: filteredCommands.indexOf(cmd),
                          }))
                          .filter((item) => item.cmd.category === category)
                          .map(({ cmd, originalIndex }) => {
                            const isSelected = originalIndex === selectedIndex;
                            const Icon = cmd.icon;
                            return (
                              <button
                                key={cmd.id}
                                id={`cmd-${cmd.id}`}
                                onClick={cmd.action}
                                onMouseEnter={() => setSelectedIndex(originalIndex)}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors duration-100 ${
                                  isSelected
                                    ? "bg-[#161A22] text-gray-100"
                                    : "text-gray-400 hover:text-gray-200"
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div
                                    className={`p-1.5 rounded-md ${
                                      isSelected
                                        ? "bg-blue-500/10 text-blue-400"
                                        : "bg-gray-800/40 text-gray-500"
                                    }`}
                                  >
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs font-medium text-gray-200">
                                      {cmd.title}
                                    </div>
                                    <div className="text-[10px] text-gray-500 truncate mt-0.5">
                                      {cmd.subtitle}
                                    </div>
                                  </div>
                                </div>
                                {isSelected && (
                                  <div className="flex items-center gap-1 text-[10px] text-gray-500 font-mono bg-black/30 px-1.5 py-0.5 rounded border border-[#23262F]">
                                    <span>Select</span>
                                    <CornerDownLeft className="w-2.5 h-2.5" />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-t border-[#23262F] text-[10px] text-gray-500 font-mono">
              <div className="flex items-center gap-4">
                <span>↑↓ Navigate</span>
                <span>↵ Choose</span>
              </div>
              <div>
                <span>DarkVector search</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
