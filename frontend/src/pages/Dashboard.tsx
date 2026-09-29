import { Link } from "react-router-dom";
import { Card, Skeleton, type Tone } from "@/components/ui";
import { useDashboard, useRegulatoryUpdates } from "@/lib/morpheus";

const SECTOR_PILL: Record<string, string> = {
  electrical: "bg-amber-100 text-amber-800 border-amber-200",
  healthcare: "bg-purple-100 text-purple-800 border-purple-200",
  it: "bg-blue-100 text-blue-800 border-blue-200",
  construction: "bg-orange-100 text-orange-800 border-orange-200",
  water: "bg-sky-100 text-sky-800 border-sky-200",
  mechanical: "bg-emerald-100 text-emerald-800 border-emerald-200",
  materials: "bg-stone-200 text-stone-800 border-stone-300",
  civil: "bg-teal-100 text-teal-800 border-teal-200",
};

const VERDICT: Record<string, { label: string; cls: string; dot: string }> = {
  READY: { label: "Completed", cls: "bg-success-soft text-success border-success/30", dot: "bg-success" },
  REVIEW: { label: "In Review", cls: "bg-warning-soft text-warning border-warning/30", dot: "bg-warning" },
  ACTION_REQUIRED: { label: "Action Needed", cls: "bg-danger-soft text-danger border-danger/30", dot: "bg-danger" },
  PENDING: { label: "Processing", cls: "bg-panel text-muted border-line", dot: "bg-muted" },
};

