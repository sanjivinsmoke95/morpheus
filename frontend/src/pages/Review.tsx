import { useState } from "react";
import { useParams } from "react-router-dom";
import { AnalysisHeader } from "@/components/AnalysisHeader";
import { useAuth } from "@/lib/auth";
import { Button, Card, EmptyState, StatusChip, type Tone } from "@/components/ui";
import { WorkflowStepper, type WorkflowStatus } from "@/components/workspace";
import {
  useAddComment, useAddStandard, useAnalysis, useComments, useDecide, useDecisionLog,
  useRecommendations, useRequirements, useSetWorkflowStatus, type Recommendation,
} from "@/lib/morpheus";

const STATUS_TONE: Record<string, Tone> = {
  ACCEPTED: "success", REJECTED: "danger", REVIEW: "warning", PENDING: "neutral",
};

export function ReviewPage() {
  const { id = "" } = useParams();
  const { data: recs } = useRecommendations(id);
  const { data: reqs } = useRequirements(id);
  const { data: decisions } = useDecisionLog(id);
  const decide = useDecide(id);

  const reqLabel = new Map((reqs ?? []).map((r) => [r.id, `${r.req_code} — ${r.description}`]));
  const byReq = new Map<string, Recommendation[]>();
  (recs ?? []).forEach((r) => { if (!byReq.has(r.requirement_id)) byReq.set(r.requirement_id, []); byReq.get(r.requirement_id)!.push(r); });

  return (
    <div>
      <AnalysisHeader id={id} section="Decision log" />

      <CollaborationPanel id={id} />

      <div className="space-y-6">
        {[...byReq.entries()].map(([reqId, list]) => (
          <div key={reqId}>
            <div className="mb-2 text-sm text-ink"><span className="text-muted">Requirement:</span> {reqLabel.get(reqId) ?? reqId}</div>
            <div className="space-y-2">
              {list.map((r) => (
                <Card key={r.id} className="p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-tech font-semibold text-ink">{r.standard.is_number}</span>
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
              <div key={d.id} className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2 text-xs last:border-b-0">
                <StatusChip tone={d.action === "ACCEPT" ? "success" : d.action === "REJECT" ? "danger" : "neutral"}>{d.action.replace(/_/g, " ")}</StatusChip>
                {d.standard && <span className="font-medium text-primary">{d.standard}</span>}
                {d.requirement && <span className="text-muted">({d.requirement})</span>}
                <span className="min-w-0 flex-1 truncate text-muted">{d.reason || "—"}</span>
                {d.user && <span className="text-muted">{d.user} · {d.role}</span>}
                <span className="font-tech text-muted">{d.timestamp ? new Date(d.timestamp).toLocaleString() : ""}</span>
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

function CollaborationPanel({ id }: { id: string }) {
  const { user } = useAuth();
  const { data: analysis } = useAnalysis(id);
  const { data: comments } = useComments(id);
  const add = useAddComment(id);
  const setStatus = useSetWorkflowStatus(id);
  const [text, setText] = useState("");
  const isReviewer = user?.role === "REVIEWER" || user?.role === "ADMIN";

  return (
    <Card className="mb-6 p-5">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="font-display text-base font-semibold text-ink">Review workspace</h2>
        <WorkflowStepper
          status={analysis?.workflow_status ?? "DRAFT"}
          pending={setStatus.isPending}
          onSelect={isReviewer ? (s: WorkflowStatus) => setStatus.mutate(s) : undefined}
        />
        {isReviewer && (
          <div className="ml-auto flex gap-2">
            <Button className="px-3 py-1.5 text-xs" disabled={add.isPending}
              onClick={() => add.mutate({ body: text.trim() || "Signed off — standards-aligned for tendering.", kind: "signoff" }, { onSuccess: () => setText("") })}>
              Sign off (approve)
            </Button>
            <Button variant="danger" className="px-3 py-1.5 text-xs" disabled={add.isPending || !text.trim()}
              onClick={() => add.mutate({ body: text.trim(), kind: "return" }, { onSuccess: () => setText("") })}>
              Return for revision
            </Button>
          </div>
        )}
      </div>
      {isReviewer && (
        <p className="mb-3 text-[11px] text-muted">
          MORPHEUS assists the officer's judgement — the reviewer advances the tender through its lifecycle and signs off.
        </p>
      )}

      <div className="mb-3 space-y-2">
        {!comments?.length ? (
          <EmptyState>No comments yet. Officers and reviewers can discuss the analysis here.</EmptyState>
        ) : comments.map((c) => (
          <div key={c.id} className={`rounded-lg border-l-4 px-3 py-2 ${c.kind === "signoff" ? "border-l-success bg-success-soft/40" : c.kind === "return" ? "border-l-danger bg-danger-soft/40" : "border-l-line bg-panel/40"}`}>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-ink">{c.author ?? "User"}</span>
              <span className="rounded bg-panel px-1.5 text-[10px] text-muted">{c.role}</span>
              {c.kind !== "comment" && <StatusChip tone={c.kind === "signoff" ? "success" : "danger"}>{c.kind === "signoff" ? "Sign-off" : "Returned"}</StatusChip>}
              <span className="ml-auto font-tech text-[10px] text-muted">{c.created_at ? new Date(c.created_at).toLocaleString() : ""}</span>
            </div>
            <div className="mt-1 text-sm text-ink">{c.body}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a comment for the officer / reviewer…"
          className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary" />
        <Button disabled={!text.trim() || add.isPending} onClick={() => add.mutate({ body: text.trim(), kind: "comment" }, { onSuccess: () => setText("") })}>Comment</Button>
      </div>
    </Card>
  );
}
