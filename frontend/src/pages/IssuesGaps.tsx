import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { AnalysisHeader } from "@/components/AnalysisHeader";
import { Card, EmptyState, FilterChip, SectionAccordion, Skeleton, StatusChip, type Tone } from "@/components/ui";
import {
  useAmendmentImpactFeed, useCoverageByCategory, useCoverageMatrix, useIssues, useReadiness, type Issue,
} from "@/lib/morpheus";

const TYPE_META: Record<string, { label: string; icon: string; ring: string; pill: string; stripe: string }> = {
  CONFLICT: { label: "Specification Conflict", icon: "!", ring: "bg-danger-soft text-danger", pill: "bg-danger-soft text-danger", stripe: "border-l-danger" },
  GAP: { label: "Potential Gap", icon: "△", ring: "bg-warning-soft text-warning", pill: "bg-warning-soft text-warning", stripe: "border-l-warning" },
  OUTDATED: { label: "Outdated Reference", icon: "◷", ring: "bg-amber-100 text-amber-700", pill: "bg-amber-100 text-amber-700", stripe: "border-l-amber-400" },
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
              <IssueKpi n={r?.conflicts ?? 0} label="Specification Conflicts" cls="border-danger/30 bg-danger-soft/40" icon="⚠" ic="text-danger" />
              <IssueKpi n={r?.gaps ?? 0} label="Potential Gaps" cls="border-warning/30 bg-warning-soft/40" icon="△" ic="text-warning" />
              <IssueKpi n={r?.outdated_references ?? 0} label="Outdated Reference" cls="border-amber-300/40 bg-amber-50" icon="◷" ic="text-amber-600" />
              <IssueKpi n={r?.unresolved_references ?? 0} label="Unresolved References" cls="border-blue-200 bg-blue-50" icon="ⓘ" ic="text-blue-600" />
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
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-success-soft text-success">✓</span>
                <div>
                  <div className="text-xs text-muted">Overall Assessment</div>
                  <div className="font-display text-base font-bold text-ink">{pct >= 65 ? "Mostly Compliant" : pct >= 40 ? "Partially Compliant" : "Needs Attention"}</div>
                </div>
                <span className="ml-auto text-sm font-bold tabular-nums text-ink">{pct}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-panel"><div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} /></div>
              <p className="mt-2 text-xs text-muted">{counts.all} issue(s) need your attention before finalizing the tender.</p>
            </Card>

            <Card className="p-5">
              <h2 className="mb-3 font-display text-sm font-semibold text-ink">Category-wise Coverage</h2>
              <div className="space-y-2">
                {(categories ?? []).map((c) => (
                  <div key={c.category} className="flex items-center gap-2">
                    <span className="w-20 flex-none text-[11px] capitalize text-muted">{c.category.toLowerCase()}</span>
                    <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-panel">
                      <div className="h-full bg-danger" style={{ width: `${c.total ? (c.missing / c.total) * 100 : 0}%` }} />
                      <div className="h-full bg-warning" style={{ width: `${c.total ? (c.partial / c.total) * 100 : 0}%` }} />
                    </div>
                    <span className="w-6 text-right text-[11px] tabular-nums text-muted">{c.missing + c.partial}</span>
                  </div>
                ))}
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

function IssueKpi({ n, label, cls, icon, ic }: { n: number; label: string; cls: string; icon: string; ic: string }) {
  return (
    <div className={`rounded-xl border p-3 ${cls}`}>
      <div className="flex items-center gap-2">
        <span className={`text-lg ${ic}`}>{icon}</span>
        <span className="text-2xl font-bold tabular-nums text-ink">{n}</span>
      </div>
      <div className="mt-0.5 text-[11px] text-muted">{label}</div>
    </div>
  );
}

function IssueCard({ issue }: { issue: Issue }) {
  const m = TYPE_META[issue.type] ?? TYPE_META.GAP;
  const sev = issue.severity === "CRITICAL" || issue.severity === "HIGH" ? "High" : issue.severity === "MEDIUM" ? "Medium" : "Low";
  return (
    <Card className={`border-l-4 p-4 ${m.stripe}`}>
      <div className="flex items-start gap-3">
        <span className={`grid h-8 w-8 flex-none place-items-center rounded-lg font-bold ${m.ring}`}>{m.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-ink">{m.label}</span>
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${m.pill}`}>{sev}</span>
            {issue.standard_is_number && <span className="ml-auto text-[11px] font-medium text-primary">{issue.standard_is_number}</span>}
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
                <td className="px-3 py-2"><span className="font-medium text-ink">{row.requirement_code}</span> <span className="text-muted">— {row.requirement?.slice(0, 46)}</span></td>
                <td className="px-3 py-2 text-primary">{row.standard ?? "—"}</td>
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
        <span className="text-warning">⚠</span>
        <h3 className="text-sm font-semibold text-ink">Standard Update Detected ({data.length})</h3>
      </div>
      <div className="space-y-2">
        {data.map((a, i) => (
          <div key={i} className="rounded-lg border border-line p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-primary">{a.is_number}</span>
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
