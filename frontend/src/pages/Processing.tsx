import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, PageHeader } from "@/components/ui";
import { useAnalysis } from "@/lib/morpheus";

const STAGES = [
  "QUEUED", "EXTRACTING", "OCR", "EXTRACTING_REQUIREMENTS", "RETRIEVING", "RANKING", "CLASSIFYING", "AUDITING", "READY",
];

const LABELS: Record<string, string> = {
  QUEUED: "Queued",
  EXTRACTING: "Reading the document",
  OCR: "Recognising scanned text",
  EXTRACTING_REQUIREMENTS: "Extracting requirements",
  RETRIEVING: "Searching Indian Standards",
  RANKING: "Ranking applicable standards",
  CLASSIFYING: "Classifying applicability",
  AUDITING: "Checking coverage, gaps & conflicts",
  READY: "Complete",
};

export function ProcessingPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data: analysis } = useAnalysis(id, true);

  useEffect(() => {
    if (analysis?.status === "READY") {
      const t = setTimeout(() => navigate(`/analyses/${id}`), 500);
      return () => clearTimeout(t);
    }
  }, [analysis?.status, id, navigate]);

  const current = analysis?.status ?? "QUEUED";
  const failed = current === "FAILED";
  const idx = STAGES.indexOf(current);

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Analysing tender"
        subtitle="Extracting requirements and matching them against the Indian Standards ecosystem."
      />

      {failed ? (
        <Card className="border-danger/30 bg-danger-soft p-4 text-sm text-danger">
          Analysis failed: {analysis?.stage_error || "unknown error"}.
        </Card>
      ) : (
        <Card className="p-5">
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-primary-soft/60 px-3 py-2.5 text-xs text-ink">
            <span className="text-primary">ⓘ</span>
            <span>
              This usually takes <span className="font-semibold">30–60 seconds</span>. You can leave this page —
              the analysis keeps running and will appear in your dashboard when it's ready.
            </span>
          </div>
          <div className="space-y-2.5">
            {STAGES.map((s, i) => {
              const done = idx > i;
              const active = idx === i;
              return (
                <div key={s} className="flex items-center gap-3 text-sm">
                  <span
                    className={`grid h-6 w-6 flex-none place-items-center rounded-full text-xs font-semibold ${
                      done
                        ? "bg-success text-white"
                        : active
                          ? "bg-primary text-white"
                          : "bg-panel text-muted"
                    }`}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  <span className={done ? "text-muted" : active ? "font-medium text-ink" : "text-muted/60"}>
                    {LABELS[s] ?? s}
                    {active && s !== "READY" ? "…" : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
