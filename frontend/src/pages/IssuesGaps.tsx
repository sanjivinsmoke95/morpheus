import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { AnalysisTabs } from "@/components/AnalysisTabs";
import { Card, EmptyState, FilterChip, PageHeader, SeverityPill, Skeleton, StatTile } from "@/components/ui";
import { useIssues, type Issue } from "@/lib/morpheus";

const SEV: Record<string, "critical" | "high" | "medium" | "low"> = {
  CRITICAL: "critical", HIGH: "high", MEDIUM: "medium", LOW: "low",
};
const TYPE_LABEL: Record<string, string> = { CONFLICT: "Conflict", GAP: "Gap", OUTDATED: "Outdated" };
type TFilter = "all" | "CONFLICT" | "GAP" | "OUTDATED";

export function IssuesGapsPage() {
  const { id = "" } = useParams();
  const { data: issues, isLoading } = useIssues(id);
  const [filter, setFilter] = useState<TFilter>("all");

  const counts = useMemo(() => {
    const c = { all: issues?.length ?? 0, CONFLICT: 0, GAP: 0, OUTDATED: 0, critical: 0, high: 0 };
    for (const i of issues ?? []) {
      c[i.type as "CONFLICT" | "GAP" | "OUTDATED"]++;
      if (i.severity === "CRITICAL") c.critical++;
      if (i.severity === "HIGH") c.high++;
    }
    return c;
  }, [issues]);

  const shown = filter === "all" ? issues ?? [] : (issues ?? []).filter((i) => i.type === filter);
  const actions = useMemo(() => [...new Set((issues ?? []).map((i) => i.recommended_action))], [issues]);

  return (
    <div>
      <PageHeader title="Issues & Gaps" subtitle="Conflicts, potential gaps and outdated references — resolve these before tendering." />
      <AnalysisTabs id={id} />

      {isLoading ? (
        <Skeleton className="h-40" />
      ) : (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-4">
            <StatTile value={counts.all} label="Total issues" tone={counts.all > 0 ? "warning" : "success"} />
            <StatTile value={counts.critical} label="Critical" tone={counts.critical > 0 ? "danger" : "success"} />
            <StatTile value={counts.CONFLICT} label="Conflicts" tone={counts.CONFLICT > 0 ? "danger" : "success"} />
            <StatTile value={counts.GAP} label="Gaps" tone={counts.GAP > 0 ? "warning" : "success"} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="mb-3 flex flex-wrap gap-2">
                <FilterChip active={filter === "all"} onClick={() => setFilter("all")} count={counts.all}>All</FilterChip>
                <FilterChip active={filter === "CONFLICT"} onClick={() => setFilter("CONFLICT")} count={counts.CONFLICT}>Conflicts</FilterChip>
                <FilterChip active={filter === "GAP"} onClick={() => setFilter("GAP")} count={counts.GAP}>Gaps</FilterChip>
                <FilterChip active={filter === "OUTDATED"} onClick={() => setFilter("OUTDATED")} count={counts.OUTDATED}>Outdated</FilterChip>
              </div>
              {!shown.length ? (
                <EmptyState>No issues — the specification looks clean.</EmptyState>
              ) : (
                <div className="space-y-3">{shown.map((i) => <IssueCard key={i.id} issue={i} />)}</div>
              )}
            </div>

            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Recommended actions</h2>
              {actions.length === 0 ? (
                <EmptyState>Nothing to action.</EmptyState>
              ) : (
                <Card className="divide-y divide-line">
                  {actions.map((a, i) => (
                    <div key={i} className="flex gap-2 px-4 py-3 text-sm">
                      <span className="text-primary">✓</span>
                      <span className="text-ink">{a}</span>
                    </div>
                  ))}
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function IssueCard({ issue }: { issue: Issue }) {
  const stripe = issue.severity === "CRITICAL" || issue.type === "CONFLICT" ? "border-l-danger"
    : issue.severity === "HIGH" ? "border-l-warning" : "border-l-primary";
  return (
    <Card className={`border-l-4 p-4 ${stripe}`}>
      <div className="flex flex-wrap items-center gap-2">
        <SeverityPill level={SEV[issue.severity] ?? "low"} />
        <span className="rounded-md bg-panel px-2 py-0.5 text-[11px] font-semibold text-muted">{TYPE_LABEL[issue.type]}</span>
        {issue.standard_is_number && <span className="text-xs font-medium text-primary">{issue.standard_is_number}</span>}
      </div>
      <div className="mt-2 text-sm font-medium text-ink">{issue.title}</div>
      <div className="mt-0.5 text-sm text-muted">{issue.description}</div>
      <div className="mt-2 rounded-lg bg-primary-soft/50 px-3 py-2 text-xs text-ink">
        <span className="font-semibold">Action:</span> {issue.recommended_action}
      </div>
    </Card>
  );
}
