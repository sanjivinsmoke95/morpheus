import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { AnalysisHeader } from "@/components/AnalysisHeader";
import { Card, EmptyState, FilterChip, GovIcon, SectionAccordion, Skeleton, StatusChip, type Tone } from "@/components/ui";
import {
  useAmendmentImpactFeed, useCoverageByCategory, useCoverageMatrix, useIssues, useReadiness, type Issue,
} from "@/lib/morpheus";

const TYPE_META: Record<string, { label: string; icon: string; ring: string; pill: string; stripe: string }> = {
  CONFLICT: { label: "Specification Conflict", icon: "conflict", ring: "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20", pill: "bg-rose-50 text-rose-700", stripe: "border-l-rose-500" },
  GAP: { label: "Potential Gap", icon: "gap", ring: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20", pill: "bg-amber-50 text-amber-700", stripe: "border-l-amber-500" },
  OUTDATED: { label: "Outdated Reference", icon: "clock", ring: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20", pill: "bg-amber-50 text-amber-700", stripe: "border-l-amber-400" },
};
type TFilter = "all" | "CONFLICT" | "GAP" | "OUTDATED";

export function IssuesGapsPage() {
  const { id = "" } = useParams();
  const { data: issues, isLoading } = useIssues(id);
  const { data: r } = useReadiness(id);
  const { data: categories } = useCoverageByCategory(id);
  const [filter, setFilter] = useState<TFilter>("all");

  const counts = useMemo(() => {
    const c = { all: issues?.length ?? 0, CONFLICT: 0, GAP: 0, OUTDATED: 0 };
    for (const i of issues ?? []) c[i.type as "CONFLICT" | "GAP" | "OUTDATED"]++;
    return c;
  }, [issues]);

  const shown = filter === "all" ? issues ?? [] : (issues ?? []).filter((i) => i.type === filter);
  const actions = useMemo(() => [...new Set((issues ?? []).map((i) => i.recommended_action))].slice(0, 5), [issues]);

  const total = r?.requirements_total ?? 0;
  const pct = total ? Math.round(((r?.requirements_covered ?? 0) / total) * 100) : 0;

  return (
    <div>
      <AnalysisHeader id={id} section="Issues & Gaps" />

      {isLoading ? <Skeleton className="h-64" /> : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            {/* 4 KPI cards */}
            <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <IssueKpi n={r?.conflicts ?? 0} label="Specification Conflicts" tone="danger" icon="conflict" />
              <IssueKpi n={r?.gaps ?? 0} label="Potential Gaps" tone="warning" icon="gap" />
              <IssueKpi n={r?.outdated_references ?? 0} label="Outdated Reference" tone="warning" icon="clock" />
              <IssueKpi n={r?.unresolved_references ?? 0} label="Unresolved References" tone="info" icon="info" />
            </div>

            <div className="mb-4 space-y-3">
              <CoverageMatrix id={id} />
              <AmendmentImpact id={id} />
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
              <FilterChip active={filter === "all"} onClick={() => setFilter("all")} count={counts.all}>All Issues</FilterChip>
              <FilterChip active={filter === "CONFLICT"} onClick={() => setFilter("CONFLICT")} count={counts.CONFLICT}>Specification Conflicts</FilterChip>
              <FilterChip active={filter === "GAP"} onClick={() => setFilter("GAP")} count={counts.GAP}>Potential Gaps</FilterChip>
              <FilterChip active={filter === "OUTDATED"} onClick={() => setFilter("OUTDATED")} count={counts.OUTDATED}>Outdated References</FilterChip>
            </div>

            {!shown.length ? <EmptyState>No issues — the specification looks clean.</EmptyState> : (
              <div className="space-y-3">{shown.map((i) => <IssueCard key={i.id} issue={i} />)}</div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <Card className="p-5">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20">
                  <GovIcon name="check" className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-xs text-muted">Overall assessment</div>
                  <div className="font-display text-base font-bold text-ink">{pct >= 65 ? "Strong alignment" : pct >= 40 ? "Partial alignment" : "Needs attention"}</div>
                </div>
                <span className="ml-auto text-sm font-bold tabular-nums text-ink">{pct}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-panel"><div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} /></div>
              <p className="mt-2 text-xs text-muted">{counts.all} issue(s) need your attention before finalizing the tender.</p>
            </Card>

            <Card className="p-5">
              <h2 className="mb-3 font-display text-sm font-semibold text-ink">Category-wise Coverage</h2>
              <div className="space-y-2">
                {(categories ?? []).map((c) => {
                  const formatted = c.category.replace(/_/g, " ");
                  return (
                    <div key={c.category} className="group flex items-center gap-2.5">
                      <span className="w-36 flex-none truncate text-[11px] font-medium capitalize text-muted" title={formatted}>
                        {formatted}
                      </span>
                      <div className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-panel">
                        <div className="h-full bg-danger transition-all duration-300" style={{ width: `${c.total ? (c.missing / c.total) * 100 : 0}%` }} />
                        <div className="h-full bg-warning transition-all duration-300" style={{ width: `${c.total ? (c.partial / c.total) * 100 : 0}%` }} />
                      </div>
                      <span className="w-8 text-right text-[11px] font-semibold tabular-nums text-muted">{c.missing + c.partial}</span>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="mb-3 font-display text-sm font-semibold text-ink">Recommendations</h2>
              {actions.length === 0 ? <p className="text-xs text-muted">Nothing to action.</p> : (
                <ol className="space-y-2">
                  {actions.map((a, i) => (
                    <li key={i} className="flex gap-2 text-xs">
                      <span className="grid h-5 w-5 flex-none place-items-center rounded-full bg-success-soft text-[10px] font-bold text-success">{i + 1}</span>
                      <span className="text-ink">{a}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function IssueKpi({ n, label, tone, icon }: { n: number; label: string; tone: string; icon: string }) {
  const meta = {
    danger: {
      border: "hover:border-rose-500/50",
      topBorder: "border-t-2 border-t-rose-600",
      badge: "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20",
    },
    warning: {
      border: "hover:border-amber-500/50",
      topBorder: "border-t-2 border-t-amber-600",
      badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20",
    },
    info: {
      border: "hover:border-teal-500/50",
      topBorder: "border-t-2 border-t-teal-600",
      badge: "bg-teal-50 text-teal-700 ring-1 ring-teal-600/20",
    },
  }[tone] || {
    border: "hover:border-primary/50",
    topBorder: "border-t-2 border-t-primary",
    badge: "bg-primary-soft text-primary ring-1 ring-primary/20",
  };

  return (
    <div className={`group rounded-xl border border-line bg-gradient-to-b from-surface to-panel/30 p-3.5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${meta.topBorder} ${meta.border}`}>
      <div className="flex items-center gap-2.5">
        <span className={`grid h-8 w-8 place-items-center rounded-lg transition-transform duration-200 group-hover:scale-110 shadow-2xs ${meta.badge}`}>
          <GovIcon name={icon} className="h-4 w-4" />
        </span>
        <span className="text-2xl font-bold tabular-nums text-ink">{n}</span>
      </div>
      <div className="mt-1 text-[11px] font-medium text-muted">{label}</div>
    </div>
  );
}

function IssueCard({ issue }: { issue: Issue }) {
  const m = TYPE_META[issue.type] ?? TYPE_META.GAP;
  const sev = issue.severity === "CRITICAL" || issue.severity === "HIGH" ? "High" : issue.severity === "MEDIUM" ? "Medium" : "Low";
  return (
    <Card className={`border-l-4 p-4 ${m.stripe}`}>
      <div className="flex items-start gap-3">
        <span className={`grid h-8 w-8 flex-none place-items-center rounded-lg font-bold shadow-2xs ${m.ring}`}>
          <GovIcon name={m.icon} className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-ink">{m.label}</span>
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${m.pill}`}>{sev}</span>
            {issue.standard_is_number && <span className="ml-auto font-tech text-[11px] font-medium text-primary">{issue.standard_is_number}</span>}
          </div>
          <div className="mt-1 text-sm font-semibold text-ink">{issue.title}</div>
          <div className="mt-0.5 text-sm text-muted">{issue.description}</div>
          <div className="mt-2 rounded-lg bg-primary-soft/40 px-3 py-1.5 text-xs text-ink">
            <span className="font-semibold">Action:</span> {issue.recommended_action}
          </div>
        </div>
      </div>
    </Card>
  );
}

const COV_TONE: Record<string, Tone> = { FULL: "success", PARTIAL: "warning", MISSING: "danger" };

function CoverageMatrix({ id }: { id: string }) {
  const { data } = useCoverageMatrix(id);
  if (!data) return null;
  const s = data.summary;
  return (
    <SectionAccordion title={`Coverage Matrix — ${s.compliance_pct}% covered (${s.FULL} full · ${s.PARTIAL} partial · ${s.MISSING} missing)`}>
      <div className="max-h-96 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-panel text-[11px] uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2 text-left">Requirement</th>
              <th className="px-3 py-2 text-left">Standard</th>
              <th className="px-3 py-2 text-center">Evidence</th>
              <th className="px-3 py-2 text-left">Coverage</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, i) => (
              <tr key={i} className="border-b border-line last:border-b-0">
                <td className="px-3 py-2"><span className="font-tech font-medium text-ink">{row.requirement_code}</span> <span className="text-muted">— {row.requirement?.slice(0, 46)}</span></td>
                <td className="px-3 py-2 font-tech text-primary">{row.standard ?? "—"}</td>
                <td className="px-3 py-2 text-center tabular-nums text-muted">{row.evidence_count}</td>
                <td className="px-3 py-2"><StatusChip tone={COV_TONE[row.coverage] ?? "neutral"}>{row.coverage}</StatusChip></td>
                <td className="px-3 py-2 text-xs text-muted">{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionAccordion>
  );
}

function AmendmentImpact({ id }: { id: string }) {
  const { data } = useAmendmentImpactFeed(id);
  if (!data?.length) return null;
  return (
    <Card className="border-l-4 border-l-warning p-4">
      <div className="mb-2 flex items-center gap-2">
        <GovIcon name="warning" className="h-4 w-4 text-warning" />
        <h3 className="text-sm font-semibold text-ink">Standard Update Detected ({data.length})</h3>
      </div>
      <div className="space-y-2">
        {data.map((a, i) => (
          <div key={i} className="rounded-lg border border-line p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-tech text-sm font-semibold text-primary">{a.is_number}</span>
              <StatusChip tone={a.status === "OUTDATED" || a.status === "SUPERSEDED" ? "danger" : "warning"}>{a.status}</StatusChip>
              {a.amendments.length > 0 && <span className="text-xs text-muted">{a.amendments.length} amendment(s)</span>}
            </div>
            {a.amendments.map((am, j) => (
              <div key={j} className="mt-1 text-xs text-muted">{am.no}{am.date ? ` (${am.date})` : ""}: {am.summary}</div>
            ))}
            <div className="mt-1.5 text-xs text-ink">
              <span className="font-semibold">Potentially affected:</span> {a.affected_requirements.join(", ")}
            </div>
            <div className="mt-1 rounded bg-primary-soft/40 px-2 py-1 text-xs text-ink"><span className="font-semibold">Action:</span> {a.action}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
