import { Link } from "react-router-dom";
import { Card, Skeleton, type Tone } from "@/components/ui";
import { useDashboard, useRegulatoryUpdates } from "@/lib/morpheus";

const SECTOR_PILL: Record<string, string> = {
  electrical: "bg-amber-100 text-amber-700", healthcare: "bg-purple-100 text-purple-700",
  it: "bg-blue-100 text-blue-700", construction: "bg-orange-100 text-orange-700",
  water: "bg-sky-100 text-sky-700", mechanical: "bg-emerald-100 text-emerald-700",
  materials: "bg-stone-200 text-stone-700", civil: "bg-teal-100 text-teal-700",
};
const VERDICT: Record<string, { label: string; cls: string }> = {
  READY: { label: "Completed", cls: "bg-success-soft text-success" },
  REVIEW: { label: "In Review", cls: "bg-warning-soft text-warning" },
  ACTION_REQUIRED: { label: "Action Needed", cls: "bg-danger-soft text-danger" },
  PENDING: { label: "Processing", cls: "bg-panel text-muted" },
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
        <div className="space-y-5">
          {/* Hero — building image on right, text on left */}
          <div className="relative overflow-hidden rounded-2xl border border-line bg-surface">
            {/* Building image — right side */}
            <div className="pointer-events-none absolute inset-y-0 right-0 w-[52%] overflow-hidden">
              <img
                src="/assets/hero/secretariat-building.webp"
                alt=""
                className="h-full w-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/70 to-transparent" />
            </div>

            <div className="relative z-10 px-6 pb-6 pt-5 sm:px-8 sm:pb-8 sm:pt-6">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">
                AI-Powered · Standards-Driven · For a Stronger Bharat
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
                <Link to="/analyses/new"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M10 3v14M3 10h14" strokeLinecap="round" /></svg>
                  Analyze New Tender
                  <span aria-hidden>→</span>
                </Link>
                <Link to="/help"
                  className="inline-flex items-center gap-2 rounded-xl border border-line bg-white/80 px-5 py-2.5 text-sm font-semibold text-ink shadow-sm backdrop-blur hover:bg-panel">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-primary"><path d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM9 6l5 4-5 4V6z" /></svg>
                  Watch How It Works
                </Link>
              </div>

              {/* Quote overlay on the right */}
              <div className="pointer-events-none absolute right-6 top-5 z-20 hidden max-w-[200px] text-right lg:block">
                <p className="font-serif text-sm italic leading-snug text-ink/60">
                  "Standards build trust.<br />Trust builds a stronger nation."
                </p>
                <p className="mt-0.5 text-[10px] font-medium text-muted">— Government of India</p>
              </div>
            </div>
          </div>

          {/* Attention + Tender Transformation — side-by-side */}
          {isLoading ? (
            <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-56" /><Skeleton className="h-56" /></div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {data && <AttentionSummary a={data.attention} />}
              {cr && <TenderTransformation cr={cr} />}
              {!cr && data && (
                <Card className="flex flex-col items-center justify-center p-6 text-center">
                  <StepIcon name="doc" />
                  <p className="mt-3 text-sm font-semibold text-ink">No active analysis</p>
                  <p className="mt-1 text-xs text-muted">Upload a tender to get started.</p>
                  <Link to="/analyses/new" className="mt-3 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-dark">
                    New Analysis
                  </Link>
                </Card>
              )}
            </div>
          )}

          {/* KPI metrics */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {isLoading || !m ? (
              <><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></>
            ) : (
              <>
                <Metric icon="doc" tone="success" value={m.tenders_analyzed.value} label="Tenders Analyzed" delta={m.tenders_analyzed.delta} />
                <Metric icon="book" tone="success" value={m.standards_mapped.value} label="Standards Mapped" delta={m.standards_mapped.delta} />
                <Metric icon="warn" tone="danger" value={m.issues_detected.value} label="Issues Detected" delta={m.issues_detected.delta} deltaUp />
                <Metric icon="clock" tone="warning" value={m.pending_reviews.value} label="Pending Reviews" delta={m.pending_reviews.delta} deltaDown />
              </>
            )}
          </div>

          {/* Recent analyses + Standards Coverage */}
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
            {/* Recent analyses list */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-base font-semibold text-ink">Recent Analyses</h2>
                <Link to="/history" className="text-xs font-medium text-primary hover:underline">View All →</Link>
              </div>
              {isLoading ? (
                <div className="space-y-2"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
              ) : !(data?.recent ?? []).length ? (
                <EmptyAnalyses />
              ) : (
                <div className="space-y-2">
                  {(data?.recent ?? []).slice(0, 5).map((a) => <AnalysisCard key={a.id} a={a} />)}
                </div>
              )}
            </div>

            {/* Standards Coverage bars */}
            <Card className="self-start p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-sm font-semibold text-ink">Standards Coverage</h2>
                <Link to="/standards" className="text-[10px] font-medium text-primary hover:underline">View Details →</Link>
              </div>
              {data?.coverage_bars?.length ? (
                <div className="space-y-2.5">
                  {data.coverage_bars.map((b) => (
                    <div key={b.label}>
                      <div className="mb-1 flex items-center justify-between text-[11px]">
                        <span className="text-muted capitalize">{b.label}</span>
                        <span className="font-semibold tabular-nums text-ink">{b.pct}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-panel">
                        <div
                          className={`h-full rounded-full ${b.pct >= 80 ? "bg-success" : b.pct >= 50 ? "bg-warning" : "bg-danger"}`}
                          style={{ width: `${b.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted">No coverage data yet.</p>
              )}
            </Card>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="mb-3 flex items-center justify-between font-display text-base font-semibold text-ink">
              Quick actions <span className="text-muted">›</span>
            </h2>
            <div className="space-y-2">
              <QuickAction to="/analyses/new" icon="doc" tone="bg-primary-soft text-primary" title="Analyze new tender" sub="Upload a document to review" />
              <QuickAction to="/standards" icon="book" tone="bg-saffron-soft text-saffron" title="Explore standards" sub="Search the Indian Standards catalog" />
              <QuickAction to="/regulatory-updates" icon="chat" tone="bg-success-soft text-success" title="Regulatory updates" sub="Latest amendments & QCO" />
              <QuickAction to="/help" icon="book" tone="bg-blue-100 text-blue-700" title="User guide" sub="Learn how MORPHEUS works" />
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-ink">Latest regulatory updates</h2>
              <Link to="/regulatory-updates" className="text-xs font-medium text-primary hover:underline">View All →</Link>
            </div>
            <div className="space-y-3">
              {(updates ?? []).slice(0, 4).map((u, i) => (
                <Link key={i} to="/regulatory-updates" className="flex gap-2.5 rounded-lg p-1 hover:bg-panel">
                  <span className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-primary-soft text-primary"><StepIcon name="doc" small /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-ink leading-snug">{u.headline}</span>
                    <span className="block truncate text-[11px] text-muted">{u.detail}</span>
                  </span>
                  <span className="flex-none font-tech text-[10px] text-muted whitespace-nowrap">{u.date ? new Date(u.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""}</span>
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

/* ─────────── Metric tile ─────────── */

const METRIC_STYLE: Record<string, { tile: string; glow: string; ring: string; accent: string }> = {
  success: { tile: "bg-success-soft text-success", glow: "rgba(22,163,74,0.28)", ring: "hover:border-success/50", accent: "bg-success" },
  danger: { tile: "bg-danger-soft text-danger", glow: "rgba(220,38,38,0.28)", ring: "hover:border-danger/50", accent: "bg-danger" },
  warning: { tile: "bg-warning-soft text-warning", glow: "rgba(245,158,11,0.30)", ring: "hover:border-warning/50", accent: "bg-warning" },
  info: { tile: "bg-primary-soft text-primary", glow: "rgba(11,93,59,0.28)", ring: "hover:border-primary/50", accent: "bg-primary" },
  neutral: { tile: "bg-primary-soft text-primary", glow: "rgba(11,93,59,0.22)", ring: "hover:border-primary/40", accent: "bg-primary" },
};

function Metric({ icon, tone, value, label, delta, deltaUp, deltaDown }: {
  icon: string; tone: Tone; value: number; label: string; delta: number | null; deltaUp?: boolean; deltaDown?: boolean;
}) {
  const s = METRIC_STYLE[tone] ?? METRIC_STYLE.neutral;
  return (
    <div
      className={`group relative cursor-default overflow-hidden rounded-2xl border border-line bg-surface p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${s.ring}`}
      style={{ "--glow": s.glow } as React.CSSProperties}
    >
      <div className={`absolute left-0 top-0 h-0.5 w-0 ${s.accent} transition-all duration-300 group-hover:w-full`} />
      <div className="relative">
        <span className={`grid h-9 w-9 place-items-center rounded-lg transition-transform duration-200 group-hover:scale-105 ${s.tile}`}>
          <StepIcon name={icon} small />
        </span>
        <div className="mt-2 text-2xl font-bold tabular-nums text-ink">{value}</div>
        <div className="text-[11px] text-muted">{label}</div>
        {delta != null && delta !== 0 && (
          <div className={`mt-0.5 text-[10px] font-medium ${deltaDown ? "text-danger" : "text-success"}`}>
            {deltaDown ? "↓" : "↑"} {deltaUp || !deltaDown ? "+" : "-"}{Math.abs(delta)} this month
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────── Attention card ─────────── */

function AttentionSummary({ a }: { a: { conflicts: number; gaps: number; outdated: number; total: number } }) {
  const rows = [
    { n: a.conflicts, label: "Specification conflicts", sub: "Requirements with conflicting standards or parameters", dot: "bg-danger", icon: "warn" },
    { n: a.gaps, label: "Potential gaps", sub: "Requirements without matching Indian Standards", dot: "bg-warning", icon: "clock" },
    { n: a.outdated, label: "Outdated references", sub: "References to superseded or withdrawn standards", dot: "bg-amber-400", icon: "doc" },
  ].filter((r) => r.n > 0);
  return (
    <Card className="flex flex-col p-5">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-ink">Needs Your Attention</h3>
        <Link to="/history" className="text-[10px] font-medium text-primary hover:underline">View All →</Link>
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-display text-3xl font-bold tabular-nums text-ink">{a.total}</span>
        <span className="text-sm text-muted">items</span>
      </div>
      <div className="mt-4 space-y-2.5 flex-1">
        {rows.length === 0 ? (
          <div className="text-sm text-muted">Nothing needs attention right now.</div>
        ) : rows.map((r) => (
          <Link key={r.label} to="/history" className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-panel transition-colors">
            <span className={`grid h-8 w-8 flex-none place-items-center rounded-lg ${r.dot === "bg-danger" ? "bg-danger-soft text-danger" : r.dot === "bg-warning" ? "bg-warning-soft text-warning" : "bg-amber-100 text-amber-600"}`}>
              <StepIcon name={r.icon} small />
            </span>
            <span className="text-lg font-bold tabular-nums text-ink">{r.n}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-ink">{r.label}</span>
              <span className="block text-[10px] leading-snug text-muted">{r.sub}</span>
            </span>
            <span className="text-muted">›</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}

/* ─────────── Tender Transformation pipeline card ─────────── */

const PIPELINE = [
  { icon: "doc", label: "Tender\nDocument", color: "bg-danger-soft text-danger" },
  { icon: "book", label: "Extracted\nRequirements", color: "bg-primary-soft text-primary" },
  { icon: "standard", label: "Matched\nIS Standards", color: "bg-primary-soft text-primary" },
  { icon: "warn", label: "Validation\n& Analysis", color: "bg-warning-soft text-warning" },
  { icon: "report", label: "Review\nReport", color: "bg-success-soft text-success" },
];

function TenderTransformation({ cr }: { cr: NonNullable<import("@/lib/morpheus").DashboardSummary["continue_review"]> }) {
  const pct = cr.compliance_pct ?? 0;
  const reqs = cr.requirements_total ?? 0;
  return (
    <Card className="flex flex-col p-5">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-ink">MORPHEUS Tender Transformation</h3>
        <Link to={`/analyses/${cr.id}`} className="text-[10px] font-medium text-primary hover:underline">View Details →</Link>
      </div>

      {/* Filename + badges */}
      <div className="mt-2 flex items-center gap-2">
        <span className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-danger-soft text-danger">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="M4 2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7l-5-5H4zm6 1.5L14.5 8H11a1 1 0 0 1-1-1V3.5z" /></svg>
        </span>
        <span className="min-w-0 truncate text-xs font-semibold text-ink">{cr.title}</span>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-semibold capitalize text-amber-700">{cr.sector || "—"}</span>
        <span className="rounded-md bg-panel px-2 py-0.5 text-[10px] font-semibold capitalize text-muted">{(cr.workflow_status || "Draft").replace("_", " ")}</span>
      </div>

      {/* Pipeline flow */}
      <div className="mt-4 flex items-start justify-between gap-0.5 overflow-x-auto">
        {PIPELINE.map((step, i) => (
          <div key={i} className="flex items-center gap-0.5">
            <div className="flex flex-col items-center text-center" style={{ minWidth: 48 }}>
              <span className={`grid h-9 w-9 place-items-center rounded-lg ${step.color}`}>
                <StepIcon name={step.icon} small />
              </span>
              <span className="mt-1 whitespace-pre-line text-[9px] leading-tight text-muted">{step.label}</span>
              {/* Counts under relevant steps */}
              {i === 1 && reqs > 0 && <span className="mt-0.5 text-[10px] font-bold text-primary">{reqs} items</span>}
              {i === 3 && cr.open_issues > 0 && <span className="mt-0.5 text-[10px] font-bold text-warning">{cr.open_issues} issues</span>}
            </div>
            {i < PIPELINE.length - 1 && (
              <span className="mx-0.5 mt-2 text-xs text-muted/40">→</span>
            )}
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-[11px]">
          <span className="text-muted">Analysis Progress</span>
          <span className="font-bold tabular-nums text-ink">{pct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-panel">
          <div className="h-full rounded-full bg-success transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Compact stats row + CTA */}
      <div className="mt-3 flex items-center gap-3 border-t border-line pt-3">
        <StatChip v={reqs} l="requirements" />
        <StatChip v={0} l="standards matched" />
        <StatChip v={cr.open_issues} l="open issues" />
        <StatChip v={`${pct}%`} l="coverage" />
        <Link to={`/analyses/${cr.id}`}
          className="ml-auto inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 py-2 text-[11px] font-semibold text-white hover:bg-primary-dark">
          Continue Analysis →
        </Link>
      </div>
    </Card>
  );
}

function StatChip({ v, l }: { v: number | string; l: string }) {
  return (
    <div className="hidden sm:block">
      <div className="text-sm font-bold tabular-nums text-ink">{v}</div>
      <div className="text-[9px] leading-tight text-muted">{l}</div>
    </div>
  );
}

/* ─────────── Shared sub-components ─────────── */

function QuickAction({ to, icon, tone, title, sub }: { to: string; icon: string; tone: string; title: string; sub: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-2xl border border-line px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-panel">
      <span className={`grid h-9 w-9 flex-none place-items-center rounded-lg ${tone}`}><StepIcon name={icon} small /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="block truncate text-[11px] text-muted">{sub}</span>
      </span>
      <span className="text-muted">›</span>
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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={c}>
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
    <Link to={to}
      className="group flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:border-primary/40 hover:bg-panel/40">
      <span className="grid h-10 w-10 flex-none place-items-center rounded-lg bg-primary-soft text-primary">
        <StepIcon name="doc" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-ink">{a.title}</div>
        <div className="truncate text-[11px] text-muted">{a.filename || "—"}</div>
      </div>
      {a.sector && a.sector !== "—" && (
        <span className={`hidden rounded-md px-2 py-0.5 text-[10px] font-semibold capitalize sm:inline ${SECTOR_PILL[sector] ?? "bg-panel text-muted"}`}>{a.sector}</span>
      )}
      <span className="hidden font-tech text-[11px] text-muted lg:inline">
        {a.created_at ? new Date(a.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : ""}
      </span>
      <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${v.cls}`}>{v.label}</span>
      <span className="text-muted transition-transform group-hover:translate-x-0.5" aria-hidden>›</span>
    </Link>
  );
}

function EmptyAnalyses() {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface px-6 py-10 text-center">
      <img src="/assets/morpheus/empty-analysis.svg" alt="" className="h-28 w-auto opacity-90" />
      <div className="mt-4 text-sm font-semibold text-ink">No analyses yet</div>
      <p className="mt-1 max-w-sm text-sm text-muted">Upload a tender specification to identify applicable standards, map requirements, and surface issues for review.</p>
      <Link to="/analyses/new" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark">
        Analyze New Tender
      </Link>
    </div>
  );
}
