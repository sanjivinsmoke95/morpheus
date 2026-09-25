import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AnalysisHeader } from "@/components/AnalysisHeader";
import { Button, Card, EmptyState, Skeleton, StatusChip, Tooltip, type Tone } from "@/components/ui";
import { EvidenceStrength, SectionHeader, strengthOf } from "@/components/workspace";
import {
  useAsk, useClauses, useDecide, useRecommendations, useRequirements,
  type AskAnswer, type Recommendation, type Requirement,
} from "@/lib/morpheus";

const STATUS_TONE: Record<string, Tone> = {
  ACCEPTED: "success", REJECTED: "danger", REVIEW: "warning", MARK_FOR_REVIEW: "warning", PENDING: "neutral",
};

type Selection = { page: number; is: string };

export function EvidencePage() {
  const { id = "" } = useParams();
  const { data: pages, isLoading } = useClauses(id);
  const { data: recs } = useRecommendations(id);
  const { data: reqs } = useRequirements(id);
  const decide = useDecide(id);

  const [activePage, setActivePage] = useState(0);
  const [sel, setSel] = useState<Selection | null>(null);

  const page = pages?.[activePage];
  const totalStandards = useMemo(() => (pages ?? []).reduce((n, p) => n + p.standards.length, 0), [pages]);

  const reqById = useMemo(() => new Map((reqs ?? []).map((r) => [r.id, r])), [reqs]);
  const recsByStd = useMemo(() => {
    const m = new Map<string, Recommendation[]>();
    for (const r of recs ?? []) {
      const k = r.standard.is_number;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    }
    return m;
  }, [recs]);

  // Resolve the recommendation that best represents a (page, standard) pairing:
  // prefer one whose requirement was extracted from this page, then the primary.
  function resolveRec(pageNo: number, isNumber: string): Recommendation | undefined {
    const list = recsByStd.get(isNumber) ?? [];
    if (!list.length) return undefined;
    const onPage = list.find((r) => reqById.get(r.requirement_id)?.source_page === pageNo);
    return onPage ?? list.find((r) => r.is_primary) ?? list[0];
  }

  const selected = sel ?? (page?.standards[0] ? { page: page.page_number, is: page.standards[0].is_number } : null);
  const selClause = page?.standards.find((s) => s.is_number === selected?.is);
  const selRec = selected ? resolveRec(selected.page, selected.is) : undefined;
  const selReq: Requirement | undefined = selRec ? reqById.get(selRec.requirement_id) : undefined;

  return (
    <div>
      <AnalysisHeader id={id} section="Evidence" />

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : !pages?.length ? (
        <EmptyState>No document pages found for this analysis.</EmptyState>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted">
            <span className="font-medium text-ink">Evidence workspace</span>
            <span aria-hidden>·</span>
            <span>Follow one match from the tender text through to a review decision.</span>
            <span className="ml-auto rounded-full bg-panel px-2.5 py-0.5 text-xs font-medium text-ink tabular-nums">
              {totalStandards} grounded match{totalStandards === 1 ? "" : "es"}
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-12">
            {/* LEFT — document pages */}
            <div className="lg:col-span-3">
              <Card className="p-4">
                <SectionHeader eyebrow="Document" title="Pages" />
                <div className="space-y-1.5">
                  {pages.map((p, i) => (
                    <button
                      key={p.page_number}
                      onClick={() => { setActivePage(i); setSel(null); }}
                      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                        i === activePage ? "border-primary bg-primary-soft text-primary" : "border-line hover:bg-panel"
                      }`}
                    >
                      <span className="font-tech">Page {p.page_number}</span>
                      {p.standards.length > 0 && (
                        <span className="rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold tabular-nums text-primary">
                          {p.standards.length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                {page && (
                  <div className="mt-4">
                    <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted/70">Source text</div>
                    <div className="font-evidence max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg border border-line bg-panel/40 p-3 text-[12px] leading-relaxed text-ink">
                      {highlight(page.text_excerpt, selClause?.evidence_text) || "No text on this page."}
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* CENTER — matches on this page */}
            <div className="lg:col-span-4">
              <Card className="p-4">
                <SectionHeader
                  eyebrow={`Page ${page?.page_number ?? "—"}`}
                  title="Matched on this page"
                  right={<span className="text-[11px] text-muted tabular-nums">{page?.standards.length ?? 0}</span>}
                />
                {!page?.standards.length ? (
                  <EmptyState>No standards matched a clause on this page. Try another page.</EmptyState>
                ) : (
                  <div className="space-y-2">
                    {page.standards.map((s, i) => {
                      const rec = resolveRec(page.page_number, s.is_number);
                      const isSel = selected?.is === s.is_number && selected?.page === page.page_number;
                      const strength = rec ? strengthOf(rec) : "INSUFFICIENT";
                      return (
                        <button
                          key={i}
                          onClick={() => setSel({ page: page.page_number, is: s.is_number })}
                          className={`block w-full rounded-xl border p-3 text-left transition-colors ${
                            isSel ? "border-primary bg-primary-soft/50 ring-1 ring-primary/20" : "border-line hover:bg-panel"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-tech text-sm font-semibold text-primary">{s.is_number}</span>
                            <span className="ml-auto"><EvidenceStrength level={strength} showLabel={false} /></span>
                          </div>
                          <div className="mt-0.5 truncate text-xs text-muted">{s.title}</div>
                          {s.evidence_text && (
                            <div className="font-evidence mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-ink">
                              “{s.evidence_text}”
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>

            {/* RIGHT — the chain: requirement → standard → why → strength → decision */}
            <div className="lg:col-span-5">
              {!selClause ? (
                <Card className="grid h-full place-items-center p-8 text-center text-sm text-muted">
                  Select a matched standard to trace its evidence chain.
                </Card>
              ) : (
                <Card className="p-4">
                  <SectionHeader eyebrow="Evidence chain" title="How this match was reached" />
                  <ol className="space-y-0">
                    <ChainStep n={1} label="Requirement">
                      {selReq ? (
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-tech text-sm font-semibold text-ink">{selReq.req_code}</span>
                            {selReq.source_page != null && (
                              <span className="font-tech text-[11px] text-muted">Page {selReq.source_page}</span>
                            )}
                          </div>
                          <p className="mt-0.5 text-sm text-ink">{selReq.description}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted">Matched at document level (no single source requirement).</p>
                      )}
                    </ChainStep>

                    <ChainStep n={2} label="Matched standard">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link to={`/standards/${selRec?.standard.id ?? ""}`} className="font-tech text-sm font-semibold text-primary hover:underline">
                          {selClause.is_number}
                        </Link>
                        {selRec && <StatusChip tone="info">{selRec.applicability_class.replace(/_/g, " ")}</StatusChip>}
                      </div>
                      <div className="mt-0.5 text-xs text-muted">{selClause.title}</div>
                    </ChainStep>

                    <ChainStep n={3} label="Evidence from the tender">
                      <div className="font-evidence rounded-lg border border-line bg-panel/40 px-3 py-2 text-[12px] leading-relaxed text-ink">
                        “{selClause.evidence_text || selRec?.evidence[0]?.text || "No source snippet retrieved."}”
                      </div>
                      <div className="mt-1 font-tech text-[10px] uppercase tracking-wide text-muted">
                        {selClause.role?.replace(/_/g, " ") || "reference"} · page {selected?.page}
                      </div>
                    </ChainStep>

                    <ChainStep n={4} label="Why it applies">
                      {selRec?.why && selRec.why.length > 0 ? (
                        <ul className="space-y-1">
                          {selRec.why.map((w, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-ink">
                              <span className="mt-0.5 text-success" aria-hidden>✓</span>
                              <span><span className="font-medium">{w.factor}</span>{w.detail ? <span className="text-muted"> — {w.detail}</span> : null}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted">{selRec?.rationale || "No structured factors provided for this match."}</p>
                      )}
                    </ChainStep>

                    <ChainStep n={5} label="Evidence strength" last={!selRec}>
                      <EvidenceStrength level={selRec ? strengthOf(selRec) : "INSUFFICIENT"} />
                    </ChainStep>

                    {selRec && (
                      <ChainStep n={6} label="Review decision" last>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusChip tone={STATUS_TONE[selRec.review_status] ?? "neutral"}>{selRec.review_status}</StatusChip>
                          <Tooltip text="Records an auditable decision. MORPHEUS assists the officer's judgement — it does not decide." />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button className="px-3 py-1.5 text-xs" disabled={decide.isPending}
                            onClick={() => decide.mutate({ target_type: "recommendation", target_id: selRec.id, decision: "ACCEPT", reason: "Accepted from evidence workspace" })}>Accept</Button>
                          <Button variant="secondary" className="px-3 py-1.5 text-xs" disabled={decide.isPending}
                            onClick={() => decide.mutate({ target_type: "recommendation", target_id: selRec.id, decision: "MARK_FOR_REVIEW", reason: "Flagged from evidence workspace" })}>Flag for review</Button>
                          <Button variant="danger" className="px-3 py-1.5 text-xs" disabled={decide.isPending}
                            onClick={() => decide.mutate({ target_type: "recommendation", target_id: selRec.id, decision: "REJECT", reason: "Rejected from evidence workspace" })}>Reject</Button>
                        </div>
                      </ChainStep>
                    )}
                  </ol>
                </Card>
              )}
            </div>
          </div>

          {/* Ask MORPHEUS — grounded assistant (preserved) */}
          <div className="mt-4">
            <AskPanel analysisId={id} />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-line bg-surface px-5 py-3">
            <span className="text-sm text-muted">
              <span className="font-semibold text-ink tabular-nums">{totalStandards}</span> standard match(es) grounded in the uploaded document.
            </span>
            <Link to={`/analyses/${id}/reports`} className="ml-auto text-sm font-medium text-primary hover:underline">View detailed report →</Link>
          </div>
        </>
      )}
    </div>
  );
}

/* One step in the vertical evidence chain, with a connector rail. */
function ChainStep({ n, label, children, last }: { n: number; label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-primary-soft text-[11px] font-bold text-primary tabular-nums">{n}</span>
        {!last && <span className="my-1 w-px flex-1 bg-line" aria-hidden />}
      </div>
      <div className={`min-w-0 flex-1 ${last ? "" : "pb-4"}`}>
        <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted/70">{label}</div>
        <div className="mt-1">{children}</div>
      </div>
    </li>
  );
}

/* Case-insensitively wrap the matched evidence snippet in a highlight mark. */
function highlight(text: string, snippet?: string) {
  if (!text || !snippet) return text;
  const clean = snippet.trim().slice(0, 120);
  const idx = text.toLowerCase().indexOf(clean.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-saffron-soft px-0.5 text-ink">{text.slice(idx, idx + clean.length)}</mark>
      {text.slice(idx + clean.length)}
    </>
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
    <Card className="p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-primary text-xs font-semibold text-white">M</span>
        <div>
          <div className="text-sm font-semibold text-ink">Ask MORPHEUS</div>
          <div className="text-[11px] text-muted">Answers are grounded in this analysis's evidence, and abstain when unsupported.</div>
        </div>
        <Tooltip text="Retrieval-based assistant. It cites the evidence it used, and says so when nothing supports an answer." />
      </div>

      {history.length === 0 ? (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button key={s} onClick={() => submit(s)} className="rounded-lg border border-line px-3 py-1.5 text-left text-xs text-ink hover:border-primary hover:text-primary">{s}</button>
          ))}
        </div>
      ) : (
        <div className="max-h-72 space-y-3 overflow-y-auto">
          {history.map((h, i) => (
            <div key={i}>
              <div className="ml-auto w-fit rounded-lg bg-primary px-3 py-1.5 text-xs text-white">{h.q}</div>
              <div className={`mt-1.5 rounded-lg px-3 py-2 text-xs leading-relaxed ${h.a.abstained ? "bg-warning-soft text-ink" : "bg-panel text-ink"}`}>
                {h.a.abstained && <span className="mr-1 font-semibold text-warning">Insufficient evidence:</span>}{h.a.answer}
                {h.a.citations.map((c, j) => (
                  <div key={j} className="mt-1.5 rounded border border-line bg-surface px-2 py-1 text-[11px]">
                    <span className="font-tech font-semibold text-primary">{c.is_number}</span> <span className="font-evidence">— {c.text}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit(q)}
          aria-label="Ask a question about this document"
          placeholder="Ask a question about this document…"
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-primary" />
        <Button className="px-3 py-2 text-xs" disabled={ask.isPending || !q.trim()} onClick={() => submit(q)}>{ask.isPending ? "…" : "Ask"}</Button>
      </div>
    </Card>
  );
}
