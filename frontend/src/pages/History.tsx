import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Card, EmptyState, FilterChip, LinkButton, PageHeader, Skeleton, StatusChip, type Tone } from "@/components/ui";
import { useAnalyses } from "@/lib/morpheus";

const SECTOR_PILL: Record<string, string> = {
  electrical: "bg-amber-100 text-amber-700", healthcare: "bg-purple-100 text-purple-700",
  it: "bg-blue-100 text-blue-700", construction: "bg-orange-100 text-orange-700",
  water: "bg-sky-100 text-sky-700", mechanical: "bg-emerald-100 text-emerald-700",
  materials: "bg-stone-200 text-stone-700", civil: "bg-teal-100 text-teal-700",
};
const WF: Record<string, { label: string; tone: Tone }> = {
  DRAFT: { label: "Draft", tone: "neutral" }, UNDER_REVIEW: { label: "Under Review", tone: "warning" },
  FINALIZED: { label: "Finalized", tone: "success" }, ISSUED: { label: "Tender Issued", tone: "info" },
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
    if (query.trim()) { const q = query.toLowerCase(); rows = rows.filter((a) => (a.title || "").toLowerCase().includes(q) || (a.sector || "").toLowerCase().includes(q)); }
    return rows;
  }, [analyses, query, wf]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: analyses?.length ?? 0, DRAFT: 0, UNDER_REVIEW: 0, FINALIZED: 0, ISSUED: 0 };
    for (const a of analyses ?? []) c[a.workflow_status ?? "DRAFT"]++;
    return c;
  }, [analyses]);

  return (
    <div>
      <PageHeader
        title={isReviewer ? "Sign-Off Queue" : "My Submissions"}
        subtitle={isReviewer
          ? "Tenders awaiting your review and sign-off."
          : "Every tender you have submitted, with its review status."}
        actions={isReviewer ? undefined : <LinkButton to="/analyses/new">＋ New Analysis</LinkButton>} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <FilterChip active={wf === "all"} onClick={() => setWf("all")} count={counts.all}>All</FilterChip>
          <FilterChip active={wf === "DRAFT"} onClick={() => setWf("DRAFT")} count={counts.DRAFT}>Draft</FilterChip>
          <FilterChip active={wf === "UNDER_REVIEW"} onClick={() => setWf("UNDER_REVIEW")} count={counts.UNDER_REVIEW}>Under Review</FilterChip>
          <FilterChip active={wf === "FINALIZED"} onClick={() => setWf("FINALIZED")} count={counts.FINALIZED}>Finalized</FilterChip>
          <FilterChip active={wf === "ISSUED"} onClick={() => setWf("ISSUED")} count={counts.ISSUED}>Issued</FilterChip>
        </div>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tenders…"
          className="w-48 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary" />
      </div>

      {isLoading ? <Skeleton className="h-32" /> : !shown.length ? (
        <EmptyState>No tenders match. Start one above.</EmptyState>
      ) : (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-[1fr_6rem_7rem] gap-2 border-b border-line bg-panel px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted sm:grid-cols-[1fr_7rem_6rem_8rem]">
            <span>Tender</span><span className="hidden sm:block">Sector</span><span>Date</span><span>Status</span>
          </div>
          {shown.map((a) => {
            const w = WF[a.workflow_status ?? "DRAFT"] ?? WF.DRAFT;
            const sector = (a.sector || "").toLowerCase();
            return (
              <Link key={a.id} to={a.status === "READY" ? `/analyses/${a.id}` : `/analyses/${a.id}/processing`}
                className="grid grid-cols-[1fr_6rem_7rem] items-center gap-2 border-b border-line px-4 py-3 text-sm transition-colors last:border-b-0 hover:bg-panel sm:grid-cols-[1fr_7rem_6rem_8rem]">
                <span className="min-w-0 truncate font-medium text-ink">{a.title || a.id}</span>
                <span className="hidden sm:block">
                  {a.sector ? <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold capitalize ${SECTOR_PILL[sector] ?? "bg-panel text-muted"}`}>{a.sector}</span> : <span className="text-xs text-muted">—</span>}
                </span>
                <span className="font-tech text-xs text-muted">{new Date(a.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                <StatusChip tone={a.status === "READY" ? w.tone : "warning"}>{a.status === "READY" ? w.label : "Processing"}</StatusChip>
              </Link>
            );
          })}
        </Card>
      )}
    </div>
  );
}
