import { useState, useEffect } from "react";
import { Search, Sun, Moon } from "lucide-react";

interface TopNavProps {
  onOpenSearch: () => void;
}

export default function TopNav({
  onOpenSearch,
}: TopNavProps) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem("theme") !== "light";
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  };

  return (
    <header
      id="top-nav-bar"
      className="bg-surface/80 backdrop-blur-md border-b border-border-custom px-6 h-16 flex items-center justify-between z-20 sticky top-0"
    >
      {/* Search Bar Trigger */}
      <div className="flex-1 max-w-lg pr-4">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center gap-3 px-3 py-2 bg-bg border border-border-custom hover:border-blue-500/40 rounded-lg text-left transition-colors group"
        >
          <Search className="w-4 h-4 text-gray-500 group-hover:text-blue-400 transition-colors shrink-0" />

          <span className="flex-1 truncate text-xs text-gray-500 group-hover:text-gray-400">
            Search or ask Vector...
          </span>

          <kbd className="shrink-0 font-mono text-[10px] bg-elevated border border-border-custom px-1.5 py-0.5 rounded text-gray-400">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Toolbar Controls */}
      <div className="flex items-center gap-4 shrink-0">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 bg-elevated border border-border-custom hover:border-gray-500 rounded-lg text-gray-400 hover:text-gray-200 cursor-pointer transition-colors shrink-0 flex items-center justify-center"
          title="Toggle theme"
        >
          {isDarkMode ? (
            <Moon className="w-3.5 h-3.5 text-blue-400" />
          ) : (
            <Sun className="w-3.5 h-3.5 text-yellow-400" />
          )}
        </button>

        {/* Profile */}
        <div className="flex items-center gap-2.5 p-1 rounded-lg border border-border-custom bg-elevated/40 hover:bg-elevated/80 transition-colors duration-150 cursor-pointer shrink-0">
          <div className="w-7 h-7 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-[10px] font-mono text-blue-400 font-bold shrink-0">
            SS
          </div>
          <div className="hidden sm:flex flex-col min-w-0 pr-1.5">
            <span className="text-xs font-semibold text-gray-200 truncate leading-none">
              sunnysatwik95
            </span>
            <span className="text-[9px] font-mono text-gray-500 truncate mt-0.5">
              Staff analyst
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

