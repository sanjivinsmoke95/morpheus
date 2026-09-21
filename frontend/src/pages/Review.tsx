import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  useAddStandard, useDecide, useDecisions, useRecommendations, useRequirements, type Recommendation,
} from "@/lib/morpheus";

const STATUS_COLOR: Record<string, string> = {
  ACCEPTED: "text-emerald-400", REJECTED: "text-red-400", REVIEW: "text-amber-400", PENDING: "text-zinc-500",
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
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="text-xl font-semibold">Human review</h1>
      <p className="mt-0.5 text-sm text-zinc-400">Accept, reject, or flag each recommendation. Add a missing standard. Decisions are logged.</p>

      <div className="mt-5 space-y-6">
        {[...byReq.entries()].map(([reqId, list]) => (
          <div key={reqId}>
            <div className="mb-2 text-sm text-zinc-300"><span className="text-zinc-500">Requirement:</span> {reqLabel.get(reqId) ?? reqId}</div>
            <div className="space-y-2">
              {list.map((r) => (
                <div key={r.id} className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold">{r.standard.is_number}</span>
                    <span className="rounded border border-white/15 px-1.5 py-0.5 text-[10px] uppercase text-zinc-400">{r.applicability_class.replace(/_/g, " ")}</span>
                    <span className={`ml-auto text-[11px] ${STATUS_COLOR[r.review_status]}`}>{r.review_status}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-400">{r.standard.title}</div>
                  <div className="mt-2 flex gap-1.5">
                    {["ACCEPT", "REJECT", "MARK_FOR_REVIEW"].map((d) => (
                      <button key={d} onClick={() => decide.mutate({ target_type: "recommendation", target_id: r.id, decision: d })}
                        className="rounded bg-white/5 px-2 py-1 text-[11px] hover:bg-white/10">{d.replace(/_/g, " ").toLowerCase()}</button>
                    ))}
                  </div>
                </div>
              ))}
              <AddStandard analysisId={id} requirementId={reqId} />
            </div>
          </div>
        ))}
      </div>

      {decisions && decisions.length > 0 && (
        <div className="mt-8">
          <div className="mb-2 text-sm font-medium">Decision log</div>
          <div className="divide-y divide-white/5 rounded-lg border border-white/10 bg-black/20">
            {decisions.map((d) => (
              <div key={d.id} className="flex items-center gap-3 px-3 py-2 text-xs">
                <span className="rounded bg-white/5 px-1.5 py-0.5 uppercase">{d.decision.replace(/_/g, " ")}</span>
                <span className="min-w-0 flex-1 truncate text-zinc-400">{d.reason || "—"}</span>
                <span className="text-zinc-600">{new Date(d.created_at).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AddStandard({ analysisId, requirementId }: { analysisId: string; requirementId: string }) {
  const add = useAddStandard(analysisId);
  const [num, setNum] = useState("");
  const [open, setOpen] = useState(false);
  if (!open) return <button onClick={() => setOpen(true)} className="text-xs text-emerald-400 hover:underline">+ add a standard</button>;
  return (
    <div className="flex items-center gap-2">
      <input value={num} onChange={(e) => setNum(e.target.value)} placeholder="IS number (must exist)"
        className="flex-1 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs outline-none focus:border-emerald-500" />
      <button onClick={() => num.trim() && add.mutate({ requirement_id: requirementId, is_number: num.trim() }, { onSuccess: () => { setNum(""); setOpen(false); } })}
        disabled={add.isPending} className="rounded bg-emerald-500/20 px-2 py-1 text-[11px] text-emerald-300">Add</button>
      <button onClick={() => setOpen(false)} className="rounded bg-white/5 px-2 py-1 text-[11px]">Cancel</button>
      {add.isError && <span className="text-[11px] text-red-400">not in DB</span>}
    </div>
  );
}
