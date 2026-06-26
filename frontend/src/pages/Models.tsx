import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Cpu,
  Sliders,
  Database,
  Sparkles,
  CheckCircle,
  HelpCircle,
  HardDrive,
  AlertCircle,
  RefreshCw,
  X,
} from "lucide-react";
import { Card, Button, Badge, PageHeader, PanelHeader } from "../components/ui/DesignSystem";

export default function Models() {
  const [numEstimators, setNumEstimators] = useState(128);
  const [contamination, setContamination] = useState(0.02);
  const [activeModelName, setActiveModelName] = useState("DV-Isolation-Forest-v2");
  const [aiPersona, setAiPersona] = useState("objective-copilot");
  const [trainingState, setTrainingState] = useState<"idle" | "training" | "success">("idle");

  const triggerRetrain = () => {
    setTrainingState("training");
    setTimeout(() => {
      setTrainingState("success");
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Models"
        subtitle="Manage outlier detection algorithms and tune Vector's AI knowledge base."
      />

      <AnimatePresence>
        {trainingState === "success" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5 text-xs text-emerald-400 font-mono">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>
                <strong>Model training complete.</strong> Outlier detection model successfully updated.
              </span>
            </div>
            <button
              onClick={() => setTrainingState("idle")}
              className="text-emerald-500/60 hover:text-emerald-400 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Outlier Detection Settings */}
        <div className="lg:col-span-7">
          <Card className="space-y-6">
            <PanelHeader
              icon={Cpu}
              title="Outlier detection (Isolation forest)"
              iconClassName="text-blue-400"
            />

            <div className="space-y-5 text-xs">
              {/* Num Estimators */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-300">Search depth (trees)</span>
                  <span className="font-mono text-blue-400 font-bold">{numEstimators} trees</span>
                </div>
                <input
                  type="range"
                  min="64"
                  max="512"
                  step="32"
                  value={numEstimators}
                  onChange={(e) => setNumEstimators(Number(e.target.value))}
                  className="w-full accent-blue-500 bg-gray-950 h-1 rounded-full appearance-none cursor-pointer"
                />
                <p className="text-[10px] text-gray-500 font-sans">
                  Controls the size of the random tree ensemble. More trees improve accuracy but increase search time.
                </p>
              </div>

              {/* Contamination Index */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-300">Expected outlier rate</span>
                  <span className="font-mono text-blue-400 font-bold">
                    {(contamination * 100).toFixed(1)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.005"
                  max="0.1"
                  step="0.005"
                  value={contamination}
                  onChange={(e) => setContamination(Number(e.target.value))}
                  className="w-full accent-blue-500 bg-gray-950 h-1 rounded-full appearance-none cursor-pointer"
                />
                <p className="text-[10px] text-gray-500 font-sans">
                  The estimated percentage of unusual events expected in your network data.
                </p>
              </div>

              {/* Sampling method */}
              <div className="space-y-2">
                <span className="font-semibold text-gray-300">Sampling method</span>
                <div className="grid grid-cols-2 gap-3 mt-1.5 font-sans">
                  <button className="bg-blue-500/5 border border-blue-500/20 text-blue-400 p-2.5 rounded-lg text-left select-none">
                    <div className="font-bold text-[10px]">Auto sample sizing</div>
                    <div className="text-[9px] text-gray-500 mt-0.5">Use optimal sample splits</div>
                  </button>
                  <button className="bg-black/20 border border-border-custom/60 text-gray-400 hover:text-gray-200 p-2.5 rounded-lg text-left select-none">
                    <div className="font-bold text-[10px]">Manual sampling</div>
                    <div className="text-[9px] text-gray-500 mt-0.5">
                      Explicitly define sub-dataset sizes
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-border-custom/40 pt-4 flex gap-3">
              <Button
                onClick={triggerRetrain}
                variant="primary"
                disabled={trainingState === "training"}
                className="font-bold text-xs"
              >
                {trainingState === "training" ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Training model...</span>
                  </>
                ) : (
                  <span>Retrain outlier detector</span>
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setNumEstimators(128);
                  setContamination(0.02);
                }}
              >
                Reset parameters
              </Button>
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

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-gray-400 font-sans">Embedding model:</span>
                <span className="text-gray-200">text-embedding-004</span>
              </div>
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-gray-400 font-sans">Indexed security events:</span>
                <span className="text-gray-200">1.48M logs</span>
              </div>
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-gray-400 font-sans">Average search speed:</span>
                <span className="text-emerald-400">1.8ms</span>
              </div>

              {/* Progress bar mapping size */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                  <span>Used space</span>
                  <span className="text-purple-400 font-bold">42% (2.1 GB)</span>
                </div>
                <div className="w-full bg-[#09090B] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full" style={{ width: "42%" }} />
                </div>
              </div>
            </div>
          </Card>

          {/* AI assistant style customization */}
          <Card className="space-y-4">
            <PanelHeader
              icon={Sparkles}
              title="AI assistant style"
              iconClassName="text-purple-400"
            />

            <div className="space-y-3 text-xs">
              <p className="text-gray-400 text-[11px] font-sans">
                Customize the communication and analysis style of Vector.
              </p>

              <div className="grid grid-cols-1 gap-2 mt-2 font-mono text-[11px]">
                <button
                  onClick={() => setAiPersona("objective-copilot")}
                  className={`p-2.5 rounded-lg text-left border flex items-center justify-between cursor-pointer select-none transition-all duration-150 ${
                    aiPersona === "objective-copilot"
                      ? "bg-purple-500/10 border-purple-500/30 text-purple-400"
                      : "bg-black/20 border-border-custom/60 text-gray-500 hover:text-gray-300"
                  }`}
                >
                  <div className="font-sans">
                    <div className="font-mono font-bold text-[10px]">Objective helper</div>
                    <div className="text-[9px] text-gray-500 mt-0.5 font-sans">
                      Provides factual, step-by-step descriptions
                    </div>
                  </div>
                  {aiPersona === "objective-copilot" && (
                    <CheckCircle className="w-4 h-4 text-purple-400 shrink-0" />
                  )}
                </button>

                <button
                  onClick={() => setAiPersona("remediation-expert")}
                  className={`p-2.5 rounded-lg text-left border flex items-center justify-between cursor-pointer select-none transition-all duration-150 ${
                    aiPersona === "remediation-expert"
                      ? "bg-purple-500/10 border-purple-500/30 text-purple-400"
                      : "bg-black/20 border-border-custom/60 text-gray-500 hover:text-gray-300"
                  }`}
                >
                  <div className="font-sans">
                    <div className="font-mono font-bold text-[10px]">Response advisor</div>
                    <div className="text-[9px] text-gray-500 mt-0.5 font-sans">
                      Prioritizes containment plans and commands
                    </div>
                  </div>
                  {aiPersona === "remediation-expert" && (
                    <CheckCircle className="w-4 h-4 text-purple-400 shrink-0" />
                  )}
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
