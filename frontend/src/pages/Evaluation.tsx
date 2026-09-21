import { useEvaluation, useRunEvaluation } from "@/lib/morpheus";

const METHOD_LABEL: Record<string, string> = {
  keyword: "Keyword (BM25)", vector: "Semantic (vector)", hybrid: "Hybrid", morpheus: "Morpheus (final)",
};

function pct(v: number | null) {
  return v == null ? "—" : `${Math.round(v * 100)}%`;
}

export function EvaluationPage() {
  const { data, isLoading, isError } = useEvaluation();
  const run = useRunEvaluation();

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Evaluation</h1>
          <p className="mt-0.5 text-sm text-zinc-400">Retrieval quality on a labelled gold set. Metrics are computed by the harness — never hand-entered.</p>
        </div>
        <button onClick={() => run.mutate()} disabled={run.isPending}
          className="rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-medium text-black hover:bg-emerald-400 disabled:opacity-50">
          {run.isPending ? "Running…" : "Re-run"}
        </button>
      </div>

      {isLoading ? (
        <div className="mt-6 h-40 animate-pulse rounded-lg bg-white/5" />
      ) : isError ? (
        <p className="mt-6 text-sm text-red-400">Evaluation is visible to admins and reviewers.</p>
      ) : !data?.methods?.length ? (
        <p className="mt-6 text-sm text-zinc-400">No evaluation run yet. Click “Re-run”.</p>
      ) : (
        <>
          <div className="mt-3 text-xs text-zinc-500">{data.cases} labelled cases · run “{data.run_label}”</div>
          <div className="mt-4 overflow-hidden rounded-lg border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-left text-xs uppercase text-zinc-400">
                <tr>
                  <th className="px-3 py-2">Method</th>
                  <th className="px-3 py-2 text-right">Precision@5</th>
                  <th className="px-3 py-2 text-right">Recall@5</th>
                  <th className="px-3 py-2 text-right">MRR</th>
                  <th className="px-3 py-2 text-right">Evidence</th>
                </tr>
              </thead>
              <tbody>
                {data.methods.map((m: any) => (
                  <tr key={m.method} className={`border-t border-white/5 ${m.method === "morpheus" ? "bg-emerald-500/5" : ""}`}>
                    <td className="px-3 py-2">{METHOD_LABEL[m.method] ?? m.method}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{pct(m.precision_at_5)}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{pct(m.recall_at_5)}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{m.mrr?.toFixed(2) ?? "—"}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{pct(m.evidence_precision)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
