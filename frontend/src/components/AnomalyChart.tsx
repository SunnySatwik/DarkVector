import { useState } from "react";
import { motion } from "motion/react";
import { HISTORICAL_RISK_DATA } from "../mockData";
import { Sliders, Activity, Info } from "lucide-react";

export default function AnomalyChart() {
  const [activeCategory, setActiveCategory] = useState<
    "authentication" | "network" | "process" | "system"
  >("process");
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);

  // Helper variables for coordinates plotting
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 30;
  const paddingBottom = 40;
  const width = 600;
  const height = 220;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxVal = 100;

  // Generate coordinates for activeCategory
  const points = HISTORICAL_RISK_DATA.map((d, index) => {
    const x = paddingLeft + (index / (HISTORICAL_RISK_DATA.length - 1)) * chartWidth;
    const value = d[activeCategory];
    const y = paddingTop + (1 - value / maxVal) * chartHeight;
    return { x, y, data: d, value };
  });

  // SVG Line path string generator
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  // SVG Area path string generator
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;

  const getGradientId = () => `grad-${activeCategory}`;

  const getColorTheme = () => {
    switch (activeCategory) {
      case "authentication":
        return { stroke: "#EF4444", fill: "rgba(239, 68, 68, 0.1)" };
      case "network":
        return { stroke: "#3B82F6", fill: "rgba(59, 130, 246, 0.1)" };
      case "process":
        return { stroke: "#8B5CF6", fill: "rgba(139, 92, 246, 0.1)" };
      default:
        return { stroke: "#10B981", fill: "rgba(16, 185, 129, 0.1)" };
    }
  };

  const currentTheme = getColorTheme();

  return (
    <div
      id="anomaly-timeline-widget"
      className="bg-[#111317] border border-[#23262F] rounded-xl p-5 flex flex-col justify-between h-[340px]"
    >
      {/* Header controls */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-gray-400">
            <Activity className="w-4.5 h-4.5 text-purple-400" />
            <h3 className="text-xs font-mono font-semibold tracking-wider text-gray-200 uppercase">
              Anomaly Risk Timeline
            </h3>
          </div>
          <span className="text-[10px] text-gray-500 font-sans mt-0.5">
            Model variance over past 6-hour logs ingestion
          </span>
        </div>

        {/* Tab Switcher */}
        <div className="bg-[#09090B] border border-[#23262F]/80 rounded-lg p-0.5 flex gap-1">
          {(["process", "network", "authentication", "system"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                setHoveredPoint(null);
              }}
              className={`px-2 py-1 rounded text-[9px] font-mono font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                activeCategory === cat
                  ? "bg-[#161A22] text-gray-100 border border-[#23262F]"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {cat.slice(0, 4)}
            </button>
          ))}
        </div>
      </div>

      {/* Vector Line Canvas Graph */}
      <div className="relative flex-1 w-full my-4 min-h-[160px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          {/* Gradients definitions */}
          <defs>
            <linearGradient id={getGradientId()} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={currentTheme.stroke} stopOpacity={0.25} />
              <stop offset="100%" stopColor={currentTheme.stroke} stopOpacity={0.0} />
            </linearGradient>
          </defs>

          {/* Dotted horizontal baseline grid */}
          {[0, 25, 50, 75, 100].map((gridVal) => {
            const gridY = paddingTop + (1 - gridVal / maxVal) * chartHeight;
            return (
              <g key={gridVal}>
                <line
                  x1={paddingLeft}
                  y1={gridY}
                  x2={width - paddingRight}
                  y2={gridY}
                  stroke="#23262F"
                  strokeWidth="0.5"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingLeft - 10}
                  y={gridY + 3}
                  fill="#5A5F6E"
                  fontSize="8"
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  {gridVal}%
                </text>
              </g>
            );
          })}

          {/* Time axis stamps */}
          {HISTORICAL_RISK_DATA.map((d, index) => {
            const gridX = paddingLeft + (index / (HISTORICAL_RISK_DATA.length - 1)) * chartWidth;
            return (
              <g key={index}>
                <line
                  x1={gridX}
                  y1={height - paddingBottom}
                  x2={gridX}
                  y2={height - paddingBottom + 4}
                  stroke="#23262F"
                  strokeWidth="0.8"
                />
                <text
                  x={gridX}
                  y={height - paddingBottom + 15}
                  fill="#5A5F6E"
                  fontSize="8"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {d.time}
                </text>
              </g>
            );
          })}

          {/* Solid fill area gradient */}
          <path d={areaPath} fill={`url(#${getGradientId()})`} />

          {/* Precise main line trace */}
          <motion.path
            key={activeCategory}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            d={linePath}
            fill="none"
            stroke={currentTheme.stroke}
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          {/* Trigger interactive points */}
          {points.map((p, i) => {
            const isHovered = hoveredPoint && hoveredPoint.i === i;
            return (
              <g key={i}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 5 : 3}
                  fill="#111317"
                  stroke={currentTheme.stroke}
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  className="cursor-pointer transition-all duration-150"
                  onMouseEnter={() => setHoveredPoint({ ...p, i })}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              </g>
            );
          })}
        </svg>

        {/* Floating precise score tooltip overlay */}
        {hoveredPoint && (
          <div
            className="absolute bg-[#161A22] border border-[#23262F] rounded p-2 text-[10px] font-mono pointer-events-none z-10 shadow-xl"
            style={{
              left: `${(hoveredPoint.x / width) * 100}%`,
              top: `${(hoveredPoint.y / height) * 100 - 30}%`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="text-gray-400 uppercase tracking-wider">{activeCategory} risk</div>
            <div className="font-bold text-gray-200 mt-0.5" style={{ color: currentTheme.stroke }}>
              {hoveredPoint.value}% Anomaly
            </div>
            <div className="text-[8px] text-gray-500 mt-0.5">Time: {hoveredPoint.data.time}</div>
          </div>
        )}
      </div>

      {/* Graph Footer metadata summary */}
      <div className="border-t border-[#23262F]/60 pt-3 flex items-center justify-between text-[11px] font-mono bg-[#111317]">
        <div className="flex items-center gap-1.5 text-gray-500">
          <Info className="w-3.5 h-3.5" />
          <span>Metric calculated using isolation weights from 12 nodes</span>
        </div>
        <div className="text-gray-400 font-semibold uppercase tracking-wider">
          Peak Variance: <strong className="text-red-400">94%</strong>
        </div>
      </div>
    </div>
  );
}
