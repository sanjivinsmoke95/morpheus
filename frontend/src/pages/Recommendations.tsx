import { useState } from "react";
import { useParams } from "react-router-dom";
import { AnalysisTabs } from "@/components/AnalysisTabs";
import { Card, EmptyState, PageHeader, Skeleton, StatusChip, type Tone } from "@/components/ui";
import { useDecide, useRecommendations, useRequirements, type Recommendation } from "@/lib/morpheus";

const REL_TONE: Record<string, Tone> = { HIGH: "success", MEDIUM: "warning", LOW: "neutral" };

export function RecommendationsPage() {
  const { id = "" } = useParams();
  const [showExcluded, setShowExcluded] = useState(false);
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
      <PageHeader
        title="Match signals"
        subtitle="Every candidate standard per requirement, with retrieval signals and evidence. Analyst view."
      />
      <AnalysisTabs id={id} />

      <label className="mb-4 flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" checked={showExcluded} onChange={(e) => setShowExcluded(e.target.checked)} />
        Show excluded candidates (why not)
      </label>

      {isLoading ? (
        <Skeleton className="h-40" />
      ) : byReq.size === 0 ? (
        <EmptyState>No recommendations yet.</EmptyState>
      ) : (
        <div className="space-y-6">
          {[...byReq.entries()].map(([reqId, list]) => (
            <div key={reqId}>
              <div className="mb-2 text-sm text-ink">
                <span className="text-muted">Requirement:</span> {reqLabel.get(reqId) ?? reqId}
              </div>
              <div className="space-y-2">
                {list.map((r) => <RecCard key={r.id} analysisId={id} rec={r} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecCard({ analysisId, rec }: { analysisId: string; rec: Recommendation }) {
  const decide = useDecide(analysisId);
  const status = rec.review_status;

  return (
    <Card className={`p-3 ${rec.excluded ? "opacity-70" : ""}`}>
      {rec.excluded && (
        <div className="mb-1 text-[11px] text-danger">Excluded — {rec.exclusion_reason || "weaker than higher-ranked candidates"}</div>
      )}
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-ink">{rec.standard.is_number}</span>
            {rec.is_primary && <StatusChip tone="success">primary</StatusChip>}
            <StatusChip tone="info">{rec.applicability_class.replace(/_/g, " ")}</StatusChip>
            <span className="text-[11px] text-muted">
              relevance <span className={`font-semibold ${REL_TONE[rec.relevance] === "success" ? "text-success" : REL_TONE[rec.relevance] === "warning" ? "text-warning" : "text-muted"}`}>{rec.relevance}</span>
            </span>
            {rec.standard.data_origin === "DEMO_SYNTHETIC" && <StatusChip tone="neutral">DEMO</StatusChip>}
          </div>
          <div className="mt-0.5 text-sm text-ink">{rec.standard.title}</div>
          <div className="mt-1 text-xs text-muted">{rec.rationale}</div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {Object.entries(rec.signals).filter(([, v]) => v > 0).map(([k, v]) => (
              <span key={k} className="rounded bg-panel px-1.5 py-0.5 text-[10px] font-medium text-muted">
                {k} {typeof v === "number" ? v.toFixed(2) : v}
              </span>
            ))}
          </div>

          <div className="mt-2 space-y-1">
            {rec.evidence.map((e) => (
              <div key={e.id} className="rounded border border-line px-2 py-1 text-[11px] text-muted">
                <span className="mr-1 rounded bg-panel px-1 py-0.5 text-[9px] uppercase">{e.source_type.replace(/_/g, " ")}</span>
                {e.text.slice(0, 160)}
                {e.source_url && <a href={e.source_url} target="_blank" rel="noreferrer" className="ml-1 text-primary">↗</a>}
              </div>
            ))}
          </div>
        </div>

        {!rec.excluded && (
          <div className="flex flex-none flex-col items-end gap-1">
            <span className={`text-[11px] font-semibold ${status === "ACCEPTED" ? "text-success" : status === "REJECTED" ? "text-danger" : "text-muted"}`}>
              {status}
            </span>
            <div className="flex gap-1">
              <button onClick={() => decide.mutate({ target_type: "recommendation", target_id: rec.id, decision: "ACCEPT" })}
                className="rounded bg-success-soft px-2 py-1 text-[11px] font-medium text-success hover:bg-success/10">Accept</button>
              <button onClick={() => decide.mutate({ target_type: "recommendation", target_id: rec.id, decision: "REJECT" })}
                className="rounded bg-danger-soft px-2 py-1 text-[11px] font-medium text-danger hover:bg-danger/10">Reject</button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