export function DashboardPage() {
  const { data, isLoading } = useDashboard();
  const { data: updates } = useRegulatoryUpdates();

  const m = data?.metrics;
  const cr = data?.continue_review;

  return (
    <div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {/* Hero — Secretariat Architecture with AI Intelligence */}
          <div className="relative overflow-hidden rounded-2xl border border-line bg-surface shadow-xs">
            {/* Building image — right side with gentle gradient blend */}
            <div className="pointer-events-none absolute inset-y-0 right-0 w-[52%] overflow-hidden">
              <img
                src="/assets/hero/secretariat-building.webp"
                alt=""
                className="h-full w-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/75 to-transparent" />
            </div>

            <div className="relative z-10 px-6 pb-6 pt-5 sm:px-8 sm:pb-8 sm:pt-6">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">
                  AI-Powered · Standards-Driven · For a Stronger Bharat
                </span>
              </div>
              <h1 className="mt-3 max-w-lg font-display text-2xl font-bold leading-tight tracking-tight text-ink sm:text-[2rem]">
                Procurement intelligence,<br />
                without the <span className="text-saffron">guesswork.</span>
              </h1>
              <p className="mt-2.5 max-w-md text-sm leading-relaxed text-muted">
                Upload a tender and MORPHEUS identifies applicable standards,
                maps requirements, and surfaces the issues that need review.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Link
                  to="/analyses/new"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
                >
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                    <path d="M10 3v14M3 10h14" strokeLinecap="round" />
                  </svg>
                  <span>Analyze New Tender</span>
                  <span aria-hidden>→</span>
                </Link>
                <Link
                  to="/help"
                  className="inline-flex items-center gap-2 rounded-xl border border-line bg-white/80 px-5 py-2.5 text-sm font-semibold text-ink shadow-xs backdrop-blur hover:bg-panel hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-primary">
                    <path d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM9 6l5 4-5 4V6z" />
                  </svg>
                  <span>Watch How It Works</span>
                </Link>
              </div>

              {/* Quote overlay on the right */}
              <div className="pointer-events-none absolute right-6 top-5 z-20 hidden max-w-[210px] text-right lg:block">
                <p className="font-serif text-sm italic leading-snug text-ink/70">
                  "Standards build trust.<br />Trust builds a stronger nation."
                </p>
                <p className="mt-1 text-[10px] font-semibold text-muted">— Government of India</p>
              </div>
            </div>
          </div>

          {/* Attention + Tender Transformation — side-by-side solid cards */}
          {isLoading ? (
            <div className="grid gap-5 lg:grid-cols-2">
              <Skeleton className="h-72" />
              <Skeleton className="h-72" />
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {data && <AttentionSummary a={data.attention} />}
              {cr && <TenderTransformation cr={cr} />}
              {!cr && data && (
                <Card className="flex flex-col items-center justify-center p-8 text-center border-dashed">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary mb-3">
                    <StepIcon name="doc" />
                  </div>
                  <h4 className="text-sm font-bold text-ink">No Active Case In Progress</h4>
                  <p className="mt-1 text-xs text-muted max-w-xs">
                    Upload a technical tender document to initiate automatic IS/BIS clause alignment and gap detection.
                  </p>
                  <Link
                    to="/analyses/new"
                    className="mt-4 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-primary-dark transition-all cursor-pointer"
                  >
                    Start New Analysis
                  </Link>
                </Card>
              )}
            </div>
          )}

          {/* KPI Metrics — Solid, Gradients, Contextual Micro-Badges */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {isLoading || !m ? (
              <>
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </>
            ) : (
              <>
                <Metric
                  icon="doc"
                  tone="success"
                  value={m.tenders_analyzed.value}
                  label="Tenders Analyzed"
                  delta={m.tenders_analyzed.delta}
                  badge="Live Sync"
                  sub="Active procurement dossiers"
                />
                <Metric
                  icon="book"
                  tone="info"
                  value={m.standards_mapped.value}
                  label="Standards Mapped"
                  delta={m.standards_mapped.delta}
                  badge="BIS 2026"
                  sub="Cross-referenced IS codes"
                />
                <Metric
                  icon="warn"
                  tone="danger"
                  value={m.issues_detected.value}
                  label="Issues Detected"
                  delta={m.issues_detected.delta}
                  deltaUp
                  badge="Action Req."
                  sub="Gaps & outdated references"
                />
                <Metric
                  icon="clock"
                  tone="warning"
                  value={m.pending_reviews.value}
                  label="Pending Reviews"
                  delta={m.pending_reviews.delta}
                  deltaDown
                  badge="Queue Active"
                  sub="Awaiting reviewer sign-off"
                />
              </>
            )}
          </div>

          {/* Recent Analyses + Standards Coverage */}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_310px]">
            {/* Recent analyses list */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-base font-bold text-ink">Recent Analyses</h2>
                  <p className="text-xs text-muted">Latest procurement tenders processed through MORPHEUS</p>
                </div>
                <Link
                  to="/history"
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  <span>View All Submissions</span>
                  <span>→</span>
                </Link>
              </div>

              {isLoading ? (
                <div className="space-y-2.5">
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                </div>
              ) : !(data?.recent ?? []).length ? (
                <EmptyAnalyses />
              ) : (
                <div className="space-y-2.5">
                  {(data?.recent ?? []).slice(0, 5).map((a) => (
                    <AnalysisCard key={a.id} a={a} />
                  ))}
                </div>
              )}
            </div>

            {/* Standards Coverage — Enriched with summary badge & gradient bars */}
            <Card className="self-start p-5 shadow-xs border border-line">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-sm font-bold text-ink">Standards Coverage</h2>
                  <p className="text-[10px] text-muted">Technical parameter breakdown</p>
                </div>
                <Link to="/standards" className="text-[11px] font-semibold text-primary hover:underline">
                  View Details →
                </Link>
              </div>

              {/* Aggregate Score Pill */}
              <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-white">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-ink">Mandatory BIS Alignment</div>
                    <div className="text-[10px] text-muted">6 Key Parameter Categories</div>
                  </div>
                </div>
                <span className="rounded-lg bg-primary/10 px-2 py-0.5 text-xs font-extrabold text-primary">
                  69% Avg
                </span>
              </div>

              {data?.coverage_bars?.length ? (
                <div className="space-y-3">
                  {data.coverage_bars.map((b) => {
                    const isHigh = b.pct >= 80;
                    const isMid = b.pct >= 60;
                    return (
                      <div key={b.label} className="group">
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className="font-medium text-ink capitalize flex items-center gap-1.5">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isHigh ? "bg-emerald-500" : isMid ? "bg-amber-500" : "bg-rose-500"
                              }`}
                            />
                            {b.label.replace(/_/g, " ")}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`rounded-md px-1.5 py-0.2 text-[10px] font-bold ${
                                isHigh
                                  ? "bg-emerald-50 text-emerald-700"
                                  : isMid
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-rose-50 text-rose-700"
                              }`}
                            >
                              {isHigh ? "Full" : isMid ? "Moderate" : "Partial"}
                            </span>
                            <span className="font-bold tabular-nums text-ink">{b.pct}%</span>
                          </div>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-panel p-0.5">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isHigh
                                ? "bg-gradient-to-r from-emerald-500 to-emerald-600"
                                : isMid
                                ? "bg-gradient-to-r from-amber-400 to-amber-500"
                                : "bg-gradient-to-r from-rose-500 to-amber-500"
                            }`}
                            style={{ width: `${b.pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted">No coverage data yet.</p>
              )}

              {/* Explanatory Footer */}
              <div className="mt-4 border-t border-line/70 pt-3">
                <p className="text-[10px] text-muted leading-tight">
                  Audited against national standards catalog. 4 categories require additional technical specification clauses.
                </p>
              </div>
            </Card>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          {/* Quick Actions Card */}
          <Card className="p-5 shadow-xs border border-line">
            <div className="mb-3.5 flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-bold text-ink">Quick Actions</h2>
                <p className="text-[11px] text-muted">Frequently used procurement workflows</p>
              </div>
              <span className="rounded-full bg-panel px-2 py-0.5 text-[10px] font-semibold text-muted">Portal</span>
            </div>
            <div className="space-y-2.5">
              <QuickAction
                to="/analyses/new"
                icon="doc"
                tone="bg-primary/10 text-primary border border-primary/20"
                title="Analyze new tender"
                sub="Upload document to identify standards"
              />
              <QuickAction
                to="/standards"
                icon="book"
                tone="bg-saffron/10 text-saffron border border-saffron/20"
                title="Explore standards"
                sub="Search 35,000+ Indian Standards"
              />
              <QuickAction
                to="/regulatory-updates"
                icon="chat"
                tone="bg-success/10 text-success border border-success/20"
                title="Regulatory updates"
                sub="Gazette orders & QCO amendments"
              />
              <QuickAction
                to="/help"
                icon="book"
                tone="bg-blue-50 text-blue-700 border border-blue-200"
                title="User guide & tutorials"
                sub="Learn how MORPHEUS processes bids"
              />
            </div>
          </Card>

          {/* Latest Regulatory Updates */}
          <Card className="p-5 shadow-xs border border-line">
            <div className="mb-3.5 flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-bold text-ink">Regulatory Gazette</h2>
                <p className="text-[11px] text-muted">Ministry notifications & QCO alerts</p>
              </div>
              <Link to="/regulatory-updates" className="text-xs font-semibold text-primary hover:underline">
                View All →
              </Link>
            </div>
            <div className="space-y-3">
              {(updates ?? []).slice(0, 4).map((u, i) => (
                <Link
                  key={i}
                  to="/regulatory-updates"
                  className="group flex gap-3 rounded-xl border border-transparent p-2 transition-all hover:bg-panel hover:border-line"
                >
                  <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20 transition-transform group-hover:scale-105">
                    <StepIcon name="doc" small />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-ink leading-snug group-hover:text-primary transition-colors">
                      {u.headline}
                    </span>
                    <span className="block truncate text-[11px] text-muted mt-0.5">{u.detail}</span>
                  </span>
                  <span className="flex-none font-tech text-[10px] text-muted whitespace-nowrap self-start mt-0.5">
                    {u.date ? new Date(u.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""}
                  </span>
                </Link>
              ))}
              {!updates?.length && <p className="text-xs text-muted">No updates on file.</p>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Metric Tile (Solid, Substantive, Contextual) ─────────── */

const METRIC_THEME: Record<string, { bg: string; border: string; accent: string; iconBg: string; text: string }> = {
  success: {
    bg: "bg-gradient-to-br from-surface via-surface to-emerald-50/40",
    border: "border-emerald-200/60 hover:border-emerald-500/50",
    accent: "bg-emerald-600",
    iconBg: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    text: "text-emerald-700",
  },
  info: {
    bg: "bg-gradient-to-br from-surface via-surface to-teal-50/40",
    border: "border-teal-200/60 hover:border-teal-500/50",
    accent: "bg-teal-600",
    iconBg: "bg-teal-100 text-teal-700 border border-teal-200",
    text: "text-teal-700",
  },
  danger: {
    bg: "bg-gradient-to-br from-surface via-surface to-rose-50/40",
    border: "border-rose-200/60 hover:border-rose-500/50",
    accent: "bg-rose-600",
    iconBg: "bg-rose-100 text-rose-700 border border-rose-200",
    text: "text-rose-700",
  },
  warning: {
    bg: "bg-gradient-to-br from-surface via-surface to-amber-50/40",
    border: "border-amber-200/60 hover:border-amber-500/50",
    accent: "bg-amber-500",
    iconBg: "bg-amber-100 text-amber-700 border border-amber-200",
    text: "text-amber-700",
  },
};

function Metric({
  icon,
  tone,
  value,
  label,
  delta,
  deltaUp,
  deltaDown,
  badge,
  sub,
}: {
  icon: string;
  tone: Tone;
  value: number;
  label: string;
  delta: number | null;
  deltaUp?: boolean;
  deltaDown?: boolean;
  badge?: string;
  sub?: string;
}) {
  const t = METRIC_THEME[tone] ?? METRIC_THEME.info;
  return (
    <div
      className={`group relative cursor-default overflow-hidden rounded-2xl border ${t.border} ${t.bg} p-4 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md`}
    >
      {/* Permanent colored top accent strip */}
      <div className={`absolute left-0 top-0 h-1 w-full ${t.accent}`} />

      {/* Top Header Row with Icon and Badge */}
      <div className="flex items-center justify-between">
        <span className={`grid h-10 w-10 place-items-center rounded-xl shadow-xs transition-transform duration-200 group-hover:scale-105 ${t.iconBg}`}>
          <StepIcon name={icon} small />
        </span>
        {badge && (
          <span className="rounded-full bg-surface/90 border border-line px-2 py-0.5 text-[10px] font-bold text-muted shadow-2xs">
            {badge}
          </span>
        )}
      </div>

      {/* Large Bold Metric Number */}
      <div className="mt-3">
        <div className="text-3xl font-extrabold tabular-nums tracking-tight text-ink">{value}</div>
        <div className="text-xs font-bold text-ink mt-0.5">{label}</div>
        {sub && <div className="text-[10px] text-muted leading-tight mt-0.5">{sub}</div>}
      </div>

      {/* Bottom Delta Trend Pill */}
      {delta != null && delta !== 0 && (
        <div className="mt-2.5 pt-2 border-t border-line/60 flex items-center justify-between">
          <span
            className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
              deltaDown ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {deltaDown ? "↓" : "↑"} {deltaUp || !deltaDown ? "+" : "-"}{Math.abs(delta)}
          </span>
          <span className="text-[10px] text-muted">vs last month</span>
        </div>
      )}
    </div>
  );
}

/* ─────────── Attention Card (Substantive, Urgent, Actionable) ─────────── */

function AttentionSummary({ a }: { a: { conflicts: number; gaps: number; outdated: number; total: number } }) {
  const rows = [
    {
      n: a.conflicts,
      label: "Specification conflicts",
      sub: "Requirements with conflicting standards or parameters",
      dot: "bg-rose-500",
      pill: "bg-rose-100 text-rose-800 border-rose-200",
      icon: "warn",
    },
    {
      n: a.gaps,
      label: "Potential gaps",
      sub: "Requirements without matching Indian Standards",
      dot: "bg-amber-500",
      pill: "bg-amber-100 text-amber-800 border-amber-200",
      icon: "clock",
    },
    {
      n: a.outdated,
      label: "Outdated references",
      sub: "References to superseded or withdrawn standards",
      dot: "bg-saffron",
      pill: "bg-orange-100 text-orange-800 border-orange-200",
      icon: "doc",
    },
  ].filter((r) => r.n > 0);

  return (
    <Card className="flex flex-col p-5 shadow-xs border border-line bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-ping" />
          <h3 className="font-display text-sm font-bold text-ink">Needs Your Attention</h3>
        </div>
        <Link to="/history" className="text-[11px] font-semibold text-primary hover:underline">
          View All {a.total} →
        </Link>
      </div>

      {/* Main Metric & Breakdown Track */}
      <div className="mt-3 rounded-xl border border-amber-200/80 bg-amber-50/40 p-3.5">
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-extrabold tabular-nums text-ink">{a.total}</span>
            <span className="text-xs font-semibold text-amber-900">items flagged for review</span>
          </div>
          <span className="rounded-full bg-amber-200/60 px-2 py-0.5 text-[10px] font-bold text-amber-900">
            Action Required
          </span>
        </div>

        {/* Visual Segmented Urgency Bar */}
        <div className="mt-2.5 flex h-2 w-full overflow-hidden rounded-full bg-amber-200/50 p-0.5 gap-0.5">
          {a.gaps > 0 && (
            <div
              className="h-full rounded-full bg-amber-500 transition-all"
              style={{ width: `${(a.gaps / a.total) * 100}%` }}
              title={`${a.gaps} Potential Gaps`}
            />
          )}
          {a.outdated > 0 && (
            <div
              className="h-full rounded-full bg-orange-500 transition-all"
              style={{ width: `${(a.outdated / a.total) * 100}%` }}
              title={`${a.outdated} Outdated References`}
            />
          )}
          {a.conflicts > 0 && (
            <div
              className="h-full rounded-full bg-rose-500 transition-all"
              style={{ width: `${(a.conflicts / a.total) * 100}%` }}
              title={`${a.conflicts} Conflicts`}
            />
          )}
        </div>

        <div className="mt-1.5 flex items-center justify-between text-[10px] text-amber-900 font-medium">
          <span>{a.gaps} Standards Gaps</span>
          <span>{a.outdated} Outdated Codes</span>
        </div>
      </div>

      {/* Detailed Cardlet Rows */}
      <div className="mt-3.5 space-y-2.5 flex-1">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted">
            All tender requirements comply with active Indian Standards.
          </div>
        ) : (
          rows.map((r) => (
            <Link
              key={r.label}
              to="/history"
              className="group flex items-center gap-3 rounded-xl border border-line/70 bg-panel/40 p-2.5 transition-all hover:bg-surface hover:border-amber-400/60 hover:shadow-xs cursor-pointer"
            >
              <span className={`grid h-8 w-8 flex-none place-items-center rounded-lg border ${r.pill}`}>
                <StepIcon name={r.icon} small />
              </span>
              <span className="font-display text-lg font-bold tabular-nums text-ink">{r.n}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold text-ink group-hover:text-primary transition-colors">
                  {r.label}
                </span>
                <span className="block truncate text-[10px] text-muted mt-0.5">{r.sub}</span>
              </span>
              <span className="rounded-md bg-surface border border-line/60 px-2 py-0.5 text-[10px] font-semibold text-muted group-hover:text-primary group-hover:border-primary/40 transition-all">
                Resolve ›
              </span>
            </Link>
          ))
        )}
      </div>

      {/* Solid Informative Action Footer */}
      <div className="mt-4 border-t border-line/80 pt-3">
        <Link
          to="/history"
          className="flex items-center justify-center gap-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-300/60 py-2.5 px-3 text-xs font-bold transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
        >
          <span>Resolve Flagged Items Before GeM Dispatch</span>
          <span>→</span>
        </Link>
      </div>
    </Card>
  );
}

/* ─────────── Tender Transformation (Rich Dossier & Connected Stepper) ─────────── */

const PIPELINE = [
  { step: 1, label: "Tender\nDocument", status: "Uploaded", state: "done" },
  { step: 2, label: "Extracted\nRequirements", status: "72 items", state: "done" },
  { step: 3, label: "Matched\nIS Standards", status: "In review", state: "active" },
  { step: 4, label: "Validation\n& Gap Audit", status: "7 issues", state: "warning" },
  { step: 5, label: "Executive\nReport", status: "Pending", state: "pending" },
];

function TenderTransformation({ cr }: { cr: NonNullable<import("@/lib/morpheus").DashboardSummary["continue_review"]> }) {
  const pct = cr.compliance_pct ?? 15;
  const reqs = cr.requirements_total ?? 72;

  return (
    <Card className="flex flex-col p-5 shadow-xs border border-line bg-surface">
      {/* Dossier Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary border border-primary/20">
            Active Dossier
          </span>
          <span className="text-xs font-semibold text-ink">Transformation Pipeline</span>
        </div>
        <Link to={`/analyses/${cr.id}`} className="text-[11px] font-semibold text-primary hover:underline">
          Open Workspace →
        </Link>
      </div>

      {/* Active File Cardlet */}
      <div className="mt-3 rounded-xl border border-line/80 bg-panel/50 p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-danger-soft text-danger border border-danger/20 shadow-2xs">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M4 2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7l-5-5H4zm6 1.5L14.5 8H11a1 1 0 0 1-1-1V3.5z" />
            </svg>
          </span>
          <div className="min-w-0">
            <div className="truncate text-xs font-bold text-ink" title={cr.title}>
              {cr.title}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="rounded-md bg-amber-100 border border-amber-200 px-1.5 py-0.2 text-[9px] font-bold capitalize text-amber-800">
                {cr.sector || "Electrical"}
              </span>
              <span className="rounded-md bg-surface border border-line px-1.5 py-0.2 text-[9px] font-bold text-muted">
                {cr.workflow_status ? cr.workflow_status.replace(/_/g, " ") : "Draft Processing"}
              </span>
            </div>
          </div>
        </div>
        <span className="flex-none rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
          Stage 2 Active
        </span>
      </div>

      {/* Connected Interactive Stepper Rail */}
      <div className="mt-4 relative px-1">
        {/* Background connector track line */}
        <div className="absolute top-4 left-6 right-6 h-0.5 bg-line -z-0" />
        <div
          className="absolute top-4 left-6 h-0.5 bg-primary transition-all duration-500 -z-0"
          style={{ width: "38%" }}
        />

        <div className="relative z-10 flex items-start justify-between">
          {PIPELINE.map((p, i) => {
            const isDone = p.state === "done";
            const isActive = p.state === "active";
            const isWarn = p.state === "warning";
            return (
              <div key={i} className="flex flex-col items-center text-center max-w-[58px]">
                <div
                  className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold transition-all shadow-xs ${
                    isDone
                      ? "bg-primary text-white ring-4 ring-primary/10"
                      : isActive
                      ? "bg-surface border-2 border-primary text-primary ring-4 ring-primary/20"
                      : isWarn
                      ? "bg-amber-100 border border-amber-300 text-amber-800"
                      : "bg-surface border border-line text-muted"
                  }`}
                >
                  {isDone ? (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span>{p.step}</span>
                  )}
                </div>
                <span className="mt-1.5 whitespace-pre-line text-[9px] font-medium leading-tight text-ink">
                  {p.label}
                </span>
                <span
                  className={`mt-0.5 text-[8px] font-bold leading-none ${
                    isDone ? "text-primary" : isWarn ? "text-amber-700" : "text-muted"
                  }`}
                >
                  {p.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transformation Progress Track */}
      <div className="mt-4 pt-3 border-t border-line/70">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-semibold text-ink">Overall Transformation Progress</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted">Audit Readiness</span>
            <span className="rounded-md bg-emerald-50 px-1.5 py-0.2 font-extrabold text-xs text-emerald-700 tabular-nums">
              {pct}%
            </span>
          </div>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-panel p-0.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Structured Solid Stat Matrix + Primary CTA */}
      <div className="mt-4 grid grid-cols-4 gap-2 rounded-xl bg-panel/40 border border-line/80 p-2.5 text-center">
        <div>
          <div className="text-sm font-extrabold tabular-nums text-ink">{reqs}</div>
          <div className="text-[9px] font-medium text-muted">Clauses</div>
        </div>
        <div>
          <div className="text-sm font-extrabold tabular-nums text-primary">26</div>
          <div className="text-[9px] font-medium text-muted">IS Standards</div>
        </div>
        <div>
          <div className="text-sm font-extrabold tabular-nums text-amber-700">{cr.open_issues}</div>
          <div className="text-[9px] font-medium text-muted">Flagged Gaps</div>
        </div>
        <div>
          <div className="text-sm font-extrabold tabular-nums text-emerald-700">{pct}%</div>
          <div className="text-[9px] font-medium text-muted">Coverage</div>
        </div>
      </div>

      <div className="mt-3">
        <Link
          to={`/analyses/${cr.id}`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 px-4 text-xs font-bold text-white shadow-xs transition-all hover:bg-primary-dark hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
        >
          <span>Continue Tender Analysis</span>
          <span>→</span>
        </Link>
      </div>
    </Card>
  );
}

/* ─────────── Shared Sub-components ─────────── */

function QuickAction({
  to,
  icon,
  tone,
  title,
  sub,
}: {
  to: string;
  icon: string;
  tone: string;
  title: string;
  sub: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xs cursor-pointer"
    >
      <span className={`grid h-9 w-9 flex-none place-items-center rounded-xl transition-transform duration-200 group-hover:scale-110 shadow-2xs ${tone}`}>
        <StepIcon name={icon} small />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold text-ink transition-colors group-hover:text-primary">
          {title}
        </span>
        <span className="block truncate text-[11px] text-muted mt-0.5">{sub}</span>
      </span>
      <span className="text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary font-bold">
        ›
      </span>
    </Link>
  );
}

function StepIcon({ name, small }: { name: string; small?: boolean }) {
  const paths: Record<string, string> = {
    doc: "M7 3h7l5 5v13H7zM14 3v5h5",
    book: "M4 5a2 2 0 0 1 2-2h11v16H6a2 2 0 0 0-2 2z",
    warn: "M12 3 2 20h20zM12 9v5M12 17h.01",
    explain: "M4 5h16v11H8l-4 4z",
    report: "M12 3a9 9 0 1 0 9 9h-9z",
    clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 7v5l3 2",
    chat: "M4 5h16v11H9l-5 4z",
    standard: "M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9l-6-6zM9 3v6h6M9 13h6M9 17h3",
  };
  const c = small ? "h-4 w-4" : "h-5 w-5";
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={c}>
      <path d={paths[name] ?? paths.doc} />
    </svg>
  );
}

type RecentRow = import("@/lib/morpheus").DashboardSummary["recent"][number];

function AnalysisCard({ a }: { a: RecentRow }) {
  const v = VERDICT[a.verdict] ?? VERDICT.PENDING;
  const sector = (a.sector || "").toLowerCase();
  const to = a.status === "READY" ? `/analyses/${a.id}` : `/analyses/${a.id}/processing`;

  return (
    <Link
      to={to}
      className="group flex items-center gap-3.5 rounded-xl border border-line bg-surface p-3.5 shadow-2xs transition-all hover:border-primary/40 hover:bg-panel/40 hover:shadow-xs hover:-translate-y-0.5 cursor-pointer"
    >
      {/* Sector Document Icon Badge */}
      <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20 transition-transform group-hover:scale-105 shadow-2xs">
        <StepIcon name="doc" />
      </span>

      {/* Main Info */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-bold text-ink group-hover:text-primary transition-colors">
          {a.title}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted">
          <span className="truncate max-w-[140px] font-mono">{a.filename || a.id.slice(0, 12)}</span>
          <span aria-hidden>·</span>
          <span className="font-tech whitespace-nowrap flex-none">
            {a.created_at
              ? new Date(a.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
              : "Recently added"}
          </span>
        </div>
      </div>

      {/* Sector Pill */}
      {a.sector && a.sector !== "—" && (
        <span
          className={`hidden rounded-md border px-2 py-0.5 text-[10px] font-bold capitalize sm:inline ${
            SECTOR_PILL[sector] ?? "bg-panel text-muted border-line"
          }`}
        >
          {a.sector}
        </span>
      )}

      {/* Status Pill */}
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${v.cls}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${v.dot}`} />
        <span>{v.label}</span>
      </span>

      {/* Action Chevron */}
      <span className="text-muted transition-transform group-hover:translate-x-1 group-hover:text-primary font-bold">
        ›
      </span>
    </Link>
  );
}

function EmptyAnalyses() {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface px-6 py-10 text-center">
      <img src="/assets/morpheus/empty-analysis.svg" alt="" className="h-28 w-auto opacity-90" />
      <div className="mt-4 text-sm font-bold text-ink">No analyses on file yet</div>
      <p className="mt-1 max-w-sm text-xs text-muted">
        Upload a tender specification to identify applicable standards, map requirements, and surface issues for review.
      </p>
      <Link
        to="/analyses/new"
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-primary-dark transition-all cursor-pointer"
      >
        <span>Analyze New Tender</span>
        <span>→</span>
      </Link>
    </div>
  );
}
