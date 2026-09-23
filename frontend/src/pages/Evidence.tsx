import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AnalysisHeader } from "@/components/AnalysisHeader";
import { Button, Card, EmptyState, Skeleton, Tooltip } from "@/components/ui";
import { useAsk, useClauses, type AskAnswer } from "@/lib/morpheus";

export function EvidencePage() {
  const { id = "" } = useParams();
  const { data: pages, isLoading } = useClauses(id);
  const [activePage, setActivePage] = useState(0);

  const page = pages?.[activePage];
  const totalStandards = useMemo(() => (pages ?? []).reduce((n, p) => n + p.standards.length, 0), [pages]);

  return (
    <div>
      <AnalysisHeader id={id} section="Evidence" />

      {isLoading ? <Skeleton className="h-64" /> : !pages?.length ? <EmptyState>No document pages found.</EmptyState> : (
        <div className="grid gap-4 lg:grid-cols-12">
          {/* Document Reference */}
          <div className="lg:col-span-3">
            <Card className="p-4">
              <div className="mb-2 text-sm font-semibold text-ink">Document Reference</div>
              <div className="space-y-1.5">
                {pages.map((p, i) => (
                  <button key={p.page_number} onClick={() => setActivePage(i)}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${i === activePage ? "border-primary bg-primary-soft text-primary" : "border-line hover:bg-panel"}`}>
                    <span>Page {p.page_number}</span>
                    {p.standards.length > 0 && <span className="rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">{p.standards.length}</span>}
                  </button>
                ))}
              </div>
              {page && (
                <div className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg bg-panel/50 p-3 text-[11px] leading-relaxed text-ink">
                  {page.text_excerpt || "No text on this page."}
                </div>
              )}
            </Card>
          </div>

          {/* Extracted Clauses & Evidence */}
          <div className="lg:col-span-5">
            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">Extracted Clauses & Evidence</span>
                <span className="text-[11px] text-muted">{totalStandards} matches</span>
              </div>
              {!page?.standards.length ? (
                <EmptyState>No standards matched a clause on page {page?.page_number}.</EmptyState>
              ) : (
                <div className="space-y-2.5">
                  {page.standards.map((s, i) => {
                    const matched = s.relevance === "HIGH";
                    return (
                      <div key={i} className="rounded-xl border border-line p-3">
                        <div className="flex items-center gap-2">
                          <span className={`grid h-5 w-5 place-items-center rounded text-[11px] text-white ${matched ? "bg-success" : "bg-warning"}`}>{matched ? "✓" : "≈"}</span>
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${matched ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}>{matched ? "Matched" : "Partial Match"}</span>
                          <span className="ml-auto text-[10px] text-muted">Page {page.page_number}</span>
                        </div>
                        <div className="mt-2 text-xs text-ink">{s.evidence_text}</div>
                        <div className="mt-2 flex items-center justify-between rounded-lg bg-panel/50 px-2.5 py-1.5">
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-primary">{s.is_number}</div>
                            <div className="truncate text-[10px] text-muted">{s.title}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Ask MORPHEUS */}
          <div className="lg:col-span-4">
            <AskPanel analysisId={id} />
          </div>
        </div>
      )}

      {/* Evidence summary footer */}
      {pages && pages.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-line bg-surface px-5 py-3">
          <span className="text-sm text-muted">
            <span className="font-semibold text-ink">{totalStandards}</span> standard match(es) grounded in the uploaded document.
          </span>
          <Link to={`/analyses/${id}/reports`} className="ml-auto text-sm font-medium text-primary hover:underline">View Detailed Report →</Link>
        </div>
      )}
    </div>
  );
}

function AskPanel({ analysisId }: { analysisId: string }) {
  const ask = useAsk(analysisId);
  const [q, setQ] = useState("");
  const [history, setHistory] = useState<{ q: string; a: AskAnswer }[]>([]);
  const suggestions = ["Which standards are QCO mandatory?", "What are the testing requirements?", "Show related QCOs for motors"];

  function submit(question: string) {
    if (!question.trim()) return;
    ask.mutate(question.trim(), { onSuccess: (a) => setHistory((h) => [{ q: question.trim(), a }, ...h]) });
    setQ("");
  }

  return (
    <Card className="flex h-full flex-col p-4">
      <div className="mb-1 flex items-center gap-1.5">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs text-white">M</span>
        <div>
          <div className="text-sm font-semibold text-ink">Ask MORPHEUS</div>
          <div className="text-[10px] text-muted">Your Procurement AI Assistant</div>
        </div>
        <Tooltip text="Grounded in this analysis's evidence. Abstains when unsupported." />
      </div>

      <div className="mt-2 min-h-0 flex-1 space-y-3 overflow-y-auto">
        {history.length === 0 ? (
          <div className="space-y-1.5">
            <div className="text-[11px] font-medium text-muted">Try asking:</div>
            {suggestions.map((s) => (
              <button key={s} onClick={() => submit(s)} className="block w-full rounded-lg border border-line px-3 py-1.5 text-left text-xs text-ink hover:border-primary hover:text-primary">{s}</button>
            ))}
          </div>
        ) : history.map((h, i) => (
          <div key={i}>
            <div className="ml-auto w-fit rounded-lg bg-primary px-3 py-1.5 text-xs text-white">{h.q}</div>
            <div className={`mt-1.5 rounded-lg px-3 py-2 text-xs leading-relaxed ${h.a.abstained ? "bg-warning-soft text-ink" : "bg-panel text-ink"}`}>
              {h.a.abstained && <span className="mr-1 font-semibold text-warning">Abstained:</span>}{h.a.answer}
              {h.a.citations.map((c, j) => (
                <div key={j} className="mt-1.5 rounded border border-line bg-surface px-2 py-1 text-[11px]">
                  <span className="font-semibold text-primary">{c.is_number}</span> — {c.text}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit(q)}
          placeholder="Ask a question about this document…"
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-primary" />
        <Button className="px-3 py-2 text-xs" disabled={ask.isPending || !q.trim()} onClick={() => submit(q)}>{ask.isPending ? "…" : "➤"}</Button>
      </div>
    </Card>
  );
}
