import { useState } from "react";
import { Settings as SettingsIcon, Shield, Key, Bell, Sliders, CheckCircle2 } from "lucide-react";
import { Card, Button, PageHeader, PanelHeader } from "../components/ui/DesignSystem";

export default function Settings() {
  const [apiKey, setApiKey] = useState("dv_live_xxxxxxxxxxxxxxxxxxxxxxabcde12");
  const [showKey, setShowKey] = useState(false);
  const [grpcPort, setGrpcPort] = useState("443");
  const [slackWebhook, setSlackWebhook] = useState("");

  const handleSave = () => {
    alert("System configurations updated successfully on all active container sensors.");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform settings"
        subtitle="Manage API keys, define gRPC telemetries, and tune Slack/PagerDuty notification streams."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Card className="lg:col-span-8 space-y-6">
          <PanelHeader icon={Sliders} title="Sensor telemetry configurations" iconClassName="text-blue-400" />

          <div className="space-y-4 text-xs">
            {/* gRPC Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-gray-300">gRPC ingress port</label>
                <input
                  type="text"
                  value={grpcPort}
                  onChange={(e) => setGrpcPort(e.target.value)}
                  className="w-full bg-[#09090B] border border-[#23262F] rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-gray-300">Log buffer pool limit</label>
                <select className="w-full bg-[#09090B] border border-[#23262F] rounded-lg px-3 py-2 text-xs text-gray-400 focus:outline-none focus:border-blue-500">
                  <option value="50">50,000 Lines (Lab Default)</option>
                  <option value="500">500,000 Lines (Prod Recommended)</option>
                  <option value="1000">1,000,000 Lines (High Capacity)</option>
                </select>
              </div>
            </div>

            {/* Slack integration */}
            <div className="space-y-1.5">
              <label className="font-semibold text-gray-300">Slack webhook endpoint</label>
              <input
                type="text"
                value={slackWebhook}
                onChange={(e) => setSlackWebhook(e.target.value)}
                className="w-full bg-[#09090B] border border-[#23262F] rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500 font-mono"
              />
              <p className="text-[10px] text-gray-500">
                Pushes critical and high anomaly triggers directly to the security incident channel.
              </p>
            </div>

            {/* Checkbox settings */}
            <div className="space-y-2 pt-2">
              <span className="font-semibold text-gray-300">Security defaults</span>
              <div className="space-y-2 mt-1.5">
                <label className="flex items-start gap-2.5 text-gray-400 font-sans">
                  <input type="checkbox" defaultChecked className="mt-0.5 accent-purple-500" />
                  <div>
                    <span className="text-xs text-gray-200 font-medium">
                      Automatic container quarantine
                    </span>
                    <p className="text-[10px] text-gray-500">
                      Isolate pods instantly if model scores exceed 0.900.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 text-gray-400 font-sans">
                  <input type="checkbox" defaultChecked className="mt-0.5 accent-purple-500" />
                  <div>
                    <span className="text-xs text-gray-200 font-medium">
                      SHAP explainability log export
                    </span>
                    <p className="text-[10px] text-gray-500">
                      Inject attribution parameters into exported syslog streams.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="border-t border-[#23262F]/60 pt-4">
            <Button variant="primary" onClick={handleSave}>
              Save configurations
            </Button>
          </div>
        </Card>

        {/* API Keys Settings */}
        <div className="lg:col-span-4 space-y-5">
          <Card className="space-y-4">
            <PanelHeader icon={Key} title="Platform access secrets" iconClassName="text-purple-400" />

            <div className="space-y-3.5 text-xs">
              <p className="text-gray-400 text-[11px]">
                API tokens authenticate gRPC sensors daemon endpoints back into the centralized
                analyzer engine.
              </p>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-300 text-[11px]">Active access key</span>
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="text-[10px] text-blue-400 hover:underline"
                  >
                    {showKey ? "Hide secret" : "Reveal secret"}
                  </button>
                </div>
                <input
                  type={showKey ? "text" : "password"}
                  readOnly
                  value={apiKey}
                  className="w-full bg-[#09090B] border border-[#23262F] rounded-lg px-2.5 py-1.5 text-xs text-gray-400 font-mono focus:outline-none"
                />
              </div>
            </div>
          </Card>

          <Card className="space-y-4">
            <PanelHeader icon={Shield} title="Daemon firmware version" iconClassName="text-purple-400" />

            <div className="space-y-2 text-xs font-mono text-gray-400">
              <div className="flex justify-between">
                <span>Core version:</span>
                <span className="text-gray-200">v1.4.2-stable</span>
              </div>
              <div className="flex justify-between">
                <span>Firmware hash:</span>
                <span className="text-gray-500 truncate max-w-[120px]" title="sha256:d8a1491baee">
                  sha256:d8a1491...
                </span>
              </div>
              <div className="flex justify-between text-green-400">
                <span>Active agents:</span>
                <span>148 sensors online</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
