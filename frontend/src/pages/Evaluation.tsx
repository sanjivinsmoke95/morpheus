import { Button, Card, PageHeader, Skeleton } from "@/components/ui";
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
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Evaluation"
        subtitle="Retrieval quality on a labelled gold set. Metrics are computed by the harness — never hand-entered."
        actions={
          <Button onClick={() => run.mutate()} disabled={run.isPending}>
            {run.isPending ? "Running…" : "Re-run"}
          </Button>
        }
      />

      {isLoading ? (
        <Skeleton className="h-40" />
      ) : isError ? (
        <p className="text-sm text-danger">Evaluation is visible to admins and reviewers.</p>
      ) : !data?.methods?.length ? (
        <p className="text-sm text-muted">No evaluation run yet. Click “Re-run”.</p>
      ) : (
        <>
          <div className="mb-3 text-xs text-muted">{data.cases} labelled cases · run “{data.run_label}”</div>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-panel text-left text-xs uppercase text-muted">
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
                    <tr key={m.method} className={`border-t border-line ${m.method === "morpheus" ? "bg-primary-soft" : ""}`}>
                      <td className="px-3 py-2 font-medium text-ink">{METHOD_LABEL[m.method] ?? m.method}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink">{pct(m.precision_at_5)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink">{pct(m.recall_at_5)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink">{m.mrr?.toFixed(2) ?? "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink">{pct(m.evidence_precision)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
