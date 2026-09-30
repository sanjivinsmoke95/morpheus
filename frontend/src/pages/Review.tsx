import { useState } from "react";
import { useParams } from "react-router-dom";
import { AnalysisHeader } from "@/components/AnalysisHeader";
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
                    {["ACCEPT", "REJECT", "MARK_FOR_REVIEW"].map((d) => {
                      const isActive = (d === "ACCEPT" && r.review_status === "ACCEPTED") ||
                                       (d === "REJECT" && r.review_status === "REJECTED") ||
                                       (d === "MARK_FOR_REVIEW" && r.review_status === "REVIEW");
                      return (
                        <button
                          key={d}
                          disabled={decide.isPending}
                          onClick={() => decide.mutate({ target_type: "standard", target_id: r.standard.id, decision: d })}
                          className={`rounded px-2.5 py-1 text-[11px] font-medium capitalize transition-all ${
                            isActive
                              ? d === "ACCEPT"
                                ? "bg-emerald-600 text-white shadow-xs"
                                : d === "REJECT"
                                ? "bg-rose-600 text-white shadow-xs"
                                : "bg-amber-600 text-white shadow-xs"
                              : "bg-panel hover:bg-line/60 text-ink"
                          }`}
                        >
                          {isActive && d === "ACCEPT" ? "✓ Accepted" : d.replace(/_/g, " ").toLowerCase()}
                        </button>
                      );
                    })}
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
  const { data: analysis } = useAnalysis(id);
  const { data: comments } = useComments(id);
  const add = useAddComment(id);
  const setStatus = useSetWorkflowStatus(id);
  const [text, setText] = useState("");
  const currentStatus = (analysis?.workflow_status ?? "DRAFT") as WorkflowStatus;

  return (
    <Card className="mb-6 p-5 border border-line shadow-xs">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <h2 className="font-display text-base font-bold text-ink">Review & Sign-Off Workspace</h2>
          <p className="text-xs text-muted">Statutory compliance governance and multi-tier approval trail</p>
        </div>
        <WorkflowStepper
          status={currentStatus}
          pending={setStatus.isPending}
          onSelect={(s: WorkflowStatus) => setStatus.mutate(s)}
        />
      </div>

      {/* Contextual Action Bar based on current stage */}
      <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-white shadow-2xs">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </span>
          <div>
            <div className="text-xs font-bold text-ink">
              Current Stage: <span className="text-primary font-extrabold uppercase">{currentStatus.replace(/_/g, " ")}</span>
            </div>
            <div className="text-[11px] text-muted">
              {currentStatus === "DRAFT" && "Draft specifications under officer preparation. Advance to review once requirements are mapped."}
              {currentStatus === "UNDER_REVIEW" && "Awaiting technical review and executive verification against mandatory BIS Standards."}
              {currentStatus === "FINALIZED" && "Specification verified and signed off. Ready for export and dispatch to GeM portal."}
              {currentStatus === "ISSUED" && "Officially issued. Tender active on Central Public Procurement / GeM."}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {currentStatus === "DRAFT" && (
            <Button
              className="bg-primary hover:bg-primary-dark text-white px-3.5 py-1.5 text-xs font-bold shadow-xs cursor-pointer"
              disabled={setStatus.isPending}
              onClick={() => {
                setStatus.mutate("UNDER_REVIEW");
                add.mutate({ body: text.trim() || "Submitted specification for technical review and BIS verification.", kind: "comment" });
                setText("");
              }}
            >
              Submit for Technical Review →
            </Button>
          )}

          {currentStatus === "UNDER_REVIEW" && (
            <>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 text-xs font-bold shadow-xs cursor-pointer"
                disabled={setStatus.isPending || add.isPending}
                onClick={() => {
                  setStatus.mutate("FINALIZED");
                  add.mutate({
                    body: text.trim() || "Signed off — specification verified against applicable Indian Standards and QCO orders.",
                    kind: "signoff",
                  });
                  setText("");
                }}
              >
                Approve & Sign Off (Finalize) ✓
              </Button>
              <Button
                variant="danger"
                className="px-3 py-1.5 text-xs font-semibold cursor-pointer"
                disabled={setStatus.isPending || add.isPending}
                onClick={() => {
                  setStatus.mutate("DRAFT");
                  add.mutate({
                    body: text.trim() || "Returned to draft: please resolve flagged standard gaps or missing clause parameters.",
                    kind: "return",
                  });
                  setText("");
                }}
              >
                Return for Revision ↺
              </Button>
            </>
          )}

          {currentStatus === "FINALIZED" && (
            <Button
              className="bg-sky-600 hover:bg-sky-700 text-white px-3.5 py-1.5 text-xs font-bold shadow-xs cursor-pointer"
              disabled={setStatus.isPending}
              onClick={() => {
                setStatus.mutate("ISSUED");
                add.mutate({
                  body: text.trim() || "Tender specification issued for GeM procurement dispatch and vendor bidding.",
                  kind: "signoff",
                });
                setText("");
              }}
            >
              Issue Specification for GeM 🚀
            </Button>
          )}

          {currentStatus === "ISSUED" && (
            <span className="rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1 text-xs font-bold">
              ✓ Active on GeM
            </span>
          )}
        </div>
      </div>

      {/* Comment & Audit Trail History */}
      <div className="mb-3 space-y-2">
        {!comments?.length ? (
          <EmptyState>No sign-off notes yet. Add review notes or audit remarks below.</EmptyState>
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              className={`rounded-xl border px-3.5 py-2.5 shadow-2xs ${
                c.kind === "signoff"
                  ? "border-emerald-300 bg-emerald-50/50 text-emerald-900"
                  : c.kind === "return"
                  ? "border-rose-300 bg-rose-50/50 text-rose-900"
                  : "border-line bg-panel/30 text-ink"
              }`}
            >
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-ink">{c.author ?? "User"}</span>
                <span className="rounded bg-panel px-1.5 text-[10px] font-semibold text-muted">{c.role}</span>
                {c.kind !== "comment" && (
                  <StatusChip tone={c.kind === "signoff" ? "success" : "danger"}>
                    {c.kind === "signoff" ? "✓ Executive Sign-off" : "↺ Returned for Revision"}
                  </StatusChip>
                )}
                <span className="ml-auto font-tech text-[10px] text-muted">
                  {c.created_at ? new Date(c.created_at).toLocaleString("en-GB") : ""}
                </span>
              </div>
              <div className="mt-1.5 text-xs text-ink leading-relaxed break-words font-medium">{c.body}</div>
            </div>
          ))
        )}
      </div>

      {/* Comment Input */}
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add an officer note, clarification, or audit memo…"
          className="flex-1 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
        />
        <Button
          disabled={!text.trim() || add.isPending}
          onClick={() =>
            add.mutate({ body: text.trim(), kind: "comment" }, { onSuccess: () => setText("") })
          }
          className="px-4 py-2 text-xs font-semibold cursor-pointer"
        >
          Add Note
        </Button>
      </div>
    </Card>
  );
}

