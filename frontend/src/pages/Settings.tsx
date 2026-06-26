import { useState } from "react";
import { Settings as SettingsIcon, Shield, Key, Bell, Sliders, CheckCircle2 } from "lucide-react";
import { Card, Button, PageHeader, PanelHeader } from "../components/ui/DesignSystem";
import { motion, AnimatePresence } from "motion/react";

export default function Settings() {
  const [apiKey, setApiKey] = useState("dv_live_xxxxxxxxxxxxxxxxxxxxxxabcde12");
  const [showKey, setShowKey] = useState(false);
  const [grpcPort, setGrpcPort] = useState("443");
  const [slackWebhook, setSlackWebhook] = useState("");
  const [showSaved, setShowSaved] = useState(false);

  const handleSave = () => {
    setShowSaved(true);
    setTimeout(() => {
      setShowSaved(false);
    }, 3000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Configure agent ports, API keys, notifications, and automatic containment actions."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Card className="lg:col-span-8 space-y-6">
          <PanelHeader icon={Sliders} title="Agent network configuration" iconClassName="text-blue-400" />

          <div className="space-y-4 text-xs">
            {/* gRPC Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-gray-300 font-sans">Port (gRPC)</label>
                <input
                  type="text"
                  value={grpcPort}
                  onChange={(e) => setGrpcPort(e.target.value)}
                  className="w-full bg-[#09090B] border border-border-custom rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
              <div className="space-y-1.5 font-sans">
                <label className="font-semibold text-gray-300">Log buffer size</label>
                <select className="w-full bg-[#09090B] border border-border-custom rounded-lg px-3 py-2 text-xs text-gray-400 focus:outline-none focus:border-blue-500">
                  <option value="50">50,000 lines (default)</option>
                  <option value="500">500,000 lines</option>
                  <option value="1000">1,000,000 lines</option>
                </select>
              </div>
            </div>

            {/* Slack integration */}
            <div className="space-y-1.5 font-sans">
              <label className="font-semibold text-gray-300">Slack webhook URL</label>
              <input
                type="text"
                value={slackWebhook}
                onChange={(e) => setSlackWebhook(e.target.value)}
                className="w-full bg-[#09090B] border border-border-custom rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500 font-mono"
              />
              <p className="text-[10px] text-gray-500">
                Pushes high-risk alerts directly to your Slack channel.
              </p>
            </div>

            {/* Checkbox settings */}
            <div className="space-y-2 pt-2">
              <span className="font-semibold text-gray-300 font-sans">Automated actions</span>
              <div className="space-y-2 mt-1.5">
                <label className="flex items-start gap-2.5 text-gray-400 font-sans">
                  <input type="checkbox" defaultChecked className="mt-0.5 accent-purple-500" />
                  <div>
                    <span className="text-xs text-gray-200 font-medium">
                      Automatic containment
                    </span>
                    <p className="text-[10px] text-gray-500">
                      Automatically isolate containers if their risk score is above 90.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 text-gray-400 font-sans">
                  <input type="checkbox" defaultChecked className="mt-0.5 accent-purple-500" />
                  <div>
                    <span className="text-xs text-gray-200 font-medium">
                      Export AI reasoning logs
                    </span>
                    <p className="text-[10px] text-gray-500">
                      Include AI reasoning details in exported syslog data.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="border-t border-border-custom/60 pt-4 flex items-center gap-3">
            <Button variant="primary" onClick={handleSave}>
              Save settings
            </Button>
            <AnimatePresence>
              {showSaved && (
                <motion.span
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-emerald-400 font-sans"
                >
                  Changes saved.
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </Card>

        {/* API Keys Settings */}
        <div className="lg:col-span-4 space-y-5">
          <Card className="space-y-4">
            <PanelHeader icon={Key} title="API keys" iconClassName="text-purple-400" />

            <div className="space-y-3.5 text-xs font-sans">
              <p className="text-gray-400 text-[11px]">
                API tokens authorize container agents to send logs to DarkVector.
              </p>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-300 text-[11px]">Active API key</span>
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="text-[10px] text-blue-400 hover:underline cursor-pointer"
                  >
                    {showKey ? "Hide secret" : "Reveal secret"}
                  </button>
                </div>
                <input
                  type={showKey ? "text" : "password"}
                  readOnly
                  value={apiKey}
                  className="w-full bg-[#09090B] border border-border-custom rounded-lg px-2.5 py-1.5 text-xs text-gray-400 font-mono focus:outline-none"
                />
              </div>
            </div>
          </Card>

          <Card className="space-y-4">
            <PanelHeader icon={Shield} title="Agent status" iconClassName="text-purple-400" />

            <div className="space-y-2 text-xs font-mono text-gray-400">
              <div className="flex justify-between">
                <span>Agent version:</span>
                <span className="text-gray-200">v1.4.2-stable</span>
              </div>
              <div className="flex justify-between">
                <span>Build hash:</span>
                <span className="text-gray-500 truncate max-w-[120px]" title="sha256:d8a1491baee">
                  sha256:d8a1491...
                </span>
              </div>
              <div className="flex justify-between text-green-400 font-sans text-xs">
                <span>Online agents:</span>
                <span>148</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
