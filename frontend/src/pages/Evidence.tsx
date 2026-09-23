import { useState } from "react";
import { useParams } from "react-router-dom";
import { AnalysisTabs } from "@/components/AnalysisTabs";
import { Button, Card, EmptyState, PageHeader, Skeleton, StatusChip, Tooltip } from "@/components/ui";
import { useAsk, useClauses, type AskAnswer } from "@/lib/morpheus";

export function EvidencePage() {
  const { id = "" } = useParams();
  const { data: pages, isLoading } = useClauses(id);
  const [activePage, setActivePage] = useState(0);

  const withStandards = (pages ?? []).filter((p) => p.standards.length > 0);
  const page = pages?.[activePage];

  return (
    <div>
      <PageHeader title="Evidence" subtitle="Every matched standard traced back to the exact clause in your document. Ask MORPHEUS answers only from this evidence." />
      <AnalysisTabs id={id} />

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : !pages?.length ? (
        <EmptyState>No document pages found.</EmptyState>
      ) : (
        <div className="grid gap-4 lg:grid-cols-12">
          {/* Page list */}
          <div className="lg:col-span-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Document pages</div>
            <div className="space-y-1.5">
              {pages.map((p, i) => (
                <button key={p.page_number} onClick={() => setActivePage(i)}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    i === activePage ? "border-primary bg-primary-soft text-primary" : "border-line bg-surface text-ink hover:bg-panel"
                  }`}>
                  <span>Page {p.page_number}</span>
                  {p.standards.length > 0 && (
                    <span className="rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">{p.standards.length}</span>
                  )}
                </button>
              ))}
            </div>
            {withStandards.length === 0 && (
              <p className="mt-3 text-xs text-muted">Evidence links appear on pages where a standard matched a clause.</p>
            )}
          </div>

          {/* Page content + linked standards */}
          <div className="lg:col-span-5">
            {page && (
              <Card className="p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Page {page.page_number} — extracted text</div>
                <div className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-lg bg-panel/50 p-3 text-xs leading-relaxed text-ink">
                  {page.text_excerpt || "No text on this page."}
                </div>
                <div className="mt-3">
                  <div className="mb-1.5 text-xs font-semibold text-ink">Standards grounded on this page ({page.standards.length})</div>
                  {page.standards.length === 0 ? (
                    <p className="text-xs text-muted">No standards matched a clause on this page.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {page.standards.map((s, i) => (
                        <div key={i} className="rounded-lg border border-line px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-primary">{s.is_number}</span>
                            <StatusChip tone="neutral">{s.role}</StatusChip>
                            <span className="ml-auto text-[10px] text-muted">{s.relevance}</span>
                          </div>
                          <div className="mt-0.5 text-[11px] text-muted">{s.title}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* Ask MORPHEUS */}
          <div className="lg:col-span-4">
            <AskPanel analysisId={id} />
          </div>
        </div>
      )}
    </div>
  );
}

function AskPanel({ analysisId }: { analysisId: string }) {
  const ask = useAsk(analysisId);
  const [q, setQ] = useState("");
  const [history, setHistory] = useState<{ q: string; a: AskAnswer }[]>([]);

  const suggestions = ["Which standards are QCO mandatory?", "Tell me about IS 16077", "What covers the LED luminaire?"];

  function submit(question: string) {
    if (!question.trim()) return;
    ask.mutate(question.trim(), { onSuccess: (a) => setHistory((h) => [{ q: question.trim(), a }, ...h]) });
    setQ("");
  }

  return (
    <Card className="flex h-full flex-col p-4">
      <div className="mb-1 flex items-center gap-1.5">
        <h2 className="text-sm font-semibold text-ink">Ask MORPHEUS</h2>
        <Tooltip text="A grounded assistant. It answers only from this analysis's stored evidence and abstains when it has none." />
      </div>
      <p className="mb-3 text-xs text-muted">Grounded in this tender's evidence. Abstains if unsupported.</p>

      <div className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit(q)}
          placeholder="Ask about a standard, QCO, or requirement…"
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary" />
        <Button className="px-3 py-2 text-xs" disabled={ask.isPending || !q.trim()} onClick={() => submit(q)}>
          {ask.isPending ? "…" : "Ask"}
        </Button>
      </div>

      {history.length === 0 && (
        <div className="mt-3 space-y-1.5">
          <div className="text-[11px] font-medium text-muted">Try:</div>
          {suggestions.map((s) => (
            <button key={s} onClick={() => submit(s)}
              className="block w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-left text-xs text-ink hover:border-primary hover:text-primary">
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto">
        {history.map((h, i) => (
          <div key={i}>
            <div className="text-xs font-semibold text-ink">{h.q}</div>
            <div className={`mt-1 rounded-lg px-3 py-2 text-xs leading-relaxed ${h.a.abstained ? "bg-warning-soft text-ink" : "bg-primary-soft/60 text-ink"}`}>
              {h.a.abstained && <span className="mr-1 font-semibold text-warning">Abstained:</span>}
              {h.a.answer}
              {h.a.citations.length > 0 && (
                <div className="mt-2 space-y-1 border-t border-line/60 pt-2">
                  {h.a.citations.map((c, j) => (
                    <div key={j} className="text-[11px] text-muted">
                      <span className="font-semibold text-primary">{c.is_number}</span> — {c.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
