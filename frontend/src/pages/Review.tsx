import { useState } from "react";
import { useParams } from "react-router-dom";
import { AnalysisHeader } from "@/components/AnalysisHeader";
import { Card, StatusChip, type Tone } from "@/components/ui";
import {
  useAddStandard, useDecide, useDecisions, useRecommendations, useRequirements, type Recommendation,
} from "@/lib/morpheus";

const STATUS_TONE: Record<string, Tone> = {
  ACCEPTED: "success", REJECTED: "danger", REVIEW: "warning", PENDING: "neutral",
};

export function ReviewPage() {
  const { id = "" } = useParams();
  const { data: recs } = useRecommendations(id);
  const { data: reqs } = useRequirements(id);
  const { data: decisions } = useDecisions(id);
  const decide = useDecide(id);

  const reqLabel = new Map((reqs ?? []).map((r) => [r.id, `${r.req_code} — ${r.description}`]));
  const byReq = new Map<string, Recommendation[]>();
  (recs ?? []).forEach((r) => { if (!byReq.has(r.requirement_id)) byReq.set(r.requirement_id, []); byReq.get(r.requirement_id)!.push(r); });

  return (
    <div>
      <AnalysisHeader id={id} section="Decision log" />

      <div className="space-y-6">
        {[...byReq.entries()].map(([reqId, list]) => (
          <div key={reqId}>
            <div className="mb-2 text-sm text-ink"><span className="text-muted">Requirement:</span> {reqLabel.get(reqId) ?? reqId}</div>
            <div className="space-y-2">
              {list.map((r) => (
                <Card key={r.id} className="p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink">{r.standard.is_number}</span>
                    <StatusChip tone="info">{r.applicability_class.replace(/_/g, " ")}</StatusChip>
                    <span className="ml-auto"><StatusChip tone={STATUS_TONE[r.review_status] ?? "neutral"}>{r.review_status}</StatusChip></span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted">{r.standard.title}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {["ACCEPT", "REJECT", "MARK_FOR_REVIEW"].map((d) => (
                      <button key={d} onClick={() => decide.mutate({ target_type: "recommendation", target_id: r.id, decision: d })}
                        className="rounded bg-panel px-2 py-1 text-[11px] capitalize hover:bg-line/60">{d.replace(/_/g, " ").toLowerCase()}</button>
                    ))}
                  </div>
                </Card>
              ))}
              <AddStandard analysisId={id} requirementId={reqId} />
            </div>
          </div>
        ))}
      </div>

      {decisions && decisions.length > 0 && (
        <div className="mt-8">
          <div className="mb-2 text-sm font-semibold text-ink">Decision log</div>
          <Card>
            {decisions.map((d) => (
              <div key={d.id} className="flex items-center gap-3 border-b border-line px-3 py-2 text-xs last:border-b-0">
                <StatusChip tone="neutral">{d.decision.replace(/_/g, " ")}</StatusChip>
                <span className="min-w-0 flex-1 truncate text-muted">{d.reason || "—"}</span>
                <span className="text-muted">{new Date(d.created_at).toLocaleTimeString()}</span>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}

function AddStandard({ analysisId, requirementId }: { analysisId: string; requirementId: string }) {
  const add = useAddStandard(analysisId);
  const [num, setNum] = useState("");
  const [open, setOpen] = useState(false);
  if (!open) return <button onClick={() => setOpen(true)} className="text-xs font-medium text-primary hover:underline">+ add a standard</button>;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input value={num} onChange={(e) => setNum(e.target.value)} placeholder="IS number (must exist)"
        className="flex-1 rounded-lg border border-line bg-surface px-2 py-1 text-xs text-ink outline-none focus:border-primary" />
      <button onClick={() => num.trim() && add.mutate({ requirement_id: requirementId, is_number: num.trim() }, { onSuccess: () => { setNum(""); setOpen(false); } })}
        disabled={add.isPending} className="rounded bg-success-soft px-2 py-1 text-[11px] font-medium text-success">Add</button>
      <button onClick={() => setOpen(false)} className="rounded bg-panel px-2 py-1 text-[11px]">Cancel</button>
      {add.isError && <span className="text-[11px] text-danger">not in DB</span>}
    </div>
  );
}
