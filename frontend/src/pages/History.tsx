import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Card, EmptyState, FilterChip, LinkButton, PageHeader, Skeleton, StatusChip, type Tone } from "@/components/ui";
import { useAnalyses, type Analysis } from "@/lib/morpheus";

const SECTOR_PILL: Record<string, string> = {
  electrical: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20",
  healthcare: "bg-purple-50 text-purple-800 ring-1 ring-inset ring-purple-600/20",
  it: "bg-blue-50 text-blue-800 ring-1 ring-inset ring-blue-600/20",
  construction: "bg-orange-50 text-orange-800 ring-1 ring-inset ring-orange-600/20",
  water: "bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-600/20",
  mechanical: "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-600/20",
  materials: "bg-stone-100 text-stone-800 ring-1 ring-inset ring-stone-400/25",
  civil: "bg-teal-50 text-teal-800 ring-1 ring-inset ring-teal-600/20",
};

const WF: Record<string, { label: string; tone: Tone }> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  UNDER_REVIEW: { label: "Under Review", tone: "warning" },
  FINALIZED: { label: "Finalized", tone: "success" },
  ISSUED: { label: "Tender Issued", tone: "info" },
};

export function HistoryPage() {
  const { user } = useAuth();
  const isReviewer = user?.role === "REVIEWER";
  // Officers see only their own submissions; reviewers see the whole queue.
  const { data: analyses, isLoading } = useAnalyses(!isReviewer && user?.role !== "ADMIN");
  const [query, setQuery] = useState("");
  // A reviewer's list opens as an inbox of tenders awaiting sign-off.
  const [wf, setWf] = useState<string>(isReviewer ? "UNDER_REVIEW" : "all");

  const shown = useMemo(() => {
    let rows = analyses ?? [];
    if (wf !== "all") rows = rows.filter((a) => (a.workflow_status ?? "DRAFT") === wf);
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter(
        (a) =>
          (a.title || "").toLowerCase().includes(q) ||
          (a.sector || "").toLowerCase().includes(q) ||
          (a.id || "").toLowerCase().includes(q)
      );
    }
    return rows;
  }, [analyses, query, wf]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: analyses?.length ?? 0, DRAFT: 0, UNDER_REVIEW: 0, FINALIZED: 0, ISSUED: 0 };
    for (const a of analyses ?? []) {
      const s = a.workflow_status ?? "DRAFT";
      if (c[s] !== undefined) c[s]++;
      else c[s] = 1;
    }
    return c;
  }, [analyses]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={isReviewer ? "Sign-Off Queue" : "Procurement Submissions"}
        subtitle={
          isReviewer
            ? "Tenders awaiting technical verification, standards audit, and executive sign-off."
            : "Complete registry of submitted tender specifications, BIS compliance telemetry, and stage progress."
        }
        actions={isReviewer ? undefined : <LinkButton to="/analyses/new">＋ New Analysis</LinkButton>}
      />

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-line bg-surface p-4 shadow-2xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">Total Submissions</div>
          <div className="mt-1 font-display text-2xl font-bold tabular-nums text-ink">{counts.all}</div>
          <div className="mt-0.5 text-[11px] text-muted">Across all ministries</div>
        </div>
        <div className="rounded-xl border border-amber-200/60 bg-amber-50/30 p-4 shadow-2xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-800">Under Review</div>
          <div className="mt-1 font-display text-2xl font-bold tabular-nums text-amber-700">{counts.UNDER_REVIEW}</div>
          <div className="mt-0.5 text-[11px] text-muted">Pending officer sign-off</div>
        </div>
        <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/30 p-4 shadow-2xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Finalized / Ready</div>
          <div className="mt-1 font-display text-2xl font-bold tabular-nums text-emerald-700">{counts.FINALIZED}</div>
          <div className="mt-0.5 text-[11px] text-muted">Audit-verified for GeM</div>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4 shadow-2xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">Draft Specification</div>
          <div className="mt-1 font-display text-2xl font-bold tabular-nums text-ink">{counts.DRAFT}</div>
          <div className="mt-0.5 text-[11px] text-muted">In preparation</div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <FilterChip active={wf === "all"} onClick={() => setWf("all")} count={counts.all}>
            All Submissions
          </FilterChip>
          <FilterChip active={wf === "DRAFT"} onClick={() => setWf("DRAFT")} count={counts.DRAFT}>
            Drafts
          </FilterChip>
          <FilterChip active={wf === "UNDER_REVIEW"} onClick={() => setWf("UNDER_REVIEW")} count={counts.UNDER_REVIEW}>
            Under Review
          </FilterChip>
          <FilterChip active={wf === "FINALIZED"} onClick={() => setWf("FINALIZED")} count={counts.FINALIZED}>
            Finalized
          </FilterChip>
          <FilterChip active={wf === "ISSUED"} onClick={() => setWf("ISSUED")} count={counts.ISSUED}>
            Issued
          </FilterChip>
        </div>
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tenders, sectors, IDs…"
            className="w-56 rounded-lg border border-line bg-surface py-1.5 pl-3 pr-8 text-xs text-ink placeholder:text-muted/70 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-ink"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Data Table */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : !shown.length ? (
        <EmptyState>
          <div className="py-4">
            <p className="text-base font-semibold text-ink">No tenders match the selected criteria.</p>
            <p className="mt-1 text-xs text-muted">Try adjusting your filter or search query, or upload a new tender document.</p>
          </div>
        </EmptyState>
      ) : (
        <Card className="overflow-hidden border border-line shadow-2xs">
          {/* Table Header */}
          <div className="grid grid-cols-[minmax(0,1.8fr)_7rem_7rem_6.5rem_7.5rem_7rem] items-center gap-3 border-b border-line bg-panel/75 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted">
            <span>Tender Dossier</span>
            <span className="hidden sm:block">Sector</span>
            <span>Compliance</span>
            <span className="hidden md:block">Gaps & Issues</span>
            <span className="hidden lg:block">Submitted</span>
            <span className="text-right">Workflow</span>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-line">
            {shown.map((a: Analysis) => {
              const w = WF[a.workflow_status ?? "DRAFT"] ?? WF.DRAFT;
              const sector = (a.sector || "").toLowerCase();
              const hasCompliance = a.compliance_pct != null;
              const complianceVal = a.compliance_pct ?? 0;
              const targetUrl = a.status === "READY" ? `/analyses/${a.id}` : `/analyses/${a.id}/processing`;

              return (
                <Link
                  key={a.id}
                  to={targetUrl}
                  className="group grid grid-cols-[minmax(0,1.8fr)_7rem_7rem_6.5rem_7.5rem_7rem] items-center gap-3 px-5 py-3.5 text-sm transition-all hover:bg-panel/50 hover:shadow-2xs cursor-pointer"
                >
                  {/* Tender Title & Meta */}
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </span>
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-ink group-hover:text-primary transition-colors">
                          {a.title || `Tender ${a.id.slice(0, 8)}`}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted">
                          <span className="font-mono text-muted/80">{a.id.slice(0, 8)}</span>
                          <span aria-hidden>·</span>
                          <span>{a.requirements_total ? `${a.requirements_total} clauses` : "Processing"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sector */}
                  <div className="hidden sm:block">
                    {a.sector ? (
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize ${
                          SECTOR_PILL[sector] ?? "bg-panel text-muted ring-1 ring-inset ring-line"
                        }`}
                      >
                        {a.sector}
                      </span>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </div>

                  {/* Compliance Progress */}
                  <div>
                    {hasCompliance ? (
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-12 flex-none overflow-hidden rounded-full bg-line">
                          <div
                            className={`h-full rounded-full transition-all ${
                              complianceVal >= 75
                                ? "bg-emerald-600"
                                : complianceVal >= 50
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            }`}
                            style={{ width: `${complianceVal}%` }}
                          />
                        </div>
                        <span
                          className={`font-tech text-xs font-bold tabular-nums ${
                            complianceVal >= 75
                              ? "text-emerald-700"
                              : complianceVal >= 50
                              ? "text-amber-700"
                              : "text-rose-700"
                          }`}
                        >
                          {complianceVal}%
                        </span>
                      </div>
                    ) : (
                      <span className="font-tech text-xs text-muted">—</span>
                    )}
                  </div>

                  {/* Gaps & Issues */}
                  <div className="hidden md:block">
                    {a.open_issues != null ? (
                      a.open_issues === 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                          <span>✓</span>
                          <span>Clean</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/25 tabular-nums">
                          <span>⚠</span>
                          <span>{a.open_issues} flagged</span>
                        </span>
                      )
                    ) : (
                      <span className="font-tech text-xs text-muted">—</span>
                    )}
                  </div>

                  {/* Submission Date */}
                  <div className="hidden lg:block">
                    <span className="font-tech text-xs text-muted">
                      {a.created_at
                        ? new Date(a.created_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </span>
                  </div>

                  {/* Workflow Stage */}
                  <div className="flex items-center justify-end gap-2">
                    <StatusChip tone={a.status === "READY" ? w.tone : "warning"} showDot={true}>
                      {a.status === "READY" ? w.label : "Processing"}
                    </StatusChip>
                    <span className="text-muted group-hover:translate-x-0.5 group-hover:text-primary transition-transform text-sm font-bold">
                      ›
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

