import { Cpu, Database } from "lucide-react";
import { Card, PageHeader, PanelHeader } from "../components/ui/DesignSystem";

export default function Models() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Models"
        subtitle="View anomaly detection algorithms and AI knowledge base parameters."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Outlier Detection Info (Isolation Forest) */}
        <div className="lg:col-span-7">
          <Card className="space-y-6">
            <PanelHeader
              icon={Cpu}
              title="Outlier detection (Isolation forest)"
              iconClassName="text-blue-400"
            />

            <div className="space-y-4 text-xs font-sans text-gray-400">
              <p className="leading-relaxed">
                The anomaly detection engine runs an Isolation Forest ensemble on mapped network telemetry data. High-dimensional feature points are isolated recursively to compute absolute abnormality scores.
              </p>

              <div className="border-t border-border-custom/12 pt-4 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-sans">Model version:</span>
                  <span className="text-gray-200 font-mono text-mono-large">DV-Isolation-Forest-v2.1</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-sans">Training dataset:</span>
                  <span className="text-gray-200 font-mono text-mono-large">KDD Cup 99 + DarkVector Custom Baseline</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-sans">Expected outlier rate (contamination):</span>
                  <span className="text-gray-200 font-mono text-mono-large">2.0% (static configuration)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-sans">Last trained:</span>
                  <span className="text-emerald-400 font-mono text-mono-large">2026-06-25 (optimal drift baseline)</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* AI Knowledge Base status */}
        <div className="lg:col-span-5 space-y-5">
          <Card className="space-y-4">
            <PanelHeader
              icon={Database}
              title="AI knowledge base (Chroma)"
              iconClassName="text-purple-400"
            />

            <div className="space-y-3.5 text-body">
              <div className="flex items-center justify-between text-secondary-body">
                <span className="text-gray-400 font-sans">Embedding model:</span>
                <span className="text-gray-200 font-mono text-mono-large">text-embedding-004</span>
              </div>
              <div className="flex items-center justify-between text-secondary-body">
                <span className="text-gray-400 font-sans">Indexed security events:</span>
                <span className="text-gray-200 font-mono text-mono-large">1.48M logs</span>
              </div>
              <div className="flex items-center justify-between text-secondary-body">
                <span className="text-gray-400 font-sans">Average search speed:</span>
                <span className="text-emerald-400 font-mono text-mono-large">1.8ms</span>
              </div>

              {/* Progress bar mapping size */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-caption text-gray-400">
                  <span>Used space</span>
                  <span className="text-purple-400/90 font-mono font-medium">42% (2.1 GB)</span>
                </div>
                <div className="w-full bg-[#09090B] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full" style={{ width: "42%" }} />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
