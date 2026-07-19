import { useState, useEffect, useRef } from "react";
import { Search, Sun, Moon } from "lucide-react";

interface TopNavProps {
  onOpenSearch: () => void;
}

/** Live ticking clock — updates every second */
function SocClock() {
  const [time, setTime] = useState(() => new Date());
  const [uptimeSeconds, setUptimeSeconds] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const tick = () => {
      setTime(new Date());
      setUptimeSeconds(Math.floor((Date.now() - startRef.current) / 1000));
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Format time as HH:MM:SS in local timezone
  const hours = time.getHours().toString().padStart(2, "0");
  const minutes = time.getMinutes().toString().padStart(2, "0");
  const seconds = time.getSeconds().toString().padStart(2, "0");

  // Timezone abbreviation
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone.split("/").pop() ?? "UTC";

  // Uptime display
  const uptimeH = Math.floor(uptimeSeconds / 3600).toString().padStart(2, "0");
  const uptimeM = Math.floor((uptimeSeconds % 3600) / 60).toString().padStart(2, "0");
  const uptimeS = (uptimeSeconds % 60).toString().padStart(2, "0");

  return (
    <div className="hidden md:flex flex-col items-end shrink-0 select-none" title="SOC session clock">
      {/* Time row */}
      <div className="flex items-baseline gap-0.5 font-mono text-[13px] font-medium text-gray-300 tabular-nums leading-none">
        <span>{hours}</span>
        <span className="clock-colon text-gray-500">:</span>
        <span>{minutes}</span>
        <span className="clock-colon text-gray-500">:</span>
        <span>{seconds}</span>
        <span className="ml-1 text-[9px] text-gray-600 font-sans tracking-wide">{tz}</span>
      </div>
      {/* Uptime row */}
      <div className="flex items-center gap-1 mt-0.5">
        <span className="relative flex h-1 w-1 shrink-0">
          <span className="telemetry-pulse-outer absolute inline-flex h-full w-full rounded-full bg-emerald-500/50" />
          <span className="relative inline-flex rounded-full h-1 w-1 bg-emerald-500" />
        </span>
        <span className="text-[9px] font-mono text-gray-600 tracking-wide">
          {uptimeH}:{uptimeM}:{uptimeS}
        </span>
      </div>
    </div>
  );
}

export default function TopNav({ onOpenSearch }: TopNavProps) {
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
      className="bg-surface/70 backdrop-blur-md border-b border-white/[0.04] px-6 h-14 flex items-center justify-between z-20 sticky top-0"
    >
      {/* Search Bar Trigger */}
      <div className="flex-1 max-w-lg pr-4">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center gap-3 px-3 py-2 bg-black/20 border border-white/[0.05] hover:border-blue-500/30 rounded-lg text-left transition-colors group"
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
      <div className="flex items-center gap-5 shrink-0">
        {/* SOC Clock */}
        <SocClock />

        {/* Divider */}
        <div className="w-px h-5 bg-white/[0.06] hidden md:block" />

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 bg-elevated/60 border border-white/[0.05] hover:border-gray-500/30 rounded-lg text-gray-400 hover:text-gray-200 cursor-pointer transition-colors shrink-0 flex items-center justify-center"
          title="Toggle theme"
        >
          {isDarkMode ? (
            <Moon className="w-3.5 h-3.5 text-blue-400" />
          ) : (
            <Sun className="w-3.5 h-3.5 text-yellow-400" />
          )}
        </button>

        {/* Profile */}
        <div className="flex items-center gap-2.5 p-1 rounded-lg border border-white/[0.05] bg-elevated/30 hover:bg-elevated/60 transition-colors duration-150 cursor-pointer shrink-0">
          <div className="w-7 h-7 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[10px] font-mono text-blue-400 font-bold shrink-0">
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
