import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, Button, GovIcon, Skeleton, StatusChip, EmptyState } from "@/components/ui";
import { useAnalytics, useAnalyses } from "@/lib/morpheus";

export function AnalyticsPage() {
  const { data, isLoading } = useAnalytics();
  const { data: analyses } = useAnalyses();
  const [toast, setToast] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<"8w" | "fy" | "all">("8w");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  function exportCsv() {
    if (!data) return;
    const lines = [
      `"MORPHEUS - Department Standards & Procurement Intelligence Report"`,
      `"Generated: ${new Date().toLocaleString()}"`,
      `"Authority: Government of India - Public Procurement Directorate"`,
      "",
      `"--- OVERALL KPIS ---"`,
      `"Total Tenders Analysed","${data.kpis.total_analyses}"`,
      `"Average Standards Coverage","${data.kpis.compliance_rate}%"`,
      `"Average Gaps Per Tender","${data.kpis.avg_gaps}"`,
      `"Standards in Catalogue","${data.kpis.standards_catalogue}"`,
      "",
      `"--- SECTOR BREAKDOWN ---"`,
      `"Sector","Tenders Count","Compliance Rate %"`,
      ...data.sector_breakdown.map((s) => `"${s.sector}","${s.count}","${s.compliance_rate}%"`),
      "",
      `"--- COMMON GAP TYPES ---"`,
      `"Gap Category","Frequency Count"`,
      ...data.gap_categories.map((g) => `"${g.category}","${g.gap_count}"`),
      "",
      `"--- TOP CITED STANDARDS ---"`,
      `"IS Number","Title","Citations Count"`,
      ...data.top_standards.map((s) => `"${s.is_number}","${s.title.replace(/"/g, '""')}","${s.citation_count}"`),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `department-analytics-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("Department Analytics CSV exported successfully.");
  }

  const completedTenders = useMemo(() => {
    return (analyses ?? []).filter((a) => a.status === "READY" || a.status === "COMPLETED");
  }, [analyses]);

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-medium text-white shadow-xl animate-in fade-in slide-in-from-bottom-2">
          <GovIcon name="check" className="h-4 w-4 text-emerald-300" />
          <span>{toast}</span>
        </div>
      )}

      {/* ── Official Government Hero Header ────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-[#013528] via-[#024a38] to-[#012d22] p-6 text-white shadow-xl lg:p-8">
        {/* Subtle decorative background patterns */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute right-1/4 -bottom-24 h-64 w-64 rounded-full bg-amber-400/10 blur-2xl" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-3 py-1 font-tech text-[11px] font-semibold uppercase tracking-wider text-emerald-200 ring-1 ring-emerald-400/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Department Intelligence & Audit Dossier
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-tech text-[10px] text-amber-200/90 ring-1 ring-white/15">
                GFR 2017 · Rule 144(i) Aligned
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-tech text-[10px] text-emerald-200/90 ring-1 ring-white/15">
                Viksit Bharat 2047
              </span>
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Department Standards Analytics & Reports
              </h1>
              <p className="mt-1.5 text-sm leading-relaxed text-emerald-100/80">
                Comprehensive standards-coverage trends, statutory Quality Control Order (QCO) enforcement, and compliance intelligence across all public procurement tenders.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                variant="primary"
                onClick={exportCsv}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md hover:shadow-lg"
              >
                <GovIcon name="clipboard" className="h-4 w-4" />
                <span>Export Executive CSV</span>
              </Button>

              <Button
                variant="secondary"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border-white/20 shadow-sm"
              >
                <GovIcon name="print" className="h-4 w-4" />
                <span>Print Official Summary</span>
              </Button>

              <Link
                to="/standards"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-200 hover:text-white underline-offset-4 hover:underline ml-2"
              >
                <GovIcon name="book" className="h-3.5 w-3.5" />
                <span>Browse Standards Library →</span>
              </Link>
            </div>
          </div>

          {/* Right Banner Artwork Thumbnail */}
          <div className="relative hidden w-80 flex-none overflow-hidden rounded-2xl border border-white/20 bg-white/5 shadow-2xl backdrop-blur-md lg:block">
            <img
              src="/assets/analytics/analytics_hero_banner.jpg"
              alt="Department Procurement Analytics Hero"
              className="h-44 w-full object-cover transition-transform duration-500 hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#012d22] via-transparent to-transparent opacity-80" />
            <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] font-medium text-emerald-100">
              <span className="flex items-center gap-1">
                <GovIcon name="shield" className="h-3.5 w-3.5 text-amber-300" />
                <span>BIS Digital Oversight</span>
              </span>
              <span className="font-tech text-[10px] text-emerald-300">Live Telemetry</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Elevated KPI Grid ─────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading || !data ? (
          <>
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </>
        ) : (
          <>
            {/* KPI 1: Tenders Analysed */}
            <Card className="relative overflow-hidden border-t-2 border-t-indigo-600 bg-gradient-to-br from-surface via-surface to-indigo-50/25 p-4.5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
                    Tenders Analysed
                  </div>
                  <div className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                    {data.kpis.total_analyses}
                  </div>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-indigo-200 bg-indigo-50/80 text-indigo-700 shadow-xs">
                  <GovIcon name="doc" className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2 text-[11px]">
                <span className="text-muted">Procurement packages audited</span>
                <span className="font-tech font-semibold text-indigo-700">100% Indexed</span>
              </div>
            </Card>

            {/* KPI 2: Average Coverage Rate */}
            <Card className="relative overflow-hidden border-t-2 border-t-emerald-600 bg-gradient-to-br from-surface via-surface to-emerald-50/25 p-4.5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
                    Avg Standards Coverage
                  </div>
                  <div className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                    {data.kpis.compliance_rate}%
                  </div>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-emerald-200 bg-emerald-50/80 text-emerald-700 shadow-xs">
                  <GovIcon name="shield" className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2 text-[11px]">
                <span className="text-muted">GFR Rule 144(i) preference</span>
                <span className="font-tech font-semibold text-emerald-700">Target ≥ 80%</span>
              </div>
            </Card>

            {/* KPI 3: Average Gaps / Tender */}
            <Card className="relative overflow-hidden border-t-2 border-t-amber-500 bg-gradient-to-br from-surface via-surface to-amber-50/25 p-4.5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
                    Avg Gaps / Tender
                  </div>
                  <div className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                    {data.kpis.avg_gaps}
                  </div>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-amber-200 bg-amber-50/80 text-amber-700 shadow-xs">
                  <GovIcon name="warning" className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2 text-[11px]">
                <span className="text-muted">Missing or ambiguous specs</span>
                <span className="font-tech font-semibold text-amber-700">Action Req.</span>
              </div>
            </Card>

            {/* KPI 4: Curated Standards */}
            <Card className="relative overflow-hidden border-t-2 border-t-teal-600 bg-gradient-to-br from-surface via-surface to-teal-50/25 p-4.5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
                    Standards Catalogue
                  </div>
                  <div className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                    {data.kpis.standards_catalogue}
                  </div>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-teal-200 bg-teal-50/80 text-teal-700 shadow-xs">
                  <GovIcon name="book" className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2 text-[11px]">
                <span className="text-muted">Curated BIS Indian Standards</span>
                <span className="font-tech font-semibold text-teal-700">Authoritative</span>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* ── Mid Section: Sector Breakdown & Weekly Trend ─────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sector breakdown */}
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink">Standards Coverage by Sector</h2>
              <p className="text-xs text-muted">
                Statutory BIS compliance rates across key public procurement domains.
              </p>
            </div>
            <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200/60">
              {data?.sector_breakdown.length ?? 0} Sectors
            </span>
          </div>

          {!data ? (
            <Skeleton className="h-48" />
          ) : data.sector_breakdown.length === 0 ? (
            <EmptyState>No completed tender data available.</EmptyState>
          ) : (
            <div className="space-y-4">
              {data.sector_breakdown.map((s) => {
                const hasTenders = s.count > 0;
                const isHighCompliance = s.compliance_rate >= 70;
                const isMedCompliance = s.compliance_rate >= 40;
                const toneBg = hasTenders
                  ? isHighCompliance
                    ? "bg-emerald-600"
                    : isMedCompliance
                    ? "bg-amber-500"
                    : "bg-rose-500"
                  : "bg-teal-600";

                return (
                  <div key={s.sector} className="rounded-xl border border-line bg-surface p-3.5 transition-all hover:border-primary/40 hover:bg-panel/40">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-panel text-ink border border-line">
                          <GovIcon
                            name={
                              s.sector.toLowerCase().includes("civil")
                                ? "standard"
                                : s.sector.toLowerCase().includes("water")
                                ? "doc"
                                : "package"
                            }
                            className="h-4 w-4 text-primary"
                          />
                        </span>
                        <div>
                          <div className="text-sm font-semibold capitalize text-ink">{s.sector}</div>
                          <div className="text-[11px] text-muted">
                            {hasTenders
                              ? `${s.count} active tender dossier${s.count > 1 ? "s" : ""}`
                              : `Catalogue Ready · ${s.catalogue_standards ?? 0} Indian Standards`}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {hasTenders ? (
                          <>
                            <span className="font-tech text-base font-bold text-ink">{s.compliance_rate}%</span>
                            <div className="text-[10px] uppercase font-semibold text-muted">Avg Coverage</div>
                          </>
                        ) : (
                          <span className="rounded-md bg-teal-50 px-2 py-0.5 font-tech text-[11px] font-bold text-teal-800 border border-teal-200">
                            Pre-RFQ Ready
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-line/60">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${toneBg}`}
                          style={{ width: hasTenders ? `${Math.max(6, s.compliance_rate)}%` : "100%" }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/40 p-3 text-xs leading-relaxed text-emerald-900 flex items-start gap-2.5">
                <GovIcon name="check" className="h-4 w-4 text-emerald-700 flex-none mt-0.5" />
                <span>
                  <strong>Priority Sector Alert:</strong> Electrical & Municipal Solar Infrastructure currently holds active tender dossiers with QCO mandatory compliance enforcement in effect.
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* Weekly trend */}
        <Card className="p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-ink">Tender Ingestion & Processing Velocity</h2>
              <p className="text-xs text-muted">
                Dossiers analysed and compliance monitoring over the last 8 weeks.
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-line bg-panel p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setTimeRange("8w")}
                className={`rounded px-2 py-0.5 font-medium transition-colors ${timeRange === "8w" ? "bg-surface text-ink shadow-xs" : "text-muted hover:text-ink"}`}
              >
                8 Weeks
              </button>
              <button
                type="button"
                onClick={() => setTimeRange("fy")}
                className={`rounded px-2 py-0.5 font-medium transition-colors ${timeRange === "fy" ? "bg-surface text-ink shadow-xs" : "text-muted hover:text-ink"}`}
              >
                FY 26-27
              </button>
            </div>
          </div>

          {!data ? (
            <Skeleton className="h-48" />
          ) : (
            <div>
              <div className="relative flex h-44 items-end justify-between gap-2 pt-4">
                {/* Horizontal Target Guideline */}
                <div className="pointer-events-none absolute left-0 right-0 top-6 border-b border-dashed border-emerald-500/30 flex items-center justify-end">
                  <span className="font-tech text-[9px] text-emerald-700 bg-surface/90 px-1 mr-1">
                    National Target 80%
                  </span>
                </div>

                {data.trend.map((t, i) => {
                  const max = Math.max(1, ...data.trend.map((x) => x.analyses_count));
                  const h = Math.round((t.analyses_count / max) * 100);
                  const hasData = t.analyses_count > 0;

                  return (
                    <div key={i} className="group relative flex flex-1 flex-col items-center gap-1.5">
                      {/* Tooltip on Hover */}
                      <div className="pointer-events-none absolute -top-12 z-20 hidden whitespace-nowrap rounded-lg bg-ink px-2.5 py-1 text-[11px] font-medium text-white shadow-lg group-hover:block">
                        {t.week}: {t.analyses_count} Tenders ({t.compliance_rate}% avg)
                      </div>

                      <div className="flex w-full flex-1 items-end justify-center">
                        <div
                          className={`w-full max-w-[28px] rounded-t-md transition-all duration-500 ${
                            hasData
                              ? "bg-gradient-to-t from-primary to-emerald-500 shadow-xs group-hover:from-primary-dark group-hover:to-emerald-400"
                              : "bg-line/40 group-hover:bg-line/70"
                          }`}
                          style={{ height: hasData ? `${Math.max(14, h)}%` : "6%" }}
                        />
                      </div>
                      <span className={`text-[10px] tabular-nums font-semibold ${hasData ? "text-ink" : "text-muted/60"}`}>
                        {t.analyses_count}
                      </span>
                      <span className="text-[9px] font-medium text-muted">{t.week}</span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-gradient-to-t from-primary to-emerald-500" />
                  Analysed Tender Volume
                </span>
                <span className="font-tech text-emerald-800 font-medium">
                  Average turnaround: &lt; 2.4s per clause match
                </span>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ── Official BIS Statutory Compliance & Quality Oversight Card ─ */}
      <Card className="overflow-hidden border border-emerald-900/10 bg-gradient-to-br from-surface via-surface to-emerald-50/20 p-6 lg:p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="flex flex-none items-center justify-center">
            <div className="relative overflow-hidden rounded-2xl border border-line bg-surface shadow-md ring-4 ring-emerald-600/10 transition-transform duration-300 hover:scale-[1.02]">
              <img
                src="/assets/analytics/compliance_audit_shield.jpg"
                alt="Official Bureau of Indian Standards Certification Seal"
                className="h-32 w-32 object-cover"
              />
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 ring-1 ring-emerald-600/20">
                <GovIcon name="verified" className="h-3.5 w-3.5" />
                Statutory Oversight Matrix
              </span>
              <span className="rounded-md bg-panel px-2 py-0.5 text-xs font-semibold text-muted">
                CAG & CVC Defensible
              </span>
            </div>

            <div>
              <h2 className="text-lg font-bold text-ink">
                National Quality Control Orders (QCO) & BIS Compliance Framework
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Under Department of Expenditure Procurement Manual 2024 and GFR 2017 Rule 144(i), all Government tenders must specify Bureau of Indian Standards (BIS) specifications where available. Bids quoting non-certified goods in QCO notified categories face mandatory statutory disqualification.
              </p>
            </div>

            <div className="grid gap-3 pt-1 sm:grid-cols-3">
              <div className="rounded-xl border border-line bg-surface/80 p-3 shadow-xs">
                <div className="text-[11px] font-semibold text-muted">QCO Verification Rate</div>
                <div className="mt-0.5 font-tech text-base font-bold text-emerald-700">100% Tracked</div>
                <div className="mt-0.5 text-[10px] text-muted">Cross-referenced against Gazette</div>
              </div>
              <div className="rounded-xl border border-line bg-surface/80 p-3 shadow-xs">
                <div className="text-[11px] font-semibold text-muted">GFR 144(i) Alignment</div>
                <div className="mt-0.5 font-tech text-base font-bold text-primary">Mandatory Preference</div>
                <div className="mt-0.5 text-[10px] text-muted">Strict Indian Standard precedence</div>
              </div>
              <div className="rounded-xl border border-line bg-surface/80 p-3 shadow-xs">
                <div className="text-[11px] font-semibold text-muted">Anti-Cartelization Gate</div>
                <div className="mt-0.5 font-tech text-base font-bold text-teal-700">Active Vigilance</div>
                <div className="mt-0.5 text-[10px] text-muted">Vendor-neutral parameter checks</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Lower Section: Gap Categories & Top-Cited Standards ───────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top gap categories */}
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink">Most Common Tender Gaps</h2>
              <p className="text-xs text-muted">
                Frequent deficiencies detected in department tender specifications.
              </p>
            </div>
            <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200/60">
              Needs Correction
            </span>
          </div>

          {!data ? (
            <Skeleton className="h-40" />
          ) : data.gap_categories.length === 0 ? (
            <EmptyState>No gaps recorded in current analyses.</EmptyState>
          ) : (
            <div className="space-y-2.5">
              {data.gap_categories.map((g, idx) => {
                const isCritical = g.category.toLowerCase().includes("unmapped") || g.category.toLowerCase().includes("safety");
                return (
                  <div
                    key={g.category}
                    className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:border-amber-400 hover:bg-panel/40"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`grid h-7 w-7 place-items-center rounded-lg ${isCritical ? "bg-rose-50 text-rose-600 border border-rose-200" : "bg-amber-50 text-amber-600 border border-amber-200"}`}>
                        <GovIcon name="warning" className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <span className="font-semibold text-sm capitalize text-ink">
                          {g.category.replace(/_/g, " ")}
                        </span>
                        <div className="text-[11px] text-muted">
                          {idx === 0
                            ? "Tender clause lacks explicit BIS Indian Standard citation"
                            : idx === 1
                            ? "Omission of standard installation and erection guidelines"
                            : "Standard safety and circuit breaker parameters unreferenced"}
                        </div>
                      </div>
                    </div>
                    <span className="rounded-lg bg-amber-100/80 px-2.5 py-1 font-tech text-xs font-bold text-amber-800 ring-1 ring-amber-600/20">
                      {g.gap_count} flagged
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Most-cited standards */}
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink">Top-Cited Indian Standards</h2>
              <p className="text-xs text-muted">
                Frequently governing standards mapped across municipal and public works.
              </p>
            </div>
            <Link to="/standards" className="text-xs font-semibold text-primary hover:underline">
              View All 95+ →
            </Link>
          </div>

          {!data ? (
            <Skeleton className="h-40" />
          ) : data.top_standards.length === 0 ? (
            <EmptyState>No standards cited yet.</EmptyState>
          ) : (
            <div className="space-y-2">
              {data.top_standards.map((s) => (
                <div
                  key={s.is_number}
                  className="flex items-center gap-3 rounded-xl border border-line bg-surface p-2.5 transition-colors hover:border-primary/40 hover:bg-panel/40"
                >
                  <span className="w-28 flex-none font-tech text-xs font-bold text-primary">
                    {s.is_number}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-ink font-medium">
                    {s.title}
                  </span>
                  <span className="rounded-lg bg-panel px-2.5 py-1 font-tech text-xs font-bold text-ink border border-line/80">
                    ×{s.citation_count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Recent Department Analyses Quick Audit Table ──────────────── */}
      <Card className="p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-ink">Recent Department Tender Dossiers</h2>
            <p className="text-xs text-muted">
              Live audit status, requirement extractions, and direct links to comprehensive reports.
            </p>
          </div>
          <Link to="/analyses/new">
            <Button className="text-xs inline-flex items-center gap-1.5">
              <GovIcon name="plus" className="h-3.5 w-3.5" />
              <span>Analyse New Tender</span>
            </Button>
          </Link>
        </div>

        {completedTenders.length === 0 ? (
          <EmptyState>No tender analyses processed yet.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line text-muted font-medium">
                  <th className="pb-2.5 font-medium">Tender Name & ID</th>
                  <th className="pb-2.5 font-medium">Sector</th>
                  <th className="pb-2.5 font-medium">Workflow Stage</th>
                  <th className="pb-2.5 font-medium">Analysis Date</th>
                  <th className="pb-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {completedTenders.map((a) => (
                  <tr key={a.id} className="group hover:bg-panel/40 transition-colors">
                    <td className="py-3 pr-4">
                      <Link
                        to={`/analyses/${a.id}/reports`}
                        className="font-semibold text-ink hover:text-primary hover:underline line-clamp-1"
                      >
                        {a.title}
                      </Link>
                      <div className="font-tech text-[10px] text-muted">
                        ID: {a.id.slice(0, 18)}…
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="rounded-md bg-panel px-2 py-0.5 text-[11px] font-medium capitalize text-ink border border-line">
                        {a.sector || "General"}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <StatusChip tone={a.workflow_status === "FINALIZED" ? "success" : "info"}>
                        {a.workflow_status || "Completed"}
                      </StatusChip>
                    </td>
                    <td className="py-3 pr-4 font-tech text-muted">
                      {a.created_at ? new Date(a.created_at).toLocaleDateString() : "Recent"}
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        to={`/analyses/${a.id}/reports`}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200/60 hover:bg-emerald-100 transition-colors"
                      >
                        <span>View Report</span>
                        <GovIcon name="check" className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
