import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AnalysisHeader } from "@/components/AnalysisHeader";
import { Button, Card, EmptyState, MatchBar, Skeleton, StatusChip, type Tone } from "@/components/ui";
import { EvidenceStrength, strengthOf } from "@/components/workspace";
import { useDecide, useRecommendations, useRequirements, type Recommendation } from "@/lib/morpheus";

const REL_TONE: Record<string, Tone> = { HIGH: "success", MEDIUM: "warning", LOW: "neutral" };

export function RecommendationsPage() {
  const { id = "" } = useParams();
  const [showExcluded, setShowExcluded] = useState(true);
  const { data: recs, isLoading } = useRecommendations(id, showExcluded);
  const { data: reqs } = useRequirements(id);

  const byReq = new Map<string, Recommendation[]>();
  (recs ?? []).forEach((r) => {
    if (!byReq.has(r.requirement_id)) byReq.set(r.requirement_id, []);
    byReq.get(r.requirement_id)!.push(r);
  });
  const reqLabel = new Map((reqs ?? []).map((r) => [r.id, `${r.req_code} — ${r.description}`]));

  return (
    <div>
      <AnalysisHeader id={id} section="Why matched" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted">
          MORPHEUS explains the decision space, not just an answer: why each standard was matched, the evidence behind it,
          and — where candidates were set aside — why they were not selected.
        </p>
        <label className="flex flex-none items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={showExcluded} onChange={(e) => setShowExcluded(e.target.checked)} />
          Show why-not candidates
        </label>
      </div>

      {isLoading ? (
        <Skeleton className="h-40" />
      ) : byReq.size === 0 ? (
        <EmptyState>No recommendations yet.</EmptyState>
      ) : (
        <div className="space-y-8">
          {[...byReq.entries()].map(([reqId, list]) => {
            const chosen = list.filter((r) => !r.excluded).sort((a, b) => b.relevance_score - a.relevance_score);
            const excluded = list.filter((r) => r.excluded).sort((a, b) => b.relevance_score - a.relevance_score);
            return (
              <div key={reqId}>
                <div className="mb-2 text-sm">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted/70">Requirement</span>{" "}
                  <span className="text-ink">{reqLabel.get(reqId) ?? reqId}</span>
                </div>
                <div className="space-y-2">
                  {chosen.map((r) => <RecCard key={r.id} analysisId={id} rec={r} />)}
                </div>

                {excluded.length > 0 && (
                  <div className="mt-3">
                    <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted/70">
                      Why not other candidates
                    </div>
                    <div className="space-y-1.5">
                      {excluded.map((r) => <ExcludedRow key={r.id} rec={r} />)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RecCard({ analysisId, rec }: { analysisId: string; rec: Recommendation }) {
  const decide = useDecide(analysisId);
  const status = rec.review_status;
  const snippet = rec.evidence?.[0]?.text;

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link to={`/standards/${rec.standard.id}`} className="font-tech text-sm font-semibold text-primary hover:underline">
          {rec.standard.is_number}
        </Link>
        {rec.is_primary && <StatusChip tone="success">Primary</StatusChip>}
        <StatusChip tone="info">{rec.applicability_class.replace(/_/g, " ")}</StatusChip>
        <span className="text-[11px] text-muted">
          relevance{" "}
          <span className={`font-semibold ${REL_TONE[rec.relevance] === "success" ? "text-success" : REL_TONE[rec.relevance] === "warning" ? "text-warning" : "text-muted"}`}>
            {rec.relevance}
          </span>
        </span>
        {rec.standard.data_origin === "DEMO_SYNTHETIC" && <StatusChip tone="neutral">Demo data</StatusChip>}
        <span className="ml-auto"><EvidenceStrength level={strengthOf(rec)} showLabel={false} /></span>
      </div>
      <div className="mt-0.5 text-sm font-medium text-ink">{rec.standard.title}</div>

      <div className="mt-2 max-w-md"><MatchBar score={rec.relevance_score} /></div>

      <div className="mt-3 rounded-xl border border-line bg-panel/40 p-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted/70">Why this standard?</div>
        {rec.why && rec.why.length > 0 ? (
          <ul className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
            {rec.why.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-ink">
                <span className="mt-0.5 text-success" aria-hidden>✓</span>
                <span><span className="font-medium">{w.factor}</span>{w.detail ? <span className="text-muted"> — {w.detail}</span> : null}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-muted">{rec.rationale || "No structured factors recorded."}</p>
        )}
        {snippet && (
          <div className="font-evidence mt-2 border-t border-line pt-2 text-[12px] leading-relaxed text-ink">
            <span className="font-tech text-[10px] uppercase tracking-wide text-muted">Evidence · </span>
            “{snippet.slice(0, 200)}{snippet.length > 200 ? "…" : ""}”
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
        <span className={`text-[11px] font-semibold ${status === "ACCEPTED" ? "text-success" : status === "REJECTED" ? "text-danger" : "text-muted"}`}>
          {status}
        </span>
        <div className="ml-auto flex gap-2">
          <Button className="px-3 py-1.5 text-xs" disabled={decide.isPending}
            onClick={() => decide.mutate({ target_type: "recommendation", target_id: rec.id, decision: "ACCEPT", reason: "Accepted" })}>Accept</Button>
          <Button variant="secondary" className="px-3 py-1.5 text-xs" disabled={decide.isPending}
            onClick={() => decide.mutate({ target_type: "recommendation", target_id: rec.id, decision: "MARK_FOR_REVIEW", reason: "Flagged for review" })}>Flag</Button>
          <Button variant="danger" className="px-3 py-1.5 text-xs" disabled={decide.isPending}
            onClick={() => decide.mutate({ target_type: "recommendation", target_id: rec.id, decision: "REJECT", reason: "Rejected" })}>Reject</Button>
        </div>
      </div>
    </Card>
  );
}

/* Excluded candidate — shows only the reason the backend actually provided. */
function ExcludedRow({ rec }: { rec: Recommendation }) {
  const reasons = rec.why_not && rec.why_not.length > 0
    ? rec.why_not.map((w) => w.reason)
    : [rec.exclusion_reason || "Ranked below stronger candidates"];
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-line bg-surface px-3 py-2">
      <span className="mt-0.5 flex-none text-muted" aria-hidden>✕</span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/standards/${rec.standard.id}`} className="font-tech text-xs font-semibold text-muted hover:text-primary hover:underline">
            {rec.standard.is_number}
          </Link>
          <span className="truncate text-xs text-muted">{rec.standard.title}</span>
        </div>
        <div className="mt-0.5 text-xs text-ink">{reasons.join(" · ")}</div>
      </div>
    </div>
  );
}
