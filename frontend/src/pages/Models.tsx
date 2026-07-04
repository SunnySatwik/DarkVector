import { Cpu, ArrowDown, Zap } from "lucide-react";
import { Card, PageHeader, PanelHeader } from "../components/ui/DesignSystem";

export default function Models() {
  const pipelineSteps = [
    {
      label: "Incoming Alert Telemetry",
      detail: "Raw network event dispatched from the sensor layer",
      color: "text-blue-400",
      dot: "bg-blue-500",
    },
    {
      label: "KDD Feature Mapping",
      detail: "Alert fields mapped to 41 KDD Cup 99 network features",
      color: "text-blue-400",
      dot: "bg-blue-400",
    },
    {
      label: "Isolation Forest",
      detail: "DV-Isolation-Forest-v2.1 — scores the event for anomalousness",
      color: "text-purple-400",
      dot: "bg-purple-500",
    },
    {
      label: "Risk Scoring",
      detail: "Anomaly score normalized to a 0–100 risk scale",
      color: "text-purple-400",
      dot: "bg-purple-400",
    },
    {
      label: "MITRE ATT&CK Mapping",
      detail: "Deterministic lookup by alert type → technique ID + tactic",
      color: "text-orange-400",
      dot: "bg-orange-500",
    },
    {
      label: "Threat Intelligence Enrichment",
      detail: "Deterministic lookup by source IP → reputation + category",
      color: "text-orange-400",
      dot: "bg-orange-400",
    },
    {
      label: "Vector AI Assistant",
      detail: "Context-aware analyst summaries scoped to the open investigation",
      color: "text-emerald-400",
      dot: "bg-emerald-500",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Models"
        subtitle="View the anomaly detection pipeline and AI enrichment layers powering DarkVector."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Isolation Forest Info */}
        <div className="lg:col-span-6">
          <Card className="space-y-6">
            <PanelHeader
              icon={Cpu}
              title="Outlier detection (Isolation Forest)"
              iconClassName="text-blue-400"
            />

            <div className="space-y-4 text-xs font-sans text-gray-400">
              <p className="leading-relaxed">
                The anomaly detection engine runs an Isolation Forest ensemble on mapped network
                telemetry data. High-dimensional feature points are isolated recursively to
                compute absolute abnormality scores.
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

        {/* AI Pipeline Explainer */}
        <div className="lg:col-span-6">
          <Card className="space-y-4">
            <PanelHeader
              icon={Zap}
              title="AI analysis pipeline"
              iconClassName="text-purple-400"
            />

            <p className="text-xs text-gray-400 font-sans leading-relaxed">
              Every alert flows through the following stages before reaching the Vector AI assistant.
              All enrichment steps are deterministic — no external API calls, no LLM inference at
              the pipeline level.
            </p>

            <div className="space-y-0 pt-1">
              {pipelineSteps.map((step, idx) => (
                <div key={idx}>
                  <div className="flex items-start gap-3 py-2.5">
                    <div className="flex flex-col items-center shrink-0 mt-0.5">
                      <div className={`w-2 h-2 rounded-full ${step.dot}`} />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold font-sans ${step.color}`}>
                        {step.label}
                      </p>
                      <p className="text-[11px] text-gray-500 font-sans mt-0.5">
                        {step.detail}
                      </p>
                    </div>
                  </div>
                  {idx < pipelineSteps.length - 1 && (
                    <div className="flex items-center gap-3 py-0.5">
                      <div className="flex flex-col items-center shrink-0 w-2">
                        <ArrowDown className="w-3 h-3 text-gray-700" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
