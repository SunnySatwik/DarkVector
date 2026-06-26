import { useState, useEffect } from "react";
import { MOCK_WORLD_ATTACKS } from "../mockData";
import { Shield, ShieldAlert, Wifi, Globe, MapPin } from "lucide-react";

export default function WorldMap() {
  const [activeAttackIndex, setActiveAttackIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveAttackIndex((prev) => (prev + 1) % MOCK_WORLD_ATTACKS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const activeAttack = MOCK_WORLD_ATTACKS[activeAttackIndex];

  // Helper colors for attack severities
  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case "critical":
        return "#EF4444";
      case "high":
        return "#F59E0B";
      case "medium":
        return "#3B82F6";
      default:
        return "#10B981";
    }
  };

  return (
    <div
      id="world-map-widget"
      className="relative bg-[#111317] border border-[#23262F] rounded-xl p-5 overflow-hidden h-[340px] flex flex-col justify-between"
    >
      {/* Grid scanning effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.03),transparent_70%)] pointer-events-none" />

      {/* Widget Header */}
      <div className="flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-blue-400 animate-pulse" />
          <h3 className="text-xs font-mono font-semibold tracking-wider text-gray-200 uppercase">
            Active Threat Vectors
          </h3>
        </div>
        <div className="flex items-center gap-1.5 bg-[#161A22] border border-[#23262F] px-2 py-0.5 rounded text-[10px] text-gray-400 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
          <span>Realtime Stream Enabled</span>
        </div>
      </div>

      {/* SVG Map Canvas */}
      <div className="relative flex-1 w-full my-3 min-h-[180px]">
        <svg
          viewBox="0 0 1000 450"
          className="w-full h-full opacity-60 filter saturate-50"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Abstract World Dot Grid Map */}
          {/* North America */}
          <circle cx="150" cy="120" r="1.5" fill="#3E424B" />
          <circle cx="180" cy="110" r="1.5" fill="#3E424B" />
          <circle cx="200" cy="130" r="1.5" fill="#3E424B" />
          <circle cx="220" cy="150" r="1.5" fill="#3E424B" />
          <circle cx="160" cy="160" r="1.5" fill="#3E424B" />
          <circle cx="190" cy="180" r="1.5" fill="#3E424B" />
          <circle cx="210" cy="190" r="1.5" fill="#3E424B" />
          <circle cx="250" cy="170" r="1.5" fill="#3E424B" />
          <circle cx="230" cy="220" r="1.5" fill="#3E424B" />

          {/* South America */}
          <circle cx="290" cy="320" r="1.5" fill="#3E424B" />
          <circle cx="310" cy="350" r="1.5" fill="#3E424B" />
          <circle cx="330" cy="380" r="1.5" fill="#3E424B" />
          <circle cx="340" cy="410" r="1.5" fill="#3E424B" />
          <circle cx="350" cy="330" r="1.5" fill="#3E424B" />

          {/* Europe */}
          <circle cx="430" cy="110" r="1.5" fill="#3E424B" />
          <circle cx="450" cy="120" r="1.5" fill="#3E424B" />
          <circle cx="470" cy="130" r="1.5" fill="#3E424B" />
          <circle cx="480" cy="150" r="1.5" fill="#3E424B" />
          <circle cx="510" cy="140" r="1.5" fill="#3E424B" />
          <circle cx="520" cy="160" r="1.5" fill="#3E424B" />

          {/* Africa */}
          <circle cx="460" cy="240" r="1.5" fill="#3E424B" />
          <circle cx="480" cy="270" r="1.5" fill="#3E424B" />
          <circle cx="510" cy="290" r="1.5" fill="#3E424B" />
          <circle cx="530" cy="330" r="1.5" fill="#3E424B" />
          <circle cx="550" cy="250" r="1.5" fill="#3E424B" />

          {/* Asia */}
          <circle cx="620" cy="110" r="1.5" fill="#3E424B" />
          <circle cx="660" cy="140" r="1.5" fill="#3E424B" />
          <circle cx="690" cy="120" r="1.5" fill="#3E424B" />
          <circle cx="710" cy="150" r="1.5" fill="#3E424B" />
          <circle cx="730" cy="170" r="1.5" fill="#3E424B" />
          <circle cx="700" cy="210" r="1.5" fill="#3E424B" />
          <circle cx="740" cy="230" r="1.5" fill="#3E424B" />
          <circle cx="780" cy="240" r="1.5" fill="#3E424B" />
          <circle cx="810" cy="190" r="1.5" fill="#3E424B" />
          <circle cx="840" cy="220" r="1.5" fill="#3E424B" />

          {/* Australia */}
          <circle cx="820" cy="350" r="1.5" fill="#3E424B" />
          <circle cx="850" cy="370" r="1.5" fill="#3E424B" />
          <circle cx="880" cy="360" r="1.5" fill="#3E424B" />

          {/* Static Locations of Main Security Nodes */}
          <g transform="translate(220, 180)">
            <circle r="4" fill="#3B82F6" className="animate-ping" />
            <circle r="2.5" fill="#3B82F6" />
          </g>
          <g transform="translate(780, 300)">
            <circle r="4" fill="#3B82F6" className="animate-ping" />
            <circle r="2.5" fill="#3B82F6" />
          </g>

          {/* Drawing Interactive Threat Trajectory lines */}
          {MOCK_WORLD_ATTACKS.map((att, idx) => {
            const isActive = idx === activeAttackIndex;
            const color = getSeverityColor(att.severity);

            // Midpoint helper for arc calculation
            const dx = att.toCoords.x - att.fromCoords.x;
            const dy = att.toCoords.y - att.fromCoords.y;
            const dr = Math.sqrt(dx * dx + dy * dy) * 1.2; // Arc curve size

            return (
              <g key={idx}>
                {/* Attack Connection Path */}
                <path
                  d={`M ${att.fromCoords.x} ${att.fromCoords.y} A ${dr} ${dr} 0 0 1 ${att.toCoords.x} ${att.toCoords.y}`}
                  fill="none"
                  stroke={color}
                  strokeWidth={isActive ? 1.5 : 0.4}
                  strokeOpacity={isActive ? 0.9 : 0.15}
                  strokeDasharray={isActive ? "8, 3" : "none"}
                  className={isActive ? "animate-[scanline_3s_linear_infinite]" : ""}
                  style={{
                    transition: "stroke-width 0.3s, stroke-opacity 0.3s",
                  }}
                />

                {/* Source Node Anchor */}
                <circle
                  cx={att.fromCoords.x}
                  cy={att.fromCoords.y}
                  r={isActive ? 4 : 2}
                  fill={color}
                  className={isActive ? "animate-pulse" : ""}
                />

                {/* Pulsing signal on top of active path */}
                {isActive && (
                  <circle
                    cx={att.fromCoords.x}
                    cy={att.fromCoords.y}
                    r="8"
                    stroke={color}
                    strokeWidth="1"
                    fill="none"
                    className="animate-ping opacity-60"
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Floating details overlay */}
        <div className="absolute bottom-1 left-2 bg-[#161A22]/90 border border-[#23262F] rounded px-2.5 py-1.5 flex flex-col gap-0.5 text-[10px] font-mono z-10">
          <div className="flex items-center gap-1.5 text-gray-400">
            <MapPin className="w-3 h-3 text-red-400" />
            <span>
              ORIGIN: <strong className="text-gray-200">{activeAttack.fromName}</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-400 mt-1">
            <Shield className="w-3 h-3 text-blue-400" />
            <span>
              TARGET: <strong className="text-gray-200">{activeAttack.toName}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Widget Footer */}
      <div className="border-t border-[#23262F]/60 pt-3 flex items-center justify-between text-[11px] font-mono z-10 bg-[#111317]">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: getSeverityColor(activeAttack.severity) }}
          />
          <span className="text-gray-400 truncate max-w-[190px]">
            {activeAttack.type} Anomalous Signature
          </span>
        </div>
        <div className="text-right text-gray-500 font-mono text-[10px] flex items-center gap-1">
          <Wifi className="w-3 h-3 text-blue-400" />
          <span>VectScope Node Intercept</span>
        </div>
      </div>
    </div>
  );
}
