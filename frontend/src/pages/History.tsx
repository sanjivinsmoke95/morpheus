import { Link } from "react-router-dom";
import { Card, EmptyState, LinkButton, PageHeader, Skeleton, StatusChip, type Tone } from "@/components/ui";
import { useAnalyses } from "@/lib/morpheus";

const STATUS_TONE: Record<string, Tone> = {
  READY: "success",
  FAILED: "danger",
};

export function HistoryPage() {
  const { data: analyses, isLoading } = useAnalyses();

  return (
    <div>
      <PageHeader
        title="Analysis history"
        subtitle="Every tender you have analysed."
        actions={<LinkButton to="/analyses/new">+ New analysis</LinkButton>}
      />

      {isLoading ? (
        <Skeleton className="h-32" />
      ) : !analyses?.length ? (
        <EmptyState>No analyses yet. Start one above.</EmptyState>
      ) : (
        <Card>
          {analyses.map((a) => (
            <Link
              key={a.id}
              to={a.status === "READY" ? `/analyses/${a.id}` : `/analyses/${a.id}/processing`}
              className="flex items-center gap-3 border-b border-line px-4 py-3 text-sm transition-colors last:border-b-0 hover:bg-panel"
            >
              <span className="min-w-0 flex-1 truncate font-medium text-ink">{a.title || a.id}</span>
              <span className="text-xs text-muted">{a.sector || "—"}</span>
              <StatusChip tone={STATUS_TONE[a.status] ?? "warning"}>{a.status}</StatusChip>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
