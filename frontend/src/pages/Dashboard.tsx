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

const STEPS = [
  { n: 1, icon: "doc", tone: "bg-success-soft text-success", title: "Understand", desc: "Extract requirements from your document" },
  { n: 2, icon: "book", tone: "bg-success-soft text-success", title: "Map Standards", desc: "Find applicable Indian Standards" },
  { n: 3, icon: "warn", tone: "bg-danger-soft text-danger", title: "Validate", desc: "Detect gaps, conflicts and outdated references" },
  { n: 4, icon: "explain", tone: "bg-primary-soft text-primary", title: "Explain", desc: "Get evidence and rationale for every match" },
  { n: 5, icon: "report", tone: "bg-warning-soft text-warning", title: "Report", desc: "Generate a comprehensive review report" },
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function DashboardPage() {
  const { data, isLoading } = useDashboard();
  const { data: updates } = useRegulatoryUpdates();
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const m = data?.metrics;

  return (
    <div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {/* Hero */}
          <div className="overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="relative p-6 sm:p-8">
              {/* subtle procurement illustration on the right (supplied asset) */}
              <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[44%] items-center justify-end overflow-hidden rounded-r-2xl lg:flex">
                <img src="/assets/morpheus/hero-procurement.svg" alt="" className="h-[112%] w-auto object-contain opacity-90" />
                <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/50 to-transparent" />
              </div>

              <div className="relative z-10 max-w-xl">
                <div className="text-xs font-medium text-muted">{greeting()} · <span className="font-tech">{today}</span></div>
                <h1 className="mt-2 font-display text-2xl font-semibold leading-tight tracking-tight text-ink sm:text-3xl">
                  Procurement intelligence, without the guesswork.
                </h1>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
                  Upload a tender and MORPHEUS identifies applicable standards, maps requirements, and surfaces the
                  issues that need review.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link to="/analyses/new"
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark">
                    Analyze New Tender
                  </Link>
                  <Link to="/history"
                    className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-ink hover:bg-panel">
                    My Analyses
                  </Link>
                </div>
              </div>
            </div>

            {/* Process strip */}
            <div className="grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-3 lg:grid-cols-5">
              {STEPS.map((s) => (
                <div key={s.n} className="group flex items-start gap-2.5 bg-surface p-4 transition-colors hover:bg-panel/50">
                  <span className={`grid h-8 w-8 flex-none place-items-center rounded-lg transition-transform duration-200 group-hover:scale-110 ${s.tone}`}>
                    <StepIcon name={s.icon} small />
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="grid h-4 w-4 place-items-center rounded-full bg-primary text-[9px] font-bold text-white">{s.n}</span>
                      <span className="text-xs font-semibold text-ink">{s.title}</span>
                    </div>
                    <div className="mt-0.5 text-[11px] leading-snug text-muted">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Attention + Continue review */}
          {data && (data.attention.total > 0 || data.continue_review) && (
            <div className="grid gap-4 lg:grid-cols-2">
              <AttentionSummary a={data.attention} />
              {data.continue_review && <ContinueReview cr={data.continue_review} />}
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

          {/* Recent analyses — the dominant working section */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-ink">Recent analyses</h2>
              <Link to="/history" className="text-xs font-medium text-primary hover:underline">View all →</Link>
            </div>
            {isLoading ? (
              <div className="space-y-2"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
            ) : !(data?.recent ?? []).length ? (
              <EmptyAnalyses />
            ) : (
              <div className="space-y-2">
                {(data?.recent ?? []).slice(0, 6).map((a) => <AnalysisCard key={a.id} a={a} />)}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-3 font-display text-base font-semibold text-ink">Quick actions</h2>
            <div className="space-y-2">
              <QuickAction to="/analyses/new" icon="doc" tone="bg-primary-soft text-primary" title="Analyze new tender" sub="Upload a document to review" />
              <QuickAction to="/standards" icon="book" tone="bg-saffron-soft text-saffron" title="Explore standards" sub="Search the Indian Standards catalogue" />
              <QuickAction to="/regulatory-updates" icon="chat" tone="bg-success-soft text-success" title="Regulatory updates" sub="Latest amendments & QCO" />
              <QuickAction to="/help" icon="book" tone="bg-blue-100 text-blue-700" title="User guide" sub="Learn how MORPHEUS works" />
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-ink">Latest regulatory updates</h2>
              <Link to="/regulatory-updates" className="text-xs font-medium text-primary hover:underline">View all →</Link>
            </div>
            <div className="space-y-3">
              {(updates ?? []).slice(0, 3).map((u, i) => (
                <Link key={i} to="/regulatory-updates" className="flex gap-2.5 rounded-lg hover:bg-panel">
                  <span className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-primary-soft text-primary"><StepIcon name="doc" small /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-ink">{u.headline}</span>
                    <span className="block truncate text-[11px] text-muted">{u.detail}</span>
                  </span>
                  <span className="flex-none font-tech text-[10px] text-muted">{u.date ? new Date(u.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""}</span>
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
      className={`group relative cursor-default overflow-hidden rounded-2xl border border-line bg-surface p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_-10px_var(--glow),0_0_0_1.5px_var(--glow)] ${s.ring}`}
      style={{ "--glow": s.glow } as React.CSSProperties}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
    >
      {/* cursor-tracking sheen */}
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: "radial-gradient(200px circle at var(--mx,50%) var(--my,0), var(--glow), transparent 60%)" }} />
      {/* top accent bar grows on hover */}
      <div className={`absolute left-0 top-0 h-1 w-0 ${s.accent} transition-all duration-300 group-hover:w-full`} />

      <div className="relative">
        <span className={`grid h-10 w-10 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${s.tile}`}>
          <StepIcon name={icon} />
        </span>
        <div className="mt-3 text-3xl font-bold tabular-nums text-ink">{value}</div>
        <div className="text-xs text-muted">{label}</div>
        {delta != null && delta !== 0 && (
          <div className={`mt-1 text-[11px] font-medium ${deltaDown ? "text-danger" : "text-success"}`}>
            {deltaDown ? "↓" : "↑"} {deltaUp || !deltaDown ? "+" : "-"}{Math.abs(delta)} this month
          </div>
        )}
      </div>
    </div>
  );
}

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
  };
  const c = small ? "h-4 w-4" : "h-5 w-5";
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={c}>
      <path d={paths[name] ?? paths.doc} />
    </svg>
  );
}

function AttentionSummary({ a }: { a: { conflicts: number; gaps: number; outdated: number; total: number } }) {
  const rows = [
    { n: a.conflicts, label: "specification conflicts", dot: "bg-danger", to: "/history" },
    { n: a.gaps, label: "potential gaps", dot: "bg-warning", to: "/history" },
    { n: a.outdated, label: "outdated references", dot: "bg-amber-400", to: "/history" },
  ].filter((r) => r.n > 0);
  return (
    <div className="relative overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-sm"
      style={{ boxShadow: "0 1px 2px rgba(16,24,40,.04), 0 0 0 4px rgba(220,38,38,.03)" }}>
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">Needs your attention</div>
      <div className="font-display text-3xl font-bold tabular-nums text-ink">{a.total}<span className="ml-2 text-base font-medium text-muted">item{a.total === 1 ? "" : "s"}</span></div>
      <div className="mt-4 space-y-2">
        {rows.length === 0 ? (
          <div className="text-sm text-muted">Nothing needs attention right now.</div>
        ) : rows.map((r) => (
          <Link key={r.label} to={r.to} className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-panel">
            <span className={`h-2.5 w-2.5 flex-none rounded-full ${r.dot}`} />
            <span className="text-lg font-semibold tabular-nums text-ink">{r.n}</span>
            <span className="text-sm text-muted">{r.label}</span>
            <span className="ml-auto text-muted">→</span>
          </Link>
        ))}
      </div>
    </div>
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
      {a.compliance_pct != null && (
        <span className="hidden text-xs text-muted md:inline"><span className="font-semibold tabular-nums text-ink">{a.compliance_pct}%</span> covered</span>
      )}
      <span className="hidden font-tech text-[11px] text-muted lg:inline">
        {a.created_at ? new Date(a.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : ""}
      </span>
      <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${v.cls}`}>{v.label}</span>
      <span className="text-muted transition-transform group-hover:translate-x-0.5" aria-hidden>→</span>
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

function ContinueReview({ cr }: { cr: NonNullable<import("@/lib/morpheus").DashboardSummary["continue_review"]> }) {
  return (
    <Link to={`/analyses/${cr.id}`}
      className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-sm transition-shadow hover:shadow-md"
      style={{ boxShadow: "0 1px 2px rgba(16,24,40,.04), 0 0 0 4px rgba(11,93,59,.03)" }}>
      <div>
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">Continue review</div>
        <div className="font-display text-lg font-semibold text-ink">{cr.title}</div>
        <div className="mt-0.5 text-xs capitalize text-muted">{cr.sector} · {cr.workflow_status.replace("_", " ").toLowerCase()}</div>
      </div>
      <div className="mt-4 flex items-center gap-4 text-sm">
        <span><span className="font-semibold tabular-nums text-ink">{cr.requirements_total ?? "—"}</span> <span className="text-muted">requirements</span></span>
        <span><span className="font-semibold tabular-nums text-ink">{cr.open_issues}</span> <span className="text-muted">open issues</span></span>
        {cr.compliance_pct != null && <span><span className="font-semibold tabular-nums text-ink">{cr.compliance_pct}%</span> <span className="text-muted">covered</span></span>}
        <span className="ml-auto font-medium text-primary group-hover:underline">Continue →</span>
      </div>
    </Link>
  );
}
