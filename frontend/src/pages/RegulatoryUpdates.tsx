import { Link } from "react-router-dom";
import { Card, EmptyState, PageHeader, Skeleton, StatusChip } from "@/components/ui";
import { useRegulatoryUpdates } from "@/lib/morpheus";

export function RegulatoryUpdatesPage() {
  const { data, isLoading } = useRegulatoryUpdates();

  return (
    <div>
      <PageHeader
        title="Regulatory Updates"
        subtitle="Amendments and QCO-mandatory certification changes, and the tenders they affect."
      />

      {isLoading ? (
        <div className="space-y-2"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
      ) : !data?.length ? (
        <EmptyState>No regulatory changes on file.</EmptyState>
      ) : (
        <div className="space-y-3">
          {data.map((u, i) => (
            <Card key={i} className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusChip tone={u.type === "QCO" ? "danger" : "warning"}>{u.type}</StatusChip>
                <span className="text-sm font-semibold text-ink">{u.headline}</span>
                <span className="ml-auto font-tech text-xs text-muted">{u.date ?? "date unknown"}</span>
              </div>
              <p className="mt-1.5 text-sm text-muted">{u.detail}</p>
              {u.affects_tenders.length > 0 && (
                <div className="mt-3 border-t border-line pt-2.5">
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-danger">
                    Affects {u.affects_tenders.length} tender{u.affects_tenders.length > 1 ? "s" : ""}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {u.affects_tenders.map((t) => (
                      <Link key={t.id} to={`/analyses/${t.id}`}
                        className="rounded-full bg-panel px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary-soft">
                        {t.title || "Untitled"} →
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {u.data_origin === "DEMO_SYNTHETIC" && (
                <div className="mt-2 text-[10px] uppercase tracking-wide text-muted">Demo data</div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
