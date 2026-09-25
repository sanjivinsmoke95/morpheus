import { useState } from "react";
import { Button, Card, Tooltip } from "@/components/ui";
import { useAsk, type AskAnswer, type AskSource } from "@/lib/morpheus";

const DEFAULT_SUGGESTIONS = [
  "Why was this standard matched?",
  "Which requirements have insufficient evidence?",
  "Which issues need human review?",
  "Summarize the unresolved gaps.",
];

const SOURCE_LABEL: Record<string, string> = {
  standard: "Standard", tender: "Tender clause", requirement: "Requirement", qco: "Regulatory",
};

/** Shared grounded-answer panel for Ask MORPHEUS (Evidence) and Copilot.
 *  Renders the configured model's cited answer, or an explicit abstention, with
 *  the retrieved evidence it was grounded in. Professional research layout — no
 *  chat avatars, bubbles or fake typing. */
export function AIAnswerPanel({
  analysisId,
  suggestions = DEFAULT_SUGGESTIONS,
  compact = false,
}: {
  analysisId: string;
  suggestions?: string[];
  compact?: boolean;
}) {
  const ask = useAsk(analysisId);
  const [q, setQ] = useState("");
  const [history, setHistory] = useState<{ q: string; a: AskAnswer }[]>([]);

  function submit(question: string) {
    const text = question.trim();
    if (!text || ask.isPending) return;
    ask.mutate(text, { onSuccess: (a) => setHistory((h) => [{ q: text, a }, ...h]) });
    setQ("");
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-primary text-xs font-semibold text-white">M</span>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-ink">Ask MORPHEUS</div>
          <div className="text-[11px] text-muted">Ask about this tender, its requirements, standards, or evidence.</div>
        </div>
        <span className="ml-auto"><Tooltip text="Answers are grounded in this analysis's retrieved evidence and cite their sources. When the evidence is insufficient, MORPHEUS says so rather than guessing." /></span>
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit(q)}
          aria-label="Ask a question about this analysis"
          placeholder="Ask about requirements, standards, evidence or issues…"
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary"
        />
        <Button className="px-4 py-2 text-sm" disabled={ask.isPending || !q.trim()} onClick={() => submit(q)}>
          {ask.isPending ? "Thinking…" : "Ask"}
        </Button>
      </div>

      {history.length === 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => submit(s)}
              className="rounded-lg border border-line px-3 py-1.5 text-left text-xs text-ink transition-colors hover:border-primary hover:text-primary"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <div className={`mt-4 space-y-4 ${compact ? "max-h-80 overflow-y-auto pr-1" : ""}`}>
          {history.map((h, i) => (
            <AnswerBlock key={i} question={h.q} a={h.a} />
          ))}
        </div>
      )}
    </Card>
  );
}

function AnswerBlock({ question, a }: { question: string; a: AskAnswer }) {
  const engineLLM = (a.engine ?? "").startsWith("llm");
  return (
    <div className="border-t border-line pt-3 first:border-t-0 first:pt-0">
      <div className="text-sm font-semibold text-ink">{question}</div>

      <div className={`mt-1.5 rounded-lg px-3 py-2.5 text-sm leading-relaxed ${a.abstained ? "bg-warning-soft" : "bg-panel/60"}`}>
        {a.abstained && <span className="mr-1 font-semibold text-warning">Insufficient evidence.</span>}
        <span className="text-ink">{a.answer}</span>
        {a.abstained && a.reason && <div className="mt-1 text-xs text-muted">Missing: {a.reason}</div>}

        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
          <span className="rounded-full bg-surface px-2 py-0.5 font-semibold uppercase tracking-wide text-muted ring-1 ring-line">
            {engineLLM ? "AI · grounded" : "Evidence match"}
          </span>
          {a.confidence && !a.abstained && (
            <span className="inline-flex items-center gap-1 text-muted">
              <span className={`h-1.5 w-1.5 rounded-full ${a.confidence === "high" ? "bg-success" : a.confidence === "medium" ? "bg-warning" : "bg-muted"}`} />
              {a.confidence} confidence
            </span>
          )}
        </div>
      </div>

      {a.sources && a.sources.length > 0 && (
        <div className="mt-2">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted/70">Sources</div>
          <div className="space-y-1.5">
            {a.sources.map((s) => <SourceRow key={s.ref} s={s} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function SourceRow({ s }: { s: AskSource }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-panel px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted">
          {SOURCE_LABEL[s.type] ?? s.type}
        </span>
        {s.is_number ? (
          <span className="font-tech text-xs font-semibold text-primary">{s.is_number}</span>
        ) : (
          <span className="font-tech text-xs font-semibold text-ink">{s.label}</span>
        )}
        {s.page != null && <span className="font-tech text-[10px] text-muted">Page {s.page}</span>}
      </div>
      {s.text && <div className="font-evidence mt-1 text-[12px] leading-relaxed text-ink">{s.text}</div>}
    </div>
  );
}
