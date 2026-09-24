import { Link, useParams } from "react-router-dom";
import { AnalysisHeader } from "@/components/AnalysisHeader";
import { MiiCard } from "@/components/MiiCard";
import { GfrCard } from "@/components/GfrCard";
import { Card, EmptyState, SectionAccordion, Skeleton, StatusChip } from "@/components/ui";
import { useAnalysis, useCoverageByCategory, useReadiness } from "@/lib/morpheus";

function assessment(pct: number) {
  if (pct >= 90) return { label: "Fully Compliant", tone: "success" };
  if (pct >= 65) return { label: "Mostly Compliant", tone: "success" };
  if (pct >= 40) return { label: "Partially Compliant", tone: "warning" };
  return { label: "Needs Attention", tone: "danger" };
}

export function OverviewPage() {
  const { id = "" } = useParams();
  const { data: analysis } = useAnalysis(id);
  const { data: r, isLoading } = useReadiness(id);
  const { data: categories } = useCoverageByCategory(id);
  const profile = analysis?.product_profile_json;
  const languages = analysis?.languages_json ?? [];
  const trace = analysis?.decision_trace_json ?? [];
  const allLangs = [...new Set(languages.flatMap((l) => l.languages))];
  const multilingual = allLangs.length > 1 || languages.some((l) => l.mixed);

  const total = r?.requirements_total ?? 0;
  const covered = r?.requirements_covered ?? 0;
  const withCoverage = covered + (r?.requirements_partial ?? 0);
  const pct = total ? Math.round((covered / total) * 100) : 0;
  const a = assessment(pct);

  const findings = [
    { icon: "⚠", tone: "danger", n: r?.conflicts ?? 0, t: "Specification conflicts", d: "Review conflicting requirements" },
    { icon: "△", tone: "warning", n: r?.gaps ?? 0, t: "Potential gaps", d: "Additional specifications may be needed" },
    { icon: "◷", tone: "warning", n: r?.outdated_references ?? 0, t: "Outdated reference", d: "A newer version of the standard exists" },
    { icon: "ⓘ", tone: "info", n: r?.unresolved_references ?? 0, t: "Unresolved references", d: "All references could be mapped" },
  ];

  return (
    <div>
      <AnalysisHeader id={id} section="Overview" />

      {isLoading || !r ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="space-y-6">
          {/* Row 1: assessment + KPIs + doc preview */}
          <div className="grid gap-4 lg:grid-cols-12">
            {/* Overall Assessment */}
            <Card className="p-5 lg:col-span-4">
              <div className="flex items-start gap-3">
                <span className={`grid h-11 w-11 flex-none place-items-center rounded-full text-white ${a.tone === "success" ? "bg-success" : a.tone === "warning" ? "bg-warning" : "bg-danger"}`}>✓</span>
                <div>
                  <div className="text-xs text-muted">Overall Assessment</div>
                  <div className="font-display text-xl font-bold text-ink">{a.label}</div>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted">
                {covered} of {total} requirements have identified standard coverage.
                {pct < 100 ? " A few items require review for complete compliance." : ""}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-panel">
                  <div className={`h-full rounded-full ${a.tone === "success" ? "bg-success" : a.tone === "warning" ? "bg-warning" : "bg-danger"}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-sm font-bold tabular-nums text-ink">{pct}%</span>
              </div>
            </Card>

            {/* 6 KPI tiles */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:col-span-5">
              <Kpi icon="📄" tone="neutral" value={total} label="Total Requirements" />
              <Kpi icon="📗" tone="success" value={withCoverage} label="With Coverage" />
              <Kpi icon="⚠" tone="warning" value={r.gaps} label="Potential Gaps" />
              <Kpi icon="📄" tone="neutral" value={r.standards_identified} label="Standards Identified" />
              <Kpi icon="⚠" tone="danger" value={r.conflicts} label="Conflicts" />
              <Kpi icon="◷" tone="warning" value={r.outdated_references} label="Outdated Reference" />
            </div>

            {/* Document Preview */}
            <Card className="p-4 lg:col-span-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">Document Preview</span>
                <Link to={`/analyses/${id}/evidence`} className="text-[11px] font-medium text-primary hover:underline">View Full →</Link>
              </div>
              <div className="rounded-lg border border-line bg-canvas p-4 text-center">
                <img src="/brand/government_emblem_dashboard.png" alt="" className="mx-auto h-8 w-auto opacity-80" />
                <div className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-muted">Tender Document</div>
                <div className="mx-auto mt-3 h-1 w-16 rounded bg-primary/30" />
                <div className="mx-auto mt-1.5 h-1 w-24 rounded bg-line" />
                <div className="mx-auto mt-1.5 h-1 w-20 rounded bg-line" />
                <div className="mx-auto mt-1.5 h-1 w-24 rounded bg-line" />
                <div className="mt-4 text-[10px] text-muted">Specification under analysis</div>
              </div>
            </Card>
          </div>

          {/* Row 2: coverage + key findings */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-base font-semibold text-ink">Standards Coverage by Category</h2>
                <Link to={`/analyses/${id}/standards`} className="text-xs font-medium text-primary hover:underline">View Details →</Link>
              </div>
              {!categories?.length ? <EmptyState>No coverage computed.</EmptyState> : (
                <div className="space-y-2.5">
                  {categories.map((c) => {
                    const p = c.total ? Math.round((c.full + c.partial * 0.6) / c.total * 100) : 0;
                    return (
                      <div key={c.category} className="flex items-center gap-3">
                        <span className="w-24 flex-none text-xs capitalize text-ink">{c.category.toLowerCase()}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-panel">
                          <div className={`h-full rounded-full ${p >= 90 ? "bg-success" : "bg-warning"}`} style={{ width: `${p}%` }} />
                        </div>
                        <span className="w-9 flex-none text-right text-xs font-semibold tabular-nums text-ink">{p}%</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-base font-semibold text-ink">Key Findings</h2>
                <Link to={`/analyses/${id}/issues`} className="text-xs font-medium text-primary hover:underline">View All →</Link>
              </div>
              <div className="space-y-2.5">
                {findings.map((f) => (
                  <div key={f.t} className="flex items-start gap-3">
                    <span className={`grid h-8 w-8 flex-none place-items-center rounded-lg text-sm ${f.tone === "danger" ? "bg-danger-soft text-danger" : f.tone === "warning" ? "bg-warning-soft text-warning" : "bg-primary-soft text-primary"}`}>{f.icon}</span>
                    <div>
                      <div className="text-sm font-semibold text-ink">{f.n} {f.t}</div>
                      <div className="text-xs text-muted">{f.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Product profile + languages */}
          {profile && profile.product_category && (
            <Card className="p-5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <h2 className="font-display text-base font-semibold text-ink">Product / Domain</h2>
                <StatusChip tone={profile.confidence === "HIGH" ? "success" : profile.confidence === "MEDIUM" ? "warning" : "neutral"}>
                  {profile.confidence} confidence
                </StatusChip>
                <span className="rounded-md bg-panel px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">{profile.method.replace("_", " ")}</span>
                {allLangs.length > 0 && (
                  <span className="ml-auto flex items-center gap-1.5 text-xs text-muted">
                    Language:
                    <span className="font-medium text-ink">{allLangs.join(" + ")}</span>
                    {multilingual && <StatusChip tone="info">Multilingual extraction</StatusChip>}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <ProfileChip label="Category" value={profile.product_category} strong />
                {profile.sub_category && <ProfileChip label="Sub-category" value={profile.sub_category} />}
                {profile.sector && <ProfileChip label="Sector" value={profile.sector} />}
                {profile.installation && <ProfileChip label="Installation" value={profile.installation} />}
                {profile.phases != null && <ProfileChip label="Phases" value={String(profile.phases)} />}
                {Object.entries(profile.parameters).map(([k, v]) => <ProfileChip key={k} label={k} value={v} />)}
              </div>
            </Card>
          )}

          <MiiCard analysisId={id} />
          <GfrCard analysisId={id} />

          {/* AI decision trace */}
          {trace.length > 0 && (
            <SectionAccordion title={`AI Decision Trace (${trace.length} steps)`}>
              <ol className="divide-y divide-line">
                {trace.map((s) => (
                  <li key={s.n} className="flex items-start gap-3 px-4 py-2.5">
                    <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-primary-soft text-[11px] font-bold text-primary">{String(s.n).padStart(2, "0")}</span>
                    <div>
                      <div className="text-sm font-medium text-ink">{s.step}</div>
                      <div className="text-xs text-muted">{s.detail}</div>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="border-t border-line px-4 py-2 text-[11px] text-muted">
                Concise, user-facing decision factors — not hidden model reasoning. Every step maps to a real system stage.
              </p>
            </SectionAccordion>
          )}

          {/* AI Insights + Next Steps */}
          <Card className="p-5">
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-saffron">💡</span>
                  <h2 className="font-display text-base font-semibold text-saffron">AI Insights</h2>
                </div>
                <p className="text-sm text-muted">
                  Your tender shows {pct >= 65 ? "strong" : "partial"} alignment with Indian Standards.
                  {r.gaps > 0 ? ` Review the ${r.gaps} potential gap(s) to ensure complete compliance.` : ""}
                  {r.outdated_references > 0 ? ` Consider updating ${r.outdated_references} outdated reference(s).` : ""}
                </p>
              </div>
              <div>
                <div className="mb-2 text-sm font-semibold text-ink">Recommended Next Steps</div>
                <ol className="space-y-1.5">
                  {[
                    r.conflicts > 0 ? "Review specification conflicts" : null,
                    r.gaps > 0 ? "Add details for potential gaps" : null,
                    r.outdated_references > 0 ? "Update outdated standard references" : null,
                    "Verify accepted standards and generate the report",
                  ].filter(Boolean).map((s, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-ink">
                      <span className="grid h-5 w-5 flex-none place-items-center rounded-full bg-success-soft text-[10px] font-bold text-success">{i + 1}</span>
                      {s}
                    </li>
                  ))}
                </ol>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link to={`/analyses/${id}/requirements`} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark">Go to Requirements →</Link>
                  <Link to={`/analyses/${id}/reports`} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-panel">Generate Report</Link>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function ProfileChip({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm ${strong ? "border-primary/30 bg-primary-soft" : "border-line bg-surface"}`}>
      <span className="text-[10px] uppercase tracking-wide text-muted">{label.replace(/_/g, " ")}</span>
      <span className={`font-semibold capitalize ${strong ? "text-primary" : "text-ink"}`}>{value}</span>
    </span>
  );
}

function Kpi({ icon, tone, value, label }: { icon: string; tone: string; value: number; label: string }) {
  const cls = tone === "success" ? "bg-success-soft text-success" : tone === "danger" ? "bg-danger-soft text-danger"
    : tone === "warning" ? "bg-warning-soft text-warning" : "bg-primary-soft text-primary";
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <span className={`grid h-8 w-8 place-items-center rounded-lg text-sm ${cls}`}>{icon}</span>
      <div className="mt-2 text-2xl font-bold tabular-nums text-ink">{value}</div>
      <div className="text-[11px] leading-tight text-muted">{label}</div>
    </div>
  );
}
