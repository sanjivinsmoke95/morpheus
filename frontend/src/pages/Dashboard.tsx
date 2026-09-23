import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Card, EmptyState, LinkButton, PageHeader, Skeleton, StatusChip } from "@/components/ui";
import { useAnalyses, useReadiness, type Analysis } from "@/lib/morpheus";
import { verdictFromReadiness } from "@/lib/verdict";

export function DashboardPage() {
  const { user } = useAuth();
  const { data: analyses, isLoading } = useAnalyses();
  const recent = (analyses ?? []).slice(0, 8);

  return (
    <div>
      <PageHeader
        title={`Welcome${user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}`}
        subtitle="Upload a tender specification to check it against the Indian Standards ecosystem."
      />

      {/* Hero CTA */}
      <Card className="mb-8 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-primary-soft p-6">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-ink">Check a tender for compliance</h2>
            <p className="mt-1 max-w-md text-sm text-muted">
              MORPHEUS reads the specification, matches every requirement to applicable standards,
              and tells you what to fix before you tender.
            </p>
          </div>
          <LinkButton to="/analyses/new">Upload a tender →</LinkButton>
        </div>
      </Card>

      {/* Recent */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Recent analyses</h2>
        <Link to="/history" className="text-sm font-medium text-primary hover:underline">
          View all →
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : recent.length === 0 ? (
        <EmptyState>No analyses yet. Upload your first tender to get started.</EmptyState>
      ) : (
        <Card>
          {recent.map((a) => (
            <AnalysisRow key={a.id} analysis={a} />
          ))}
        </Card>
      )}
    </div>
  );
}

function AnalysisRow({ analysis }: { analysis: Analysis }) {
  const ready = analysis.status === "READY";
  const to = ready ? `/analyses/${analysis.id}` : `/analyses/${analysis.id}/processing`;
  return (
    <Link
      to={to}
      className="flex items-center gap-3 border-b border-line px-4 py-3 transition-colors last:border-b-0 hover:bg-panel"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">{analysis.title}</span>
        <span className="block text-xs text-muted">
          {analysis.sector || "auto"} · {new Date(analysis.created_at).toLocaleDateString()}
        </span>
      </span>
      {ready ? <VerdictChip id={analysis.id} /> : <StatusChip tone="info">Processing…</StatusChip>}
      <span className="flex-none text-primary">→</span>
    </Link>
  );
}

function VerdictChip({ id }: { id: string }) {
  const { data, isLoading } = useReadiness(id);
  if (isLoading) return <StatusChip tone="neutral">…</StatusChip>;
  const v = verdictFromReadiness(data);
  const label = v.kind === "READY" ? "Ready" : v.kind === "ATTENTION" ? "Review" : "Action needed";
  return <StatusChip tone={v.tone}>{label}</StatusChip>;
}
