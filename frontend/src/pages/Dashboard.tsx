import { Link, useNavigate } from "react-router-dom";
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
  { n: 1, icon: "doc", title: "Understand", desc: "Extract requirements from your document" },
  { n: 2, icon: "book", title: "Map Standards", desc: "Find applicable Indian Standards" },
  { n: 3, icon: "warn", title: "Validate", desc: "Detect gaps, conflicts and outdated references" },
  { n: 4, icon: "explain", title: "Explain", desc: "Get evidence and rationale for every match" },
  { n: 5, icon: "report", title: "Report", desc: "Generate a comprehensive review report" },
];

export function DashboardPage() {
  const navigate = useNavigate();
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
              {/* polished hero graphic (chakra + dome + flag + quote + Viksit Bharat) on right */}
              <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[52%] overflow-hidden rounded-r-2xl lg:block">
                <img src="/brand/hero_v2.png" alt="Viksit Bharat — Standards build trust, trust builds a stronger nation"
                  className="h-full w-full object-cover object-center" />
                <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/20 to-transparent" />
              </div>

              <div className="absolute right-6 top-4 z-10 hidden text-xs text-muted lg:block">{today}</div>

              <div className="relative z-10 max-w-lg">
                <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">
                  AI-Powered · Standards-Driven · For a Stronger Bharat
                </div>
                <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">
                  Smarter Procurement<br />for a Stronger <span className="text-saffron">Ind</span><span className="text-[#138808]">ia</span>
                </h1>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
                  Upload a tender specification and MORPHEUS identifies relevant Indian Standards, detects gaps,
                  ensures compliance, and helps you make better, safer and more transparent procurement decisions.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link to="/analyses/new"
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark">
                    ⬆ Upload a Tender →
                  </Link>
                  <Link to="/help"
                    className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-ink hover:bg-panel">
                    ▶ Watch How It Works
                  </Link>
                </div>
              </div>
            </div>

            {/* Process strip */}
            <div className="grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-3 lg:grid-cols-5">
              {STEPS.map((s) => (
                <div key={s.n} className="flex items-start gap-2.5 bg-surface p-4">
                  <StepIcon name={s.icon} />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-muted">{s.n}</span>
                      <span className="text-xs font-semibold text-ink">{s.title}</span>
                    </div>
                    <div className="mt-0.5 text-[11px] leading-snug text-muted">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

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

          {/* Recent + Coverage */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-base font-semibold text-ink">Recent Analyses</h2>
                <Link to="/history" className="text-xs font-medium text-primary hover:underline">View All →</Link>
              </div>
              {isLoading ? <Skeleton className="h-48" /> : (
                <div className="space-y-1">
                  {(data?.recent ?? []).slice(0, 5).map((a) => {
                    const v = VERDICT[a.verdict] ?? VERDICT.PENDING;
                    const sector = (a.sector || "").toLowerCase();
                    return (
                      <Link key={a.id} to={a.status === "READY" ? `/analyses/${a.id}` : `/analyses/${a.id}/processing`}
                        className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-panel">
                        <span className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-primary-soft text-primary">
                          <StepIcon name="doc" small />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink">{a.title}</span>
                          <span className="block truncate text-[11px] text-muted">{a.filename || a.sector}</span>
                        </span>
                        {a.sector && a.sector !== "—" && (
                          <span className={`hidden rounded-md px-2 py-0.5 text-[10px] font-semibold capitalize sm:inline ${SECTOR_PILL[sector] ?? "bg-panel text-muted"}`}>{a.sector}</span>
                        )}
                        <span className="hidden text-[11px] text-muted md:inline">
                          {a.created_at ? new Date(a.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : ""}
                        </span>
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${v.cls}`}>{v.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-base font-semibold text-ink">Standards Coverage</h2>
                <Link to="/analytics" className="text-xs font-medium text-primary hover:underline">View Details →</Link>
              </div>
              <div className="space-y-2.5">
                {(data?.coverage_bars ?? []).map((c) => (
                  <div key={c.label} className="flex items-center gap-3">
                    <span className="w-24 flex-none text-xs text-ink">{c.label}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-panel">
                      <div className={`h-full rounded-full ${c.pct >= 90 ? "bg-success" : "bg-warning"}`} style={{ width: `${c.pct}%` }} />
                    </div>
                    <span className="w-9 flex-none text-right text-xs font-semibold tabular-nums text-ink">{c.pct}%</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-saffron-soft/60 p-3">
                <span className="text-saffron">💡</span>
                <div>
                  <div className="text-xs font-semibold text-ink">Key Insight</div>
                  <div className="mt-0.5 text-[11px] leading-snug text-muted">
                    Your recent tenders show {data?.compliance_rate ?? 0}% average coverage.
                    {(data?.kpis.needs_action ?? 0) > 0 ? ` ${data?.kpis.needs_action} specification(s) need review for better alignment.` : " All specifications are well aligned."}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-saffron">⚡</span>
              <h2 className="font-display text-base font-semibold text-ink">Quick Actions</h2>
            </div>
            <div className="space-y-2">
              <QuickAction to="/analyses/new" icon="doc" tone="bg-primary-soft text-primary" title="Upload New Tender" sub="Analyze a new document" />
              <QuickAction to="/standards" icon="book" tone="bg-saffron-soft text-saffron" title="Explore Standards Library" sub="Browse Indian Standards" />
              <QuickAction to="/regulatory-updates" icon="chat" tone="bg-success-soft text-success" title="Regulatory Updates" sub="Latest amendments & QCO" />
              <QuickAction to="/help" icon="book" tone="bg-blue-100 text-blue-700" title="View User Guide" sub="Learn how to use the platform" />
            </div>
          </Card>

          {/* Mountain card — text is baked into the asset; only add the button */}
          <div className="relative overflow-hidden rounded-2xl">
            <img src="/brand/mountain_card_clean.png" alt="Efficient Procurement, Stronger Nation" className="w-full object-cover" />
            <button onClick={() => navigate("/analytics")}
              className="absolute bottom-4 left-4 inline-flex w-fit items-center gap-1 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold text-primary shadow hover:bg-white">
              Learn More →
            </button>
          </div>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-ink">Latest Regulatory Updates</h2>
              <Link to="/regulatory-updates" className="text-xs font-medium text-primary hover:underline">View All →</Link>
            </div>
            <div className="space-y-3">
              {(updates ?? []).slice(0, 3).map((u, i) => (
                <Link key={i} to="/regulatory-updates" className="flex gap-2.5 rounded-lg hover:bg-panel">
                  <span className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-primary-soft text-primary"><StepIcon name="doc" small /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-ink">{u.headline}</span>
                    <span className="block truncate text-[11px] text-muted">{u.detail}</span>
                  </span>
                  <span className="flex-none text-[10px] text-muted">{u.date ? new Date(u.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""}</span>
                </Link>
              ))}
              {!updates?.length && <p className="text-xs text-muted">No updates on file.</p>}
            </div>
          </Card>
        </div>
      </div>

      {/* Footer badge strip */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface px-6 py-4">
        <p className="max-w-md text-sm italic text-muted">
          "Leveraging technology for transparent, efficient and standards-driven governance." <span className="not-italic text-xs">— Government of India</span>
        </p>
        <div className="flex items-center gap-5 text-xs font-medium text-muted">
          <span className="flex items-center gap-1.5"><span className="text-success">🛡</span> Safer Procurements</span>
          <span className="flex items-center gap-1.5"><span className="text-primary">⚙</span> Efficient Governance</span>
          <span className="flex items-center gap-1.5"><span className="text-saffron">📊</span> Stronger India</span>
          <span className="h-6 w-10 rounded" style={{ background: "linear-gradient(90deg,#FF9933 33%,#fff 33% 66%,#138808 66%)" }} />
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
      className={`group relative cursor-default overflow-hidden rounded-xl border border-line bg-surface p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_-10px_var(--glow),0_0_0_1.5px_var(--glow)] ${s.ring}`}
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
    <Link to={to} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-panel">
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
