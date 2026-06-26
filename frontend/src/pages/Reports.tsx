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
  PageHeader,
  PanelHeader,
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
        title: "Q2 security compliance report",
        type: "compliance",
        date: "2026-06-20",
        status: "signed",
        author: "sunnysatwik95",
      },
      {
        id: "REP-842",
        title: "Incident report: Unauthorized shell access on API server",
        type: "incident",
        date: "2026-06-25",
        status: "draft",
        author: "Vector-AI",
      },
      {
        id: "REP-810",
        title: "Weekly exposure check - Week 25",
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
      <PageHeader
        title="Reports"
        subtitle="View, search, or generate incident summaries and compliance reports."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Generate Report Prompt */}
        <div className="lg:col-span-5">
          <Card className="flex flex-col justify-between min-h-[300px]">
            <form onSubmit={handleCreateReport} className="space-y-4">
              <PanelHeader icon={Sparkles} title="Draft report with AI" iconClassName="text-purple-400" />

              <div className="space-y-2 text-xs">
                <label className="font-semibold text-gray-300 font-sans">Report description</label>
                <textarea
                  value={promptValue}
                  onChange={(e) => setPromptValue(e.target.value)}
                  placeholder="e.g., Incident report for suspicious database downloads on srv-db-01..."
                  className="w-full h-24 bg-[#09090B] border border-border-custom rounded-lg p-2.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors font-mono resize-none"
                />
                <p className="text-[10px] text-gray-500 font-sans">
                  Vector will compile evidence and format a draft report.
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
                    <span>Drafting report...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5" />
                    <span>Draft report</span>
                  </>
                )}
              </Button>
            </form>
          </Card>
        </div>

        {/* Existing Reports List */}
        <div className="lg:col-span-7">
          <Card className="p-0">
            <div className="p-4 border-b border-border-custom/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span className="font-sans text-xs font-bold text-gray-200">Recent reports</span>
              </div>
              <Badge variant="default">{reports.length} reports</Badge>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Report name</TableHead>
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
                        className="capitalize"
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
                      <Badge className="capitalize" variant={rep.status === "signed" ? "success" : "default"}>
                        {rep.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="xs" title="Download report PDF">
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
