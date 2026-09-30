import { useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { AnalysisHeader } from "@/components/AnalysisHeader";
import { Card, EmptyState, GovIcon, Skeleton } from "@/components/ui";
import {
  downloadReport, useAnalysis, useCreateReport, useReportSummary, useCoverageByCategory, useTenderClause,
} from "@/lib/morpheus";

export function ReportsPage() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const isReviewer = user?.role === "REVIEWER";
  const { data: analysis } = useAnalysis(id);
  const { data: s, isLoading } = useReportSummary(id);
  const { data: categories } = useCoverageByCategory(id);
  const { data: clauseData } = useTenderClause(id);
  const create = useCreateReport();
  const [busy, setBusy] = useState<string | null>(null);
  const [copiedLang, setCopiedLang] = useState<string | null>(null);
  const [clauseLang, setClauseLang] = useState<"en" | "hi" | "split">("en");

  function copyText(text: string, langKey: string) {
    if (text) {
      navigator.clipboard.writeText(text);
      setCopiedLang(langKey);
      setTimeout(() => setCopiedLang(null), 2500);
    }
  }

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
  const refCode = `MORPHEUS/2026/TND-${id.slice(0, 8).toUpperCase()}`;

  return (
    <div>
      <AnalysisHeader id={id} section="Report" />

      {isLoading || !s ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            {/* Executive Hero Banner */}
            <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-surface via-surface to-primary-soft/30 p-6 shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/3 overflow-hidden rounded-r-2xl lg:block">
                <img src="/brand/hero_building_clean.png" alt="" className="h-full w-full object-cover object-top opacity-35" />
                <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/60 to-transparent" />
              </div>
              <div className="relative">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 font-tech text-[10px] font-bold uppercase tracking-wider text-primary ring-1 ring-primary/25">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    Authoritative Compliance Dossier
                  </span>
                  <span className="font-tech text-[10px] text-muted">{refCode}</span>
                </div>
                <h1 className="font-display text-2xl font-bold text-primary">Standards-Aligned Procurement Report</h1>
                <div className="mt-1 font-display text-base font-semibold text-ink">{analysis?.title}</div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
                  <span>Standards-aligned · Evidence-backed · Auditable</span>
                  <span>·</span>
                  <span className="text-success font-medium">✓ Verified against BIS catalogue</span>
                </div>
              </div>
            </div>

            {/* 4 Interactive KPI Cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <RKpi
                icon="check"
                tone="success"
                big={`${s.compliance_pct}%`}
                label="Standards Coverage"
                sub={`${s.covered} of ${s.requirements_total} aligned`}
              />
              <RKpi
                icon="book"
                tone="info"
                big={s.top_rows.length}
                label="Applicable Standards"
                sub={`${s.mandatory_count} mandatory`}
              />
              <RKpi
                icon="conflict"
                tone="danger"
                big={criticalIssues}
                label="Critical Issues"
                sub="Require attention"
              />
              <RKpi
                icon="bulb"
                tone="gold"
                big={s.actions.length}
                label="Recommendations"
                sub="To strengthen compliance"
              />
            </div>

            {/* Executive Summary Card */}
            <Card className="p-5.5">
              <div className="flex items-start gap-3.5">
                <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-primary-soft text-primary font-bold text-base shadow-xs">
                  <GovIcon name="doc" className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-base font-semibold text-ink">Executive Summary</h2>
                    <span className="rounded-md bg-success-soft px-2 py-0.5 font-tech text-[10px] font-bold text-success ring-1 ring-success/20">
                      STATUS: ANALYZED
                    </span>
                  </div>
                  <div className="mt-2 rounded-xl border border-line bg-panel/40 p-3.5 text-sm leading-relaxed text-ink">
                    {s.verdict_detail}
                  </div>
                </div>
              </div>
            </Card>

            {/* Key Findings + Recommended Actions */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="p-5">
                <div className="mb-3.5 flex items-center justify-between">
                  <h2 className="font-display text-base font-semibold text-ink">Key Findings</h2>
                  <span className="text-[11px] font-medium text-muted">Audited criteria</span>
                </div>
                <div className="space-y-3 text-sm">
                  <Finding icon="conflict" tone="danger" t={`${s.conflicts} specification conflict(s)`} d="Conflicting requirements detected" />
                  <Finding icon="gap" tone="warning" t={`${s.gaps} potential gap(s)`} d="Additional specifications may be needed" />
                  <Finding icon="clock" tone="warning" t={`${s.mandatory_count} QCO-mandatory standard(s)`} d="Statutory certification required before purchase" />
                  <Finding icon="info" tone="info" t={`Overall compliance: ${s.compliance_pct}%`} d="Specification alignment with Indian Standards" />
                </div>
              </Card>

              <Card className="p-5">
                <div className="mb-3.5 flex items-center justify-between">
                  <h2 className="font-display text-base font-semibold text-ink">Recommended Actions</h2>
                  <span className="text-[11px] font-medium text-muted">{s.actions.length} action items</span>
                </div>
                {s.actions.length === 0 ? (
                  <p className="text-sm text-muted">No blocking actions required.</p>
                ) : (
                  <ol className="space-y-2.5">
                    {s.actions.map((a, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm">
                        <span className="grid h-5 w-5 flex-none place-items-center rounded-full bg-success-soft text-[10px] font-bold text-success shadow-xs">
                          {i + 1}
                        </span>
                        <span className={a.startsWith("MANDATORY") ? "font-medium text-danger" : "text-ink"}>{a}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </Card>
            </div>

            {/* Tender-Ready GeM Specification Clause Card */}
            <Card className="overflow-hidden border-primary/25 bg-gradient-to-b from-primary-soft/20 via-surface to-surface p-5.5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white font-bold text-sm shadow-xs">
                    <GovIcon name="clipboard" className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-base font-semibold text-ink">Tender-Ready Specification Clause</h2>
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 font-tech text-[10px] font-semibold text-primary">GeM / CPPP</span>
                    </div>
                    <p className="text-xs text-muted">Auto-synthesized, legally compliant clause ready for direct insertion into RFP documents</p>
                  </div>
                </div>

                {/* Language Mode Selectors */}
                <div className="flex items-center gap-2">
                  <div className="flex rounded-lg border border-line bg-surface p-0.5 text-xs shadow-xs">
                    <button
                      type="button"
                      onClick={() => setClauseLang("en")}
                      className={`rounded px-2.5 py-1 font-medium transition ${
                        clauseLang === "en" ? "bg-primary text-white shadow-xs" : "text-muted hover:text-ink"
                      }`}
                    >
                      English
                    </button>
                    <button
                      type="button"
                      onClick={() => setClauseLang("hi")}
                      className={`rounded px-2.5 py-1 font-medium transition ${
                        clauseLang === "hi" ? "bg-primary text-white shadow-xs" : "text-muted hover:text-ink"
                      }`}
                    >
                      हिन्दी
                    </button>
                    <button
                      type="button"
                      onClick={() => setClauseLang("split")}
                      className={`rounded px-2.5 py-1 font-medium transition ${
                        clauseLang === "split" ? "bg-primary text-white shadow-xs" : "text-muted hover:text-ink"
                      }`}
                    >
                      Side-by-Side
                    </button>
                  </div>

                  {clauseLang !== "split" && (
                    <button
                      onClick={() => copyText(
                        clauseLang === "hi"
                          ? (clauseData?.clause_text_hi || "")
                          : (clauseData?.clause_text_en || clauseData?.clause_text || ""),
                        clauseLang
                      )}
                      className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-dark hover:-translate-y-0.5 active:translate-y-0"
                    >
                      {copiedLang === clauseLang ? "✓ Copied!" : clauseLang === "hi" ? "Copy हिन्दी Clause" : "Copy English Clause"}
                    </button>
                  )}
                </div>
              </div>

              {clauseData?.clause_text ? (
                <div className="mt-3">
                  {clauseLang === "split" ? (
                    /* Side-by-Side Bilingual View */
                    <div className="grid gap-3 lg:grid-cols-2">
                      <div className="rounded-xl border border-line bg-surface p-4 shadow-inner">
                        <div className="mb-2 flex items-center justify-between border-b border-line pb-2">
                          <span className="font-tech text-xs font-bold text-primary">ENGLISH SPECIFICATION CLAUSE</span>
                          <button
                            onClick={() => copyText(clauseData.clause_text_en || clauseData.clause_text, "en")}
                            className="rounded bg-panel px-2 py-0.5 font-tech text-[10px] font-medium text-ink hover:bg-line transition"
                          >
                            {copiedLang === "en" ? "✓ Copied" : "Copy"}
                          </button>
                        </div>
                        <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap font-sans text-xs leading-relaxed text-ink">
                          {clauseData.clause_text_en || clauseData.clause_text}
                        </pre>
                      </div>

                      <div className="rounded-xl border border-line bg-surface p-4 shadow-inner">
                        <div className="mb-2 flex items-center justify-between border-b border-line pb-2">
                          <span className="font-tech text-xs font-bold text-primary">राजभाषा हिन्दी विनिर्देश खंड</span>
                          <button
                            onClick={() => copyText(clauseData.clause_text_hi || "", "hi")}
                            className="rounded bg-panel px-2 py-0.5 font-tech text-[10px] font-medium text-ink hover:bg-line transition"
                          >
                            {copiedLang === "hi" ? "✓ प्रतिलिपि" : "प्रतिलिपि करें"}
                          </button>
                        </div>
                        <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap font-sans text-xs leading-relaxed text-ink">
                          {clauseData.clause_text_hi || clauseData.clause_text}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    /* Full-width View */
                    <div className="rounded-xl border border-line bg-surface p-4.5 shadow-inner">
                      <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap font-sans text-xs leading-relaxed text-ink">
                        {clauseLang === "hi" && clauseData.clause_text_hi
                          ? clauseData.clause_text_hi
                          : (clauseData.clause_text_en || clauseData.clause_text)}
                      </pre>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-2 text-[11px] text-muted">
                    <span>
                      {clauseLang === "hi"
                        ? "जीएफआर 2017 नियम 144(i) बीआईएस प्राथमिकता एवं नियम 173 गैर-भेदभाव खंड सम्मिलित।"
                        : "Includes GFR 2017 Rule 144(i) BIS preference & Rule 173 anti-brand favoritism clauses."}
                    </span>
                    {clauseData.has_mandatory_qco && (
                      <span className="inline-flex items-center gap-1 font-semibold text-danger">
                        <GovIcon name="warning" className="h-3.5 w-3.5" />
                        <span>{clauseLang === "hi" ? "सांविधिक क्यूसीओ (QCO) लाइसेंस अनिवार्य" : "Statutory QCO license mandatory for bidders"}</span>
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <EmptyState>Clause generation loading or unavailable.</EmptyState>
              )}
            </Card>

            {/* Compliance by Category (Non-overlapping, Wide Label Layout) */}
            <Card className="p-5.5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-base font-semibold text-ink">Compliance by Category</h2>
                  <p className="text-xs text-muted">Breakdown across technical requirement families</p>
                </div>
                <span className="font-tech text-xs text-muted">{categories?.length ?? 0} Categories Evaluated</span>
              </div>

              {!categories?.length ? (
                <EmptyState>No coverage computed.</EmptyState>
              ) : (
                <div className="space-y-3">
                  {categories.map((c) => {
                    const p = c.total ? Math.round(((c.full + c.partial * 0.6) / c.total) * 100) : 0;
                    const formatted = c.category.replace(/_/g, " ");
                    return (
                      <div key={c.category} className="group flex items-center gap-3 py-0.5">
                        <span
                          className="w-40 sm:w-44 flex-none truncate text-xs font-medium capitalize text-ink"
                          title={formatted}
                        >
                          {formatted}
                        </span>
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-panel">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              p >= 90 ? "bg-success" : p >= 50 ? "bg-warning" : "bg-danger"
                            }`}
                            style={{ width: `${p}%` }}
                          />
                        </div>
                        <span className="w-12 flex-none text-right text-xs font-bold tabular-nums text-ink">
                          {p}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Right Column / Actions & Metadata */}
          <div className="space-y-6">
            <Card className="p-5">
              <h2 className="mb-3 font-display text-base font-semibold text-ink">Report Actions</h2>
              {isReviewer ? (
                <div className="space-y-2">
                  <button
                    onClick={() => window.print()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-primary-dark hover:-translate-y-0.5 transition-all"
                  >
                    <GovIcon name="print" className="h-4 w-4" />
                    <span>View & Print Final Report</span>
                  </button>
                  <p className="px-1 text-[11px] leading-snug text-muted">
                    The report is produced by the procurement officer. As reviewer you can view and annotate it —
                    generation controls are intentionally restricted to avoid conflicting versions.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <button
                    onClick={() => make("PDF")}
                    disabled={!!busy}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-primary-dark hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 transition-all"
                  >
                    <GovIcon name="doc" className="h-4 w-4" />
                    <span>{busy === "PDF" ? "Generating Official PDF…" : "Download Full Report (PDF)"}</span>
                  </button>

                  <button
                    onClick={() => make("DOCX")}
                    disabled={!!busy}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink shadow-2xs hover:bg-panel hover:border-primary/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 transition-all"
                  >
                    <GovIcon name="note" className="h-4 w-4" />
                    <span>{busy === "DOCX" ? "Preparing Document…" : "Download Executive Summary (DOCX)"}</span>
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink shadow-2xs hover:bg-panel hover:border-primary/40 hover:-translate-y-0.5 transition-all"
                  >
                    <GovIcon name="print" className="h-4 w-4" />
                    <span>Print Compliance Matrix</span>
                  </button>

                  <button
                    onClick={exportPackage}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink shadow-2xs hover:bg-panel hover:border-primary/40 hover:-translate-y-0.5 transition-all"
                  >
                    <GovIcon name="package" className="h-4 w-4" />
                    <span>Export GeM Package (JSON)</span>
                  </button>

                  <p className="px-1 text-[10px] leading-snug text-muted">
                    GeM / CPPP integration-ready digital package with complete evidence hashes.
                  </p>
                </div>
              )}
            </Card>

            {/* Publication Certificate Box */}
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-base font-semibold text-ink">Report Credentials</h2>
                <span className="rounded bg-panel px-1.5 py-0.5 font-tech text-[10px] text-muted">OFFICIAL</span>
              </div>
              <dl className="space-y-2.5 text-xs">
                <Info
                  k="Generated On"
                  v={analysis?.created_at ? new Date(analysis.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                />
                <Info k="Document" v={analysis?.title ?? "—"} />
                <Info k="Requirements" v={String(s.requirements_total)} />
                <Info k="Engine Version" v="MORPHEUS v2.1" />
                <Info k="Audited By" v="Government AI Engine" />
                <Info k="Authority" v="Procurement Directorate" />
              </dl>
            </Card>

            {/* AI Strategic Advisory Card */}
            <Card className="border-saffron/35 bg-saffron-soft/50 p-4.5 shadow-xs">
              <div className="flex items-center gap-2">
                <GovIcon name="bulb" className="h-4 w-4 text-saffron" />
                <span className="text-sm font-bold text-saffron">Procurement Advisory</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-ink/80">
                {criticalIssues > 0
                  ? `Addressing the ${criticalIssues} critical issue(s) before publication will eliminate vendor grievance risks and ensure strict QCO compliance.`
                  : "This specification satisfies all statutory BIS quality orders and is fully ready for GeM portal tendering."}
              </p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function RKpi({ icon, tone, big, label, sub }: { icon: string; tone: string; big: React.ReactNode; label: string; sub: string }) {
  const meta = {
    success: {
      border: "hover:border-emerald-500/50",
      topBorder: "border-t-2 border-t-emerald-600",
      badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20",
    },
    danger: {
      border: "hover:border-rose-500/50",
      topBorder: "border-t-2 border-t-rose-600",
      badge: "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20",
    },
    gold: {
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
    <Card className={`group p-4 bg-gradient-to-b from-surface to-panel/30 transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${meta.topBorder} ${meta.border}`}>
      <span className={`grid h-9 w-9 place-items-center rounded-xl text-sm transition-transform duration-200 group-hover:scale-110 shadow-2xs ${meta.badge}`}>
        <GovIcon name={icon} className="h-4 w-4" />
      </span>
      <div className="mt-2.5 text-2xl font-bold tabular-nums text-ink">{big}</div>
      <div className="text-xs font-semibold text-ink">{label}</div>
      <div className="mt-0.5 text-[11px] font-medium text-muted">{sub}</div>
    </Card>
  );
}

function Finding({ icon, tone, t, d }: { icon: string; tone: string; t: string; d: string }) {
  const cls = tone === "danger"
    ? "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20"
    : tone === "warning"
    ? "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20"
    : "bg-primary-soft text-primary ring-1 ring-primary/20";
  return (
    <div className="group flex items-start gap-3 rounded-xl p-1 transition-colors hover:bg-panel/40">
      <span className={`grid h-8 w-8 flex-none place-items-center rounded-lg text-sm transition-transform duration-150 group-hover:scale-105 shadow-2xs ${cls}`}>
        <GovIcon name={icon} className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="font-semibold text-ink">{t}</div>
        <div className="text-xs text-muted">{d}</div>
      </div>
    </div>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line pb-1.5 last:border-b-0">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right font-medium text-ink truncate max-w-[160px]">{v}</dd>
    </div>
  );
}
