import {
  FileText,
  RefreshCw,
  AlertOctagon,
  Eye,
} from "lucide-react";
import {
  Card,
  Badge,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableCell,
  PageHeader,
} from "../components/ui/DesignSystem";
import { useInvestigations } from "../hooks/useInvestigations";

interface ReportsProps {
  onOpenReport?: (investigationId: string) => void;
}

export default function Reports({ onOpenReport }: ReportsProps) {
  const { data: investigations, isPending, isError } = useInvestigations();

  if (isPending) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Reports"
          subtitle="View and print incident summaries and investigation reports."
        />
        <div className="flex flex-col items-center justify-center h-64 text-gray-500 font-mono text-xs gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-purple-500" />
          <span>Loading reports…</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Reports"
          subtitle="View and print incident summaries and investigation reports."
        />
        <div className="flex flex-col items-center justify-center h-64 text-red-400 font-mono text-xs gap-3">
          <AlertOctagon className="w-6 h-6 text-red-500 animate-pulse" />
          <span>Failed to load reports. Check the backend connection.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="View and print incident summaries and investigation reports."
      />

      <div className="grid grid-cols-1 gap-5">
        <div className="col-span-1">
          <Card className="p-0">
            <div className="p-3.5 border-b border-border-custom/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-card-title font-sans font-medium text-gray-200">Recent investigation reports</span>
              </div>
              <Badge variant="default">{(investigations ?? []).length} reports</Badge>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Report Name</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <tbody>
                {(investigations ?? []).map((inv) => (
                  <TableRow key={inv.investigation_id}>
                    <TableCell className="font-mono text-mono-small text-gray-400">
                      {inv.investigation_id}
                    </TableCell>
                    <TableCell>
                      <div className="font-sans font-medium text-secondary-body text-gray-200">
                        Incident Report: {inv.title}
                      </div>
                      <div className="text-caption text-gray-500 font-mono mt-0.5">
                        Created: {new Date(inv.created_at).toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className="capitalize"
                        variant={
                          inv.severity.toLowerCase() === "critical"
                            ? "critical"
                            : inv.severity.toLowerCase() === "high"
                              ? "high"
                              : inv.severity.toLowerCase() === "medium"
                                ? "medium"
                                : "low"
                        }
                      >
                        {inv.severity.toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className="capitalize"
                        variant={inv.status.toLowerCase() === "resolved" ? "success" : "default"}
                      >
                        {inv.status.toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {onOpenReport && (
                          <button
                            onClick={() => onOpenReport(inv.investigation_id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-all cursor-pointer"
                            title="View Report"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View Report</span>
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(investigations ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-gray-500 font-mono text-xs">
                      No investigation reports found in the environment.
                    </TableCell>
                  </TableRow>
                )}
              </tbody>
            </Table>
          </Card>
        </div>
      </div>
    </div>
  );
}
