import { useParams } from "react-router-dom";
import { useCopilot, useHistoryCompare } from "@/lib/morpheus";

export function CopilotPage() {
  const { id = "" } = useParams();
  const { data: drafts } = useCopilot(id);
  const { data: history } = useHistoryCompare(id);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="text-xl font-semibold">Specification copilot</h1>
      <p className="mt-0.5 text-sm text-zinc-400">Draft suggestions from detected gaps. Nothing here changes the tender.</p>

      <div className="mt-5 space-y-2">
        {!drafts?.length ? (
          <div className="text-xs text-zinc-500">No draft suggestions — the spec looks complete for the detected categories.</div>
        ) : drafts.map((d, i) => (
          <div key={i} className="rounded-lg border border-amber-400/30 bg-amber-500/5 p-3 text-sm">
            <div className="text-[10px] font-medium uppercase tracking-wide text-amber-400">{d.label}</div>
            <div className="mt-1 text-zinc-200">{d.draft_text}</div>
            <div className="mt-1 text-xs text-zinc-500">{d.rationale}</div>
            {d.supporting_standard && <div className="mt-0.5 text-[11px] text-zinc-500">Supported by {d.supporting_standard}</div>}
          </div>
        ))}
      </div>

      <h2 className="mt-8 text-lg font-semibold">Historical comparison</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-black/20 p-3">
          <div className="text-sm font-medium">Similar past tenders</div>
          {!history?.similar?.length ? (
            <div className="mt-1 text-xs text-zinc-500">No comparable historical tenders yet.</div>
          ) : history.similar.map((s: any, i: number) => (
            <div key={i} className="mt-2 text-sm">
              <div className="truncate">{s.title}</div>
              <div className="text-[11px] text-zinc-500">{s.overlap_count} shared standard(s): {s.overlap.join(", ") || "—"}</div>
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
          <div className="font-medium">Differences</div>
          <div className="mt-2 text-xs">
            <div className="text-emerald-400">Newly appearing</div>
            <div className="text-zinc-400">{history?.newly_appearing?.join(", ") || "—"}</div>
          </div>
          <div className="mt-2 text-xs">
            <div className="text-amber-400">Used before, not here</div>
            <div className="text-zinc-400">{history?.potentially_missing?.join(", ") || "—"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
