import { useFeedback } from "@/lib/morpheus";

export function FeedbackPage() {
  const { data, isLoading, isError } = useFeedback();

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-xl font-semibold">Feedback</h1>
      <p className="mt-0.5 text-sm text-zinc-400">Officer decisions captured for review. Data only — no automatic retraining.</p>

      {isLoading ? (
        <div className="mt-6 h-24 animate-pulse rounded-lg bg-white/5" />
      ) : isError ? (
        <p className="mt-6 text-sm text-red-400">Feedback is visible to administrators.</p>
      ) : !data?.length ? (
        <p className="mt-6 text-sm text-zinc-400">No feedback captured yet.</p>
      ) : (
        <div className="mt-5 divide-y divide-white/5 rounded-lg border border-white/10 bg-black/20">
          {data.map((f) => (
            <div key={f.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase ${f.decision === "ACCEPT" ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>{f.decision}</span>
              <span className="min-w-0 flex-1 truncate text-zinc-400">{f.reason || "—"}</span>
              <span className="text-[11px] text-zinc-600">{new Date(f.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
