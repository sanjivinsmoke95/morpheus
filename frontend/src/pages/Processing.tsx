import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, PageHeader } from "@/components/ui";
import {
  useAnalysis, useIssues, useReadiness, useRecommendations, useRequirements,
} from "@/lib/morpheus";

const STAGES = [
  "QUEUED", "EXTRACTING", "OCR", "EXTRACTING_REQUIREMENTS", "RETRIEVING", "RANKING", "CLASSIFYING", "AUDITING", "READY",
];

const LABELS: Record<string, string> = {
  QUEUED: "Queued",
  EXTRACTING: "Document parsed",
  OCR: "Scanned text recognised",
  EXTRACTING_REQUIREMENTS: "Requirements extracted",
  RETRIEVING: "Standards retrieved",
  RANKING: "Candidates evaluated",
  CLASSIFYING: "Applicability classified",
  AUDITING: "Evidence & issues checked",
  READY: "Review prepared",
};

export function ProcessingPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data: analysis } = useAnalysis(id, true);

  const current = analysis?.status ?? "QUEUED";
  const ready = current === "READY";
  const failed = current === "FAILED";
  const idx = STAGES.indexOf(current);

  useEffect(() => {
    if (ready) {
      const t = setTimeout(() => navigate(`/analyses/${id}`), 1400);
      return () => clearTimeout(t);
    }
  }, [ready, id, navigate]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={ready ? "Analysis ready" : "MORPHEUS is analysing your tender"}
        subtitle="Extracting requirements and grounding them in the Indian Standards ecosystem."
      />

      {failed ? (
        <Card className="border-danger/30 bg-danger-soft p-4 text-sm text-danger">
          Analysis failed: {analysis?.stage_error || "unknown error"}.
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="p-5">
            {!ready && (
              <div className="mb-4 flex items-start gap-2 rounded-lg bg-primary-soft/60 px-3 py-2.5 text-xs text-ink">
                <span className="text-primary" aria-hidden>ⓘ</span>
                <span>
                  This usually takes <span className="font-semibold">30–60 seconds</span>. You can leave this page —
                  the analysis keeps running and appears in your dashboard when it's ready.
                </span>
              </div>
            )}
            <ol className="space-y-2.5">
              {STAGES.map((s, i) => {
                const done = idx > i || ready;
                const active = idx === i && !ready;
                return (
                  <li key={s} className="flex items-center gap-3 text-sm">
                    <span
                      className={`grid h-6 w-6 flex-none place-items-center rounded-full text-xs font-semibold transition-colors ${
                        done ? "bg-success text-white" : active ? "bg-primary text-white" : "bg-panel text-muted"
                      }`}
                      aria-hidden
                    >
                      {done ? "✓" : active ? "◉" : "○"}
                    </span>
                    <span className={done ? "text-muted" : active ? "font-medium text-ink" : "text-muted/60"}>
                      {LABELS[s] ?? s}
                      {active ? "…" : ""}
                    </span>
                  </li>
                );
              })}
            </ol>
          </Card>

          {/* Live counters — real values, shown only once the analysis is ready */}
          {ready && <ReadyCounters id={id} />}
        </div>
      )}
    </div>
  );
}

function ReadyCounters({ id }: { id: string }) {
  const { data: reqs } = useRequirements(id);
  const { data: recs } = useRecommendations(id);
  const { data: readiness } = useReadiness(id);
  const { data: issues } = useIssues(id);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Counter value={reqs?.length} label="Requirements" />
      <Counter value={readiness?.standards_identified} label="Standards mapped" />
      <Counter value={recs?.length} label="Candidate matches" />
      <Counter value={issues?.length} label="Issues detected" />
    </div>
  );
}

function Counter({ value, label }: { value: number | undefined; label: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 text-center">
      <div className="text-2xl font-semibold tabular-nums text-primary">{value ?? "—"}</div>
      <div className="mt-0.5 text-xs text-muted">{label}</div>
    </div>
  );
}
