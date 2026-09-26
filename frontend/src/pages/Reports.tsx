import { useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { AnalysisHeader } from "@/components/AnalysisHeader";
import { Card, EmptyState, Skeleton } from "@/components/ui";
import {
  downloadReport, useAnalysis, useCreateReport, useReportSummary, useCoverageByCategory,
} from "@/lib/morpheus";

export function ReportsPage() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const isReviewer = user?.role === "REVIEWER";
  const { data: analysis } = useAnalysis(id);
  const { data: s, isLoading } = useReportSummary(id);
  const { data: categories } = useCoverageByCategory(id);
  const create = useCreateReport();
  const [busy, setBusy] = useState<string | null>(null);

  async function make(format: "PDF" | "DOCX") {
    setBusy(format);
    try {
      const rep = await create.mutateAsync({ analysisId: id, format });
      await downloadReport(rep.id, format);
    } finally { setBusy(null); }
  }

  async function exportPackage() {
    const { api } = await import("@/lib/api");
    const res = await api.get(`/analyses/${id}/export`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `morpheus-procurement-package-${id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const criticalIssues = (s?.conflicts ?? 0) + (s?.missing ?? 0);

  return (
    <div>
      <AnalysisHeader id={id} section="Report" />

      {isLoading || !s ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-6">
            {/* Hero banner */}
            <div className="relative overflow-hidden rounded-2xl border border-line bg-surface p-6">
              <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/4 overflow-hidden rounded-r-2xl lg:block">
                <img src="/brand/hero_building_clean.png" alt="" className="h-full w-full object-cover object-top" />
                <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/30 to-transparent" />
              </div>
              <div className="relative">
                <h1 className="font-display text-2xl font-bold text-primary">Standards-Aligned Procurement Report</h1>
                <div className="font-display text-lg font-semibold text-ink">{analysis?.title}</div>
                <div className="mt-1 text-sm text-muted">Standards-aligned · Evidence-backed · Auditable</div>
              </div>
            </div>

            {/* 4 KPIs */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <RKpi icon="✓" tone="success" big={`${s.compliance_pct}%`} label="Standards Coverage" sub={`${s.covered} of ${s.requirements_total} aligned`} />
              <RKpi icon="📗" tone="info" big={s.top_rows.length} label="Applicable Standards" sub={`${s.mandatory_count} mandatory`} />
              <RKpi icon="⚠" tone="danger" big={criticalIssues} label="Critical Issues" sub="Require attention" />
              <RKpi icon="◎" tone="info" big={s.actions.length} label="Recommendations" sub="To strengthen compliance" />
            </div>

            {/* Executive Summary */}
            <Card className="p-5">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-primary-soft text-primary">📄</span>
                <div>
                  <h2 className="font-display text-base font-semibold text-ink">Executive Summary</h2>
                  <p className="mt-1 text-sm text-muted">{s.verdict_detail}</p>
                </div>
              </div>
            </Card>

            {/* Key Findings + Recommended Actions */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="p-5">
                <h2 className="mb-3 font-display text-base font-semibold text-ink">Key Findings</h2>
                <div className="space-y-2.5 text-sm">
                  <Finding icon="⚠" tone="danger" t={`${s.conflicts} specification conflict(s)`} d="Conflicting requirements" />
                  <Finding icon="△" tone="warning" t={`${s.gaps} potential gap(s)`} d="Additional specifications may be needed" />
                  <Finding icon="◷" tone="warning" t={`${s.mandatory_count} QCO-mandatory standard(s)`} d="Certification required before procurement" />
                  <Finding icon="ⓘ" tone="info" t={`Overall compliance: ${s.compliance_pct}%`} d="Tender alignment with applicable standards" />
                </div>
              </Card>

              <Card className="p-5">
                <h2 className="mb-3 font-display text-base font-semibold text-ink">Recommended Actions</h2>
                {s.actions.length === 0 ? <p className="text-sm text-muted">No blocking actions.</p> : (
                  <ol className="space-y-2">
                    {s.actions.map((a, i) => (
                      <li key={i} className="flex gap-2.5 text-sm">
                        <span className="grid h-5 w-5 flex-none place-items-center rounded-full bg-success-soft text-[10px] font-bold text-success">{i + 1}</span>
                        <span className={a.startsWith("MANDATORY") ? "font-medium text-danger" : "text-ink"}>{a}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </Card>
            </div>

            {/* Compliance by category */}
            <Card className="p-5">
              <h2 className="mb-4 font-display text-base font-semibold text-ink">Compliance by Category</h2>
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
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <Card className="p-5">
              <h2 className="mb-3 font-display text-base font-semibold text-ink">Report Actions</h2>
              {isReviewer ? (
                /* Reviewers consume the officer's report — they never regenerate it,
                   so there is only ever one authoritative version. */
                <div className="space-y-2">
                  <button onClick={() => window.print()}
                    className="flex w-full items-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark">
                    View final report
                  </button>
                  <p className="px-1 text-[11px] leading-snug text-muted">
                    The report is produced by the procurement officer. As reviewer you can view and annotate it —
                    generation controls are intentionally disabled to avoid conflicting versions.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <button onClick={() => make("PDF")} disabled={!!busy}
                    className="flex w-full items-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50">
                    {busy === "PDF" ? "Preparing…" : "Download full report (PDF)"}
                  </button>
                  <button onClick={() => make("DOCX")} disabled={!!busy}
                    className="flex w-full items-center gap-2 rounded-lg border border-line px-3 py-2.5 text-sm font-medium text-ink hover:bg-panel disabled:opacity-50">
                    {busy === "DOCX" ? "Preparing…" : "Download executive summary (DOCX)"}
                  </button>
                  <button onClick={() => window.print()}
                    className="flex w-full items-center gap-2 rounded-lg border border-line px-3 py-2.5 text-sm font-medium text-ink hover:bg-panel">Print / compliance matrix</button>
                  <button onClick={exportPackage}
                    className="flex w-full items-center gap-2 rounded-lg border border-line px-3 py-2.5 text-sm font-medium text-ink hover:bg-panel">
                    Export procurement package (JSON)
                  </button>
                  <p className="px-1 text-[10px] leading-snug text-muted">GeM / CPPP integration-ready export — not a live integration.</p>
                </div>
              )}
            </Card>

            <Card className="p-5">
              <h2 className="mb-3 font-display text-base font-semibold text-ink">Report Information</h2>
              <dl className="space-y-2 text-xs">
                <Info k="Generated On" v={analysis?.created_at ? new Date(analysis.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"} />
                <Info k="Document" v={analysis?.title ?? "—"} />
                <Info k="Requirements" v={String(s.requirements_total)} />
                <Info k="Analysis Version" v="v1.0.0" />
                <Info k="Generated By" v="MORPHEUS AI" />
                <Info k="Reviewed By" v="Procurement Officer" />
              </dl>
            </Card>

            <Card className="border-saffron/30 bg-saffron-soft/40 p-4">
              <div className="flex items-center gap-2"><span className="text-saffron">🌱</span><span className="text-sm font-semibold text-saffron">AI Insight</span></div>
              <p className="mt-1 text-xs text-muted">
                {criticalIssues > 0
                  ? `Addressing the ${criticalIssues} critical issue(s) will improve standards coverage and reduce the risk of procurement delays.`
                  : "This tender is well aligned with applicable standards and ready to proceed."}
              </p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function RKpi({ icon, tone, big, label, sub }: { icon: string; tone: string; big: React.ReactNode; label: string; sub: string }) {
  const cls = tone === "success" ? "bg-success-soft text-success" : tone === "danger" ? "bg-danger-soft text-danger" : "bg-primary-soft text-primary";
  return (
    <Card className="p-4">
      <span className={`grid h-9 w-9 place-items-center rounded-lg text-sm ${cls}`}>{icon}</span>
      <div className="mt-2 text-2xl font-bold tabular-nums text-ink">{big}</div>
      <div className="text-xs font-medium text-ink">{label}</div>
      <div className="text-[11px] text-muted">{sub}</div>
    </Card>
  );
}
function Finding({ icon, tone, t, d }: { icon: string; tone: string; t: string; d: string }) {
  const cls = tone === "danger" ? "bg-danger-soft text-danger" : tone === "warning" ? "bg-warning-soft text-warning" : "bg-primary-soft text-primary";
  return (
    <div className="flex items-start gap-3">
      <span className={`grid h-8 w-8 flex-none place-items-center rounded-lg ${cls}`}>{icon}</span>
      <div><div className="font-semibold text-ink">{t}</div><div className="text-xs text-muted">{d}</div></div>
    </div>
  );
}
function Info({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line pb-1.5 last:border-b-0">
      <dt className="text-muted">{k}</dt><dd className="text-right font-medium text-ink">{v}</dd>
    </div>
  );
}
