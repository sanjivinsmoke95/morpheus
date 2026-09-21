import { Link, useParams } from "react-router-dom";
import { useDecide, useRecommendations, useRequirements, type Recommendation } from "@/lib/morpheus";

const REL: Record<string, string> = { HIGH: "text-emerald-400", MEDIUM: "text-amber-400", LOW: "text-zinc-400" };
const AC_COLOR: Record<string, string> = {
  DIRECTLY_APPLICABLE: "border-emerald-400/40 text-emerald-300",
  NORMATIVE_REFERENCE: "border-sky-400/40 text-sky-300",
  TESTING: "border-violet-400/40 text-violet-300",
  SAFETY: "border-red-400/40 text-red-300",
  MATERIAL: "border-amber-400/40 text-amber-300",
  CERTIFICATION: "border-fuchsia-400/40 text-fuchsia-300",
};

export function RecommendationsPage() {
  const { id = "" } = useParams();
  const { data: recs, isLoading } = useRecommendations(id);
  const { data: reqs } = useRequirements(id);

  const byReq = new Map<string, Recommendation[]>();
  (recs ?? []).forEach((r) => {
    if (!byReq.has(r.requirement_id)) byReq.set(r.requirement_id, []);
    byReq.get(r.requirement_id)!.push(r);
  });
  const reqLabel = new Map((reqs ?? []).map((r) => [r.id, `${r.req_code} — ${r.description}`]));

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Recommendations</h1>
          <p className="mt-0.5 text-sm text-zinc-400">Applicable standards per requirement, with evidence. You decide.</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/analyses/${id}/readiness`} className="rounded-md bg-white/10 px-3 py-1.5 text-sm font-medium hover:bg-white/20">
            Readiness
          </Link>
          <Link to={`/analyses/${id}/graph`} className="rounded-md bg-white/10 px-3 py-1.5 text-sm font-medium hover:bg-white/20">
            Knowledge graph
          </Link>
          <Link to={`/analyses/${id}/reports`} className="rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-medium text-black hover:bg-emerald-400">
            Generate report →
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 h-40 animate-pulse rounded-lg bg-white/5" />
      ) : byReq.size === 0 ? (
        <p className="mt-6 text-sm text-zinc-400">No recommendations yet.</p>
      ) : (
        <div className="mt-5 space-y-6">
          {[...byReq.entries()].map(([reqId, list]) => (
            <div key={reqId}>
              <div className="mb-2 text-sm text-zinc-300">
                <span className="text-zinc-500">Requirement:</span> {reqLabel.get(reqId) ?? reqId}
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
    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold text-zinc-100">{rec.standard.is_number}</span>
            {rec.is_primary && <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-300">primary</span>}
            <span className={`rounded border px-1.5 py-0.5 text-[10px] uppercase ${AC_COLOR[rec.applicability_class] ?? "border-white/15 text-zinc-400"}`}>
              {rec.applicability_class.replace(/_/g, " ")}
            </span>
            <span className="text-[11px]">relevance <span className={REL[rec.relevance]}>{rec.relevance}</span></span>
            {rec.standard.data_origin === "DEMO_SYNTHETIC" && (
              <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-500">DEMO</span>
            )}
          </div>
          <div className="mt-0.5 text-sm text-zinc-300">{rec.standard.title}</div>
          <div className="mt-1 text-xs text-zinc-500">{rec.rationale}</div>

          {/* signals */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Object.entries(rec.signals).filter(([, v]) => v > 0).map(([k, v]) => (
              <span key={k} className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                {k} {typeof v === "number" ? v.toFixed(2) : v}
              </span>
            ))}
          </div>

          {/* evidence */}
          <div className="mt-2 space-y-1">
            {rec.evidence.map((e) => (
              <div key={e.id} className="rounded border border-white/10 px-2 py-1 text-[11px] text-zinc-400">
                <span className="mr-1 rounded bg-white/5 px-1 py-0.5 text-[9px] uppercase">{e.source_type.replace(/_/g, " ")}</span>
                {e.text.slice(0, 160)}
                {e.source_url && <a href={e.source_url} target="_blank" rel="noreferrer" className="ml-1 text-sky-400">↗</a>}
              </div>
            ))}
          </div>
        </div>

        {/* decision */}
        <div className="flex flex-none flex-col items-end gap-1">
          <span className={`text-[11px] ${status === "ACCEPTED" ? "text-emerald-400" : status === "REJECTED" ? "text-red-400" : "text-zinc-500"}`}>
            {status}
          </span>
          <div className="flex gap-1">
            <button onClick={() => decide.mutate({ target_type: "recommendation", target_id: rec.id, decision: "ACCEPT" })}
              className="rounded bg-emerald-500/20 px-2 py-1 text-[11px] text-emerald-300 hover:bg-emerald-500/30">Accept</button>
            <button onClick={() => decide.mutate({ target_type: "recommendation", target_id: rec.id, decision: "REJECT" })}
              className="rounded bg-red-500/20 px-2 py-1 text-[11px] text-red-300 hover:bg-red-500/30">Reject</button>
          </div>
        </div>
      </div>
    </div>
  );
}
