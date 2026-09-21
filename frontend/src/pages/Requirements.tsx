import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useEditRequirement, useRequirements, type Requirement } from "@/lib/morpheus";

const CONF_COLOR: Record<string, string> = {
  HIGH: "text-emerald-400", MEDIUM: "text-amber-400", LOW: "text-zinc-400", REVIEW_REQUIRED: "text-red-400",
};

export function RequirementsPage() {
  const { id = "" } = useParams();
  const { data: reqs, isLoading, isError } = useRequirements(id);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Requirement matrix</h1>
          <p className="mt-0.5 text-sm text-zinc-400">Extracted from the specification. Edit a description to re-run matching.</p>
        </div>
        <Link to={`/analyses/${id}/recommendations`} className="rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-medium text-black hover:bg-emerald-400">
          View recommendations →
        </Link>
      </div>

      {isLoading ? (
        <div className="mt-6 h-40 animate-pulse rounded-lg bg-white/5" />
      ) : isError ? (
        <p className="mt-6 text-sm text-red-400">Could not load requirements.</p>
      ) : !reqs?.length ? (
        <p className="mt-6 text-sm text-zinc-400">No requirements were extracted.</p>
      ) : (
        <div className="mt-5 space-y-2">
          {reqs.map((r) => <Row key={r.id} analysisId={id} req={r} />)}
        </div>
      )}
    </div>
  );
}

function Row({ analysisId, req }: { analysisId: string; req: Requirement }) {
  const edit = useEditRequirement(analysisId);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(req.description);

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-zinc-400">{req.req_code}</span>
        <span className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] uppercase text-zinc-400">{req.requirement_type}</span>
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex gap-2">
              <input value={text} onChange={(e) => setText(e.target.value)}
                className="flex-1 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-sm outline-none focus:border-emerald-500" />
              <button onClick={() => { edit.mutate({ id: req.id, description: text }); setEditing(false); }}
                className="rounded-md bg-emerald-500 px-2 py-1 text-xs font-medium text-black">Save</button>
              <button onClick={() => { setEditing(false); setText(req.description); }} className="rounded-md bg-white/5 px-2 py-1 text-xs">Cancel</button>
            </div>
          ) : (
            <div className="text-sm text-zinc-200">
              {req.description}
              {req.is_edited && <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-300">edited</span>}
            </div>
          )}
          {req.attributes.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {req.attributes.map((a) => (
                <span key={a.id} className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-zinc-300">
                  {a.key} {a.comparator !== "=" ? a.comparator : ""} {a.raw_value}{a.unit && ` ${a.unit}`}
                  {a.normalized_value != null && ` → ${a.normalized_value} ${a.canonical_unit}`}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-none items-center gap-2 text-[11px] text-zinc-500">
          <span>pg {req.source_page ?? "—"}</span>
          <span className={CONF_COLOR[req.confidence]}>{req.confidence}</span>
          {!editing && <button onClick={() => setEditing(true)} className="rounded bg-white/5 px-2 py-1 hover:bg-white/10">Edit</button>}
        </div>
      </div>
    </div>
  );
}
