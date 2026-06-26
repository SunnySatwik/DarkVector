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
import { Card, Button, Badge } from "../components/ui/DesignSystem";

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
      {/* Header */}
      <div>
        <h1 className="text-xl font-display font-bold text-gray-100 tracking-tight flex items-center gap-2">
          Model Tuning Center
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Configure anomaly classification thresholds, tune RAG embeddings database, and control
          prompt alignment parameters.
        </p>
      </div>

      {/* Inline stateful feedback instead of noisy window.alert */}
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
                <strong>Tuning completed!</strong> DV-Isolation Forest successfully converged across
                active Kubernetes datasets (Estimators: {numEstimators}, Contamination:{" "}
                {(contamination * 100).toFixed(1)}%).
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
        {/* Isolation Forest Parameters Configuration */}
        <div className="lg:col-span-7">
          <Card className="space-y-6">
            <div className="flex items-center gap-2 border-b border-[#23262F]/40 pb-3">
              <Cpu className="w-4.5 h-4.5 text-blue-400" />
              <h3 className="text-xs font-mono font-bold tracking-wider text-gray-200 uppercase">
                Anomaly Detection Algorithm [Isolation Forest]
              </h3>
            </div>

            <div className="space-y-5 text-xs">
              {/* Num Estimators */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-300">Number of Estimators (Trees)</span>
                  <span className="font-mono text-blue-400 font-bold">{numEstimators} Trees</span>
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
                  Controls the size of the random tree ensemble. Higher values increase score
                  accuracy but add latency.
                </p>
              </div>

              {/* Contamination Index */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-300">Contamination Ratio</span>
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
                  Specifies the proportion of outliers/anomalies expected in the baseline network
                  datasets.
                </p>
              </div>

              {/* Max Samples selector */}
              <div className="space-y-2">
                <span className="font-semibold text-gray-300">Bootstrap Sampling Method</span>
                <div className="grid grid-cols-2 gap-3 mt-1.5">
                  <button className="bg-blue-500/5 border border-blue-500/20 text-blue-400 p-2.5 rounded-lg text-left font-mono select-none">
                    <div className="font-bold text-[10px]">AUTO-MAX-SAMPLES</div>
                    <div className="text-[9px] text-gray-500 mt-0.5">Use optimal sample splits</div>
                  </button>
                  <button className="bg-black/20 border border-[#23262F]/60 text-gray-400 hover:text-gray-200 p-2.5 rounded-lg text-left font-mono select-none">
                    <div className="font-bold text-[10px]">FORCE-BOOTSTRAP</div>
                    <div className="text-[9px] text-gray-500 mt-0.5">
                      Iterate sub-datasets explicitly
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-[#23262F]/40 pt-4 flex gap-3">
              <Button
                onClick={triggerRetrain}
                variant="primary"
                disabled={trainingState === "training"}
                className="font-bold text-xs"
              >
                {trainingState === "training" ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>TRAINING FOREST...</span>
                  </>
                ) : (
                  <span>RETRAIN OUTLIER FOREST</span>
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setNumEstimators(128);
                  setContamination(0.02);
                }}
              >
                RESET PARAMETERS
              </Button>
            </div>
          </Card>
        </div>

        {/* ChromaDB Vector Storage Configuration */}
        <div className="lg:col-span-5 space-y-5">
          {/* Chroma DB Status */}
          <Card className="space-y-4">
            <div className="flex items-center gap-2 border-b border-[#23262F]/40 pb-3">
              <Database className="w-4.5 h-4.5 text-purple-400" />
              <h3 className="text-xs font-mono font-bold tracking-wider text-gray-200 uppercase">
                Vector Knowledge [ChromaDB]
              </h3>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-gray-400 font-sans">Embedding Model:</span>
                <span className="text-gray-200">text-embedding-004</span>
              </div>
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-gray-400 font-sans">Indexed Threat Vectors:</span>
                <span className="text-gray-200">1,489,102 vectors</span>
              </div>
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-gray-400 font-sans">Average Search Latency:</span>
                <span className="text-emerald-400">1.8 ms</span>
              </div>

              {/* Progress bar mapping size */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                  <span>ChromaDB Storage Pool</span>
                  <span className="text-purple-400 font-bold">42% (2.1 GB)</span>
                </div>
                <div className="w-full bg-[#09090B] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full" style={{ width: "42%" }} />
                </div>
              </div>
            </div>
          </Card>

          {/* Prompt Alignment Copilot customization */}
          <Card className="space-y-4">
            <div className="flex items-center gap-2 border-b border-[#23262F]/40 pb-3">
              <Sparkles className="w-4.5 h-4.5 text-purple-400" />
              <h3 className="text-xs font-mono font-bold tracking-wider text-gray-200 uppercase">
                AI Analyst Personality
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-gray-400 text-[11px]">
                Customize the communication and analysis philosophy of your DarkVector Copilot.
              </p>

              <div className="grid grid-cols-1 gap-2 mt-2 font-mono text-[11px]">
                <button
                  onClick={() => setAiPersona("objective-copilot")}
                  className={`p-2.5 rounded-lg text-left border flex items-center justify-between cursor-pointer select-none transition-all duration-150 ${
                    aiPersona === "objective-copilot"
                      ? "bg-purple-500/10 border-purple-500/30 text-purple-400"
                      : "bg-black/20 border-[#23262F]/60 text-gray-500 hover:text-gray-300"
                  }`}
                >
                  <div>
                    <div className="font-bold text-[10px]">OBJECTIVE CO-PILOT</div>
                    <div className="text-[9px] text-gray-500 mt-0.5 font-sans">
                      Objective, forensic-level descriptions
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
                      : "bg-black/20 border-[#23262F]/60 text-gray-500 hover:text-gray-300"
                  }`}
                >
                  <div>
                    <div className="font-bold text-[10px]">REMEDIATION ADVOCATE</div>
                    <div className="text-[9px] text-gray-500 mt-0.5 font-sans">
                      Prioritizes YAML scripts and containment
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
