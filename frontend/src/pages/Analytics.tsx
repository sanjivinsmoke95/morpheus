import { Card, PageHeader, Skeleton, StatTile, EmptyState } from "@/components/ui";
import { useAnalytics } from "@/lib/morpheus";

export function AnalyticsPage() {
  const { data, isLoading } = useAnalytics();

  return (
    <div>
      <PageHeader
        title="Department Analytics"
        subtitle="Compliance trends and standards intelligence across every tender in the workspace."
      />

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading || !data ? (
          <>
            <Skeleton className="h-24" /><Skeleton className="h-24" />
            <Skeleton className="h-24" /><Skeleton className="h-24" />
          </>
        ) : (
          <>
            <StatTile value={data.kpis.total_analyses} label="Tenders analysed" tone="info" />
            <StatTile value={`${data.kpis.compliance_rate}%`} label="Avg compliance"
              tone={data.kpis.compliance_rate >= 70 ? "success" : data.kpis.compliance_rate >= 40 ? "warning" : "danger"} />
            <StatTile value={data.kpis.avg_gaps} label="Avg gaps / tender"
              tone={data.kpis.avg_gaps > 0 ? "warning" : "success"} />
            <StatTile value={data.kpis.standards_catalogue} label="Standards in catalogue" tone="neutral" />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sector breakdown */}
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-ink">Compliance by sector</h2>
          {!data ? <Skeleton className="h-40" /> : data.sector_breakdown.length === 0 ? (
            <EmptyState>No completed tenders yet.</EmptyState>
          ) : (
            <div className="space-y-3">
              {data.sector_breakdown.map((s) => (
                <div key={s.sector}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="font-medium capitalize text-ink">{s.sector}</span>
                    <span className="text-xs text-muted">{s.count} tender{s.count > 1 ? "s" : ""} · {s.compliance_rate}%</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-panel">
                    <div className={`h-full rounded-full ${s.compliance_rate >= 70 ? "bg-success" : s.compliance_rate >= 40 ? "bg-warning" : "bg-danger"}`}
                      style={{ width: `${Math.max(3, s.compliance_rate)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Weekly trend */}
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-ink">Tenders analysed — last 8 weeks</h2>
          {!data ? <Skeleton className="h-40" /> : (
            <div className="flex h-40 items-end justify-between gap-2">
              {data.trend.map((t, i) => {
                const max = Math.max(1, ...data.trend.map((x) => x.analyses_count));
                const h = Math.round((t.analyses_count / max) * 100);
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex w-full flex-1 items-end">
                      <div className="w-full rounded-t bg-primary/80" style={{ height: `${Math.max(4, h)}%` }}
                        title={`${t.analyses_count} tenders · ${t.compliance_rate}% avg`} />
                    </div>
                    <span className="text-[10px] tabular-nums text-muted">{t.analyses_count}</span>
                    <span className="text-[9px] text-muted">{t.week}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Top gap categories */}
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-ink">Most common gap types</h2>
          {!data ? <Skeleton className="h-32" /> : data.gap_categories.length === 0 ? (
            <EmptyState>No gaps recorded.</EmptyState>
          ) : (
            <div className="space-y-2">
              {data.gap_categories.map((g) => (
                <div key={g.category} className="flex items-center justify-between rounded-lg bg-panel px-3 py-2 text-sm">
                  <span className="font-medium text-ink">{g.category.replace(/_/g, " ")}</span>
                  <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning">
                    {g.gap_count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Most-cited standards */}
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-ink">Most-cited standards</h2>
          {!data ? <Skeleton className="h-32" /> : data.top_standards.length === 0 ? (
            <EmptyState>No standards cited yet.</EmptyState>
          ) : (
            <div className="space-y-1.5">
              {data.top_standards.map((s) => (
                <div key={s.is_number} className="flex items-center gap-3 border-b border-line py-1.5 last:border-b-0">
                  <span className="w-24 flex-none font-tech text-xs font-semibold text-primary">{s.is_number}</span>
                  <span className="min-w-0 flex-1 truncate text-xs text-muted">{s.title}</span>
                  <span className="flex-none text-xs font-semibold tabular-nums text-ink">×{s.citation_count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
