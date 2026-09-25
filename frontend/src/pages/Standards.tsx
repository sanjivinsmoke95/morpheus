import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AnalysisHeader } from "@/components/AnalysisHeader";
import {
  Button, Card, EmptyState, FilterChip, MatchBar, Skeleton, StatusChip, Tooltip,
} from "@/components/ui";
import {
  useAnalysis, useDecide, useQco, useRecommendations, type Recommendation,
} from "@/lib/morpheus";

type Filter = "all" | "qco" | "accepted" | "pending";

const STATUS_TONE = { ACCEPTED: "success", REJECTED: "danger", REVIEW: "warning", PENDING: "neutral" } as const;

export function StandardsPage() {
  const { id = "" } = useParams();
  const { data: analysis } = useAnalysis(id);
  const { data: recs, isLoading } = useRecommendations(id);
  const { data: qco } = useQco(id);
  const decide = useDecide(id);

  const [filter, setFilter] = useState<Filter>("all");

  const qcoMandatory = useMemo(() => {
    const s = new Set<string>();
    (qco ?? []).forEach((q: any) => { if (q.qco_status === "MANDATORY" && q.is_number) s.add(q.is_number); });
    return s;
  }, [qco]);

  // Best recommendation per standard, sorted by relevance.
  const cards = useMemo(() => {
    const best = new Map<string, Recommendation>();
    for (const r of recs ?? []) {
      const cur = best.get(r.standard.id);
      if (!cur || r.relevance_score > cur.relevance_score) best.set(r.standard.id, r);
    }
    return [...best.values()].sort((a, b) => b.relevance_score - a.relevance_score);
  }, [recs]);

  const counts = useMemo(() => ({
    all: cards.length,
    qco: cards.filter((r) => qcoMandatory.has(r.standard.is_number)).length,
    accepted: cards.filter((r) => r.review_status === "ACCEPTED").length,
    pending: cards.filter((r) => r.review_status === "PENDING").length,
  }), [cards, qcoMandatory]);

  const shown = useMemo(() => {
    if (filter === "qco") return cards.filter((r) => qcoMandatory.has(r.standard.is_number));
    if (filter === "accepted") return cards.filter((r) => r.review_status === "ACCEPTED");
    if (filter === "pending") return cards.filter((r) => r.review_status === "PENDING");
    return cards;
  }, [cards, filter, qcoMandatory]);

  function bulkAccept(which: "high" | "qco") {
    const target = which === "qco"
      ? cards.filter((r) => qcoMandatory.has(r.standard.is_number) && r.review_status !== "ACCEPTED")
      : cards.filter((r) => r.relevance === "HIGH" && r.review_status !== "ACCEPTED");
    target.forEach((r) => decide.mutate({ target_type: "recommendation", target_id: r.id, decision: "ACCEPT", reason: `Bulk accept (${which})` }));
  }

  function exportCsv() {
    const header = ["IS Number", "Title", "Match %", "Relevance", "Applicability", "QCO Mandatory", "Status"];
    const rows = cards.map((r) => [
      r.standard.is_number, `"${r.standard.title.replace(/"/g, "'")}"`, Math.round(r.relevance_score * 100),
      r.relevance, r.applicability_class, qcoMandatory.has(r.standard.is_number) ? "YES" : "", r.review_status,
    ].join(","));
    const blob = new Blob([[header.join(","), ...rows].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `standards-${(analysis?.title || "tender").replace(/\W+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div>
      <AnalysisHeader id={id} section="Standards Review" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")} count={counts.all}>All</FilterChip>
          <FilterChip active={filter === "qco"} onClick={() => setFilter("qco")} count={counts.qco}>QCO mandatory</FilterChip>
          <FilterChip active={filter === "pending"} onClick={() => setFilter("pending")} count={counts.pending}>Pending</FilterChip>
          <FilterChip active={filter === "accepted"} onClick={() => setFilter("accepted")} count={counts.accepted}>Accepted</FilterChip>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="text-xs" onClick={exportCsv}>Export CSV</Button>
          <Button variant="secondary" className="text-xs" onClick={() => bulkAccept("qco")} disabled={counts.qco === 0}>Accept all QCO</Button>
          <Button variant="secondary" className="text-xs" onClick={() => bulkAccept("high")}>Accept all high-relevance</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
      ) : !shown.length ? (
        <EmptyState>No standards match this filter.</EmptyState>
      ) : (
        <div className="space-y-3">
          {shown.map((r) => (
            <StandardCard key={r.id} rec={r} mandatory={qcoMandatory.has(r.standard.is_number)}
              onDecide={(decision, reason) => decide.mutate({ target_type: "recommendation", target_id: r.id, decision, reason })} />
          ))}
        </div>
      )}
    </div>
  );
}

function StandardCard({ rec, mandatory, onDecide }: {
  rec: Recommendation; mandatory: boolean; onDecide: (decision: string, reason?: string) => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  return (
    <Card className={`p-4 ${mandatory ? "ring-1 ring-danger/30" : ""}`}>
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/standards/${rec.standard.id}`} className="font-tech text-sm font-semibold text-primary hover:underline">
              {rec.standard.is_number}
            </Link>
            {mandatory && (
              <span className="inline-flex items-center gap-1 rounded-md bg-danger px-2 py-0.5 text-[11px] font-bold text-white">
                ⚠ QCO MANDATORY
                <Tooltip text="This product needs BIS certification by law. Bids without valid certification must be rejected." />
              </span>
            )}
            {rec.standard.data_origin === "DEMO_SYNTHETIC" && <StatusChip tone="neutral">DEMO</StatusChip>}
            <span className="ml-auto"><StatusChip tone={STATUS_TONE[rec.review_status as keyof typeof STATUS_TONE] ?? "neutral"}>{rec.review_status}</StatusChip></span>
          </div>
          <div className="mt-0.5 text-sm text-ink">{rec.standard.title}</div>
          {rec.rationale && <div className="mt-1 text-xs text-muted">{rec.rationale}</div>}

          {/* Why this applies (Phase 7) */}
          {rec.why && rec.why.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {rec.why.map((w, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-[11px] text-ink" title={w.detail}>
                  <span className="text-success">✓</span> {w.factor}
                </span>
              ))}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="w-48"><MatchBar score={rec.relevance_score} /></div>
            <StatusChip tone="info">{rec.applicability_class.replace(/_/g, " ")}</StatusChip>
            <StatusChip tone="neutral">{rec.relevance} relevance</StatusChip>
            <StatusChip tone="neutral">{rec.retrieval_method === "semantic+lexical" ? "Semantic AI" : "Deterministic"}</StatusChip>
          </div>
        </div>
      </div>

      {rejecting ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <input autoFocus value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for rejecting (recorded for audit)…"
            className="min-w-[14rem] flex-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink outline-none focus:border-primary" />
          <Button variant="danger" disabled={!reason.trim()}
            onClick={() => { onDecide("REJECT", reason.trim()); setRejecting(false); setReason(""); }}>Confirm reject</Button>
          <Button variant="secondary" onClick={() => setRejecting(false)}>Cancel</Button>
        </div>
      ) : (
        <div className="mt-3 flex gap-2 border-t border-line pt-3">
          <Button className="px-3 py-1.5 text-xs" onClick={() => onDecide("ACCEPT", "Accepted")}>Accept</Button>
          <Button variant="danger" className="px-3 py-1.5 text-xs" onClick={() => setRejecting(true)}>Reject…</Button>
          <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => onDecide("MARK_FOR_REVIEW", "Flagged for review")}>Flag for review</Button>
        </div>
      )}
    </Card>
  );
}
