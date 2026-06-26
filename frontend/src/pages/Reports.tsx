import { useState } from "react";
import {
  FileText,
  Download,
  Sparkles,
  ShieldCheck,
  CheckSquare,
  RefreshCw,
  Layers,
} from "lucide-react";
import {
  Card,
  Button,
  Badge,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableCell,
} from "../components/ui/DesignSystem";

interface SecurityReport {
  id: string;
  title: string;
  type: "compliance" | "incident" | "weekly";
  date: string;
  status: "signed" | "draft";
  author: string;
}

export default function Reports() {
  const [reports, setReports] = useState<SecurityReport[]>([]);
  const [promptValue, setPromptValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Seed default reports
  useState(() => {
    setReports([
      {
        id: "REP-912",
        title: "Q2 Kubernetes SOC2 compliance readiness report",
        type: "compliance",
        date: "2026-06-20",
        status: "signed",
        author: "sunnysatwik95",
      },
      {
        id: "REP-842",
        title: "Incident writeup: srv-k8s-api-01 containerd shell escape",
        type: "incident",
        date: "2026-06-25",
        status: "draft",
        author: "Vector-AI",
      },
      {
        id: "REP-810",
        title: "Weekly threat vector exposure assessment - Week 25",
        type: "weekly",
        date: "2026-06-22",
        status: "signed",
        author: "m_chen",
      },
    ]);
  });

  const handleCreateReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptValue.trim()) return;

    setIsGenerating(true);

    setTimeout(() => {
      const newRep: SecurityReport = {
        id: `REP-${Math.floor(100 + Math.random() * 900)}`,
        title: promptValue.length > 50 ? `${promptValue.slice(0, 50)}...` : promptValue,
        type: promptValue.toLowerCase().includes("compliance") ? "compliance" : "incident",
        date: new Date().toISOString().split("T")[0],
        status: "draft",
        author: "Vector-AI",
      };
      setReports((prev) => [newRep, ...prev]);
      setPromptValue("");
      setIsGenerating(false);
    }, 1800);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-display font-bold text-gray-100 tracking-tight flex items-center gap-2">
          Compliance & Threat Reports
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Export cryptographic logs summaries, SOC2 checklists, and automated incident foreword
          assessments.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Generate Report Prompt */}
        <div className="lg:col-span-5">
          <Card className="flex flex-col justify-between min-h-[300px]">
            <form onSubmit={handleCreateReport} className="space-y-4">
              <div className="flex items-center gap-2 border-b border-[#23262F]/40 pb-3">
                <Sparkles className="w-4.5 h-4.5 text-purple-400" />
                <h3 className="text-xs font-mono font-bold tracking-wider text-gray-200 uppercase">
                  AI Automated Report Weaver
                </h3>
              </div>

              <div className="space-y-2 text-xs">
                <label className="font-semibold text-gray-300">Target Objective prompt</label>
                <textarea
                  value={promptValue}
                  onChange={(e) => setPromptValue(e.target.value)}
                  placeholder="e.g., Draft a HIPAA exposure audit focusing on unusual network egress logs from last 24h..."
                  className="w-full h-24 bg-[#09090B] border border-[#23262F]/80 rounded-lg p-2.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors font-mono resize-none"
                />
                <p className="text-[10px] text-gray-500 font-sans">
                  Our model maps active audit controls against the ChromaDB threat collections to
                  populate templates.
                </p>
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={isGenerating || !promptValue.trim()}
                className="w-full font-bold text-xs py-2.5 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>WEAVING AUDIT TEMPLATE...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5" />
                    <span>DRAFT FORENSIC REPORT</span>
                  </>
                )}
              </Button>
            </form>
          </Card>
        </div>

        {/* Existing Reports List */}
        <div className="lg:col-span-7">
          <Card className="p-0">
            <div className="p-4 border-b border-[#23262F]/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span className="font-mono text-xs font-bold text-gray-200 uppercase tracking-wider">
                  Generated Security Audits
                </span>
              </div>
              <Badge variant="default">{reports.length} files archived</Badge>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Report Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <tbody>
                {reports.map((rep) => (
                  <TableRow key={rep.id}>
                    <TableCell className="font-mono text-gray-400">{rep.id}</TableCell>
                    <TableCell>
                      <div className="font-sans font-medium text-gray-200">{rep.title}</div>
                      <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                        {rep.date} • Created by {rep.author}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          rep.type === "incident"
                            ? "critical"
                            : rep.type === "compliance"
                              ? "purple"
                              : "blue"
                        }
                      >
                        {rep.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={rep.status === "signed" ? "success" : "default"}>
                        {rep.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="xs" title="Download Audit PDF">
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>
      </div>
    </div>
  );
}
