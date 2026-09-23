import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  Card, EmptyState, LinkButton, Skeleton, StatTile, StatusChip, Tooltip, type Tone,
} from "@/components/ui";
import { useDashboard, useRegulatoryUpdates } from "@/lib/morpheus";

const VERDICT_TONE: Record<string, Tone> = {
  READY: "success", REVIEW: "warning", ACTION_REQUIRED: "danger", PENDING: "neutral",
};
const VERDICT_LABEL: Record<string, string> = {
  READY: "Ready to tender", REVIEW: "Review needed", ACTION_REQUIRED: "Action required", PENDING: "Processing",
};

export function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useDashboard();
  const { data: updates } = useRegulatoryUpdates();
  const [query, setQuery] = useState("");

  const recent = useMemo(() => {
    const rows = data?.recent ?? [];
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) => r.title.toLowerCase().includes(q) || r.sector.toLowerCase().includes(q));
  }, [data, query]);

  const k = data?.kpis;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
            Welcome{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Your procurement compliance workspace — {k?.active_tenders ?? 0} tenders on file.
          </p>
        </div>
        <LinkButton to="/analyses/new">＋ New Analysis</LinkButton>
      </div>

      {/* KPI strip */}
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading || !k ? (
          <>
            <Skeleton className="h-24" /><Skeleton className="h-24" />
            <Skeleton className="h-24" /><Skeleton className="h-24" />
          </>
        ) : (
          <>
            <StatTile value={k.active_tenders} label="Active tenders" tone="info"
              hint="Total specifications uploaded and analysed in this workspace." />
            <StatTile value={`${k.compliance_rate}%`} label="Avg compliance"
              tone={k.compliance_rate >= 70 ? "success" : k.compliance_rate >= 40 ? "warning" : "danger"}
              hint="Average share of requirements fully covered by an applicable standard, across all tenders." />
            <StatTile value={k.needs_action} label="Need action" tone={k.needs_action > 0 ? "danger" : "success"}
              hint="Tenders with unresolved conflicts or requirements not covered by any standard." />
            <StatTile value={k.avg_gaps} label="Avg gaps / tender" tone={k.avg_gaps > 0 ? "warning" : "success"}
              hint="Average number of potential missing standards flagged per tender." />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent tenders */}
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Recent tenders</h2>
            <div className="flex items-center gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="w-36 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs text-ink outline-none focus:border-primary"
              />
              <Link to="/history" className="text-sm font-medium text-primary hover:underline">All →</Link>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
          ) : recent.length === 0 ? (
            <EmptyState>No tenders yet. Upload your first specification to get started.</EmptyState>
          ) : (
            <Card>
              {recent.map((a) => {
                const ready = a.status === "READY";
                const to = ready ? `/analyses/${a.id}` : `/analyses/${a.id}/processing`;
                return (
                  <Link key={a.id} to={to}
                    className="flex items-center gap-3 border-b border-line px-4 py-3 transition-colors last:border-b-0 hover:bg-panel">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{a.title}</span>
                      <span className="block text-xs text-muted">
                        {a.sector} · {a.created_at ? new Date(a.created_at).toLocaleDateString() : "—"}
                        {a.compliance_pct != null && ready ? ` · ${a.compliance_pct}% covered` : ""}
                      </span>
                    </span>
                    <StatusChip tone={VERDICT_TONE[a.verdict] ?? "neutral"}>
                      {VERDICT_LABEL[a.verdict] ?? a.verdict}
                    </StatusChip>
                    <span className="flex-none text-primary">→</span>
                  </Link>
                );
              })}
            </Card>
          )}
        </div>

        {/* Amendment alerts */}
        <div>
          <div className="mb-3 flex items-center gap-1.5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Regulatory alerts</h2>
            <Tooltip text="Standards that changed (amendments) or became QCO-mandatory, and which of your tenders cite them." />
          </div>
          {!updates ? (
            <Skeleton className="h-40" />
          ) : updates.length === 0 ? (
            <EmptyState>No regulatory changes on file.</EmptyState>
          ) : (
            <Card className="divide-y divide-line">
              {updates.slice(0, 5).map((u, i) => (
                <div key={i} className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <StatusChip tone={u.type === "QCO" ? "danger" : "warning"}>{u.type}</StatusChip>
                    <span className="text-xs text-muted">{u.date ?? ""}</span>
                  </div>
                  <div className="mt-1 text-sm font-medium text-ink">{u.headline}</div>
                  <div className="mt-0.5 text-xs text-muted">{u.detail}</div>
                  {u.affects_tenders.length > 0 && (
                    <div className="mt-1.5 text-[11px] text-danger">
                      Affects {u.affects_tenders.length} of your tender{u.affects_tenders.length > 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              ))}
              <Link to="/regulatory-updates" className="block px-4 py-2.5 text-center text-xs font-medium text-primary hover:bg-panel">
                View all updates →
              </Link>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
