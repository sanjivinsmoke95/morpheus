import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAnalysis } from "@/lib/morpheus";

const STAGES = [
  "QUEUED", "EXTRACTING", "OCR", "EXTRACTING_REQUIREMENTS", "RETRIEVING", "RANKING", "CLASSIFYING", "AUDITING", "READY",
];

export function ProcessingPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data: analysis } = useAnalysis(id, true);

  useEffect(() => {
    if (analysis?.status === "READY") {
      const t = setTimeout(() => navigate(`/analyses/${id}/requirements`), 500);
      return () => clearTimeout(t);
    }
  }, [analysis?.status, id, navigate]);

  const current = analysis?.status ?? "QUEUED";
  const failed = current === "FAILED";
  const idx = STAGES.indexOf(current);

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <h1 className="text-xl font-semibold">Processing</h1>
      <p className="mt-0.5 text-sm text-zinc-400">Extracting text, requirements, and matching standards…</p>

      {failed ? (
        <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          Analysis failed: {analysis?.stage_error || "unknown error"}.
        </div>
      ) : (
        <div className="mt-6 space-y-1.5">
          {STAGES.map((s, i) => {
            const done = idx > i;
            const active = idx === i;
            return (
              <div key={s} className="flex items-center gap-3 text-sm">
                <span
                  className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${
                    done ? "bg-emerald-500 text-black" : active ? "bg-emerald-500/30 text-emerald-200" : "bg-white/5 text-zinc-500"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </span>
                <span className={done ? "text-zinc-400" : active ? "text-emerald-300" : "text-zinc-600"}>
                  {s.replace(/_/g, " ").toLowerCase()}
                  {active && s !== "READY" ? "…" : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
