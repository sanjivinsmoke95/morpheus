import { Link, useParams } from "react-router-dom";
import { useReadiness } from "@/lib/morpheus";

const CARDS: { key: string; label: string; tone?: (v: number) => string }[] = [
  { key: "standards_identified", label: "Standards identified" },
  { key: "requirements_total", label: "Requirements" },
  { key: "requirements_covered", label: "Fully covered", tone: () => "text-emerald-400" },
  { key: "requirements_missing", label: "Uncovered", tone: (v) => (v > 0 ? "text-amber-400" : "text-zinc-200") },
  { key: "conflicts", label: "Conflicts", tone: (v) => (v > 0 ? "text-red-400" : "text-emerald-400") },
  { key: "gaps", label: "Potential gaps", tone: (v) => (v > 0 ? "text-amber-400" : "text-emerald-400") },
  { key: "outdated_references", label: "Outdated references", tone: (v) => (v > 0 ? "text-amber-400" : "text-emerald-400") },
  { key: "unresolved_references", label: "Unresolved references", tone: (v) => (v > 0 ? "text-zinc-400" : "text-emerald-400") },
  { key: "pending_review_items", label: "Items for review", tone: (v) => (v > 0 ? "text-sky-400" : "text-emerald-400") },
];

export function ReadinessPage() {
  const { id = "" } = useParams();
  const { data, isLoading } = useReadiness(id);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Procurement readiness</h1>
          <p className="mt-0.5 text-sm text-zinc-400">A snapshot of what's covered, missing, conflicting, or needs review.</p>
        </div>
        <Link to={`/analyses/${id}/audit`} className="rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20">Coverage & findings →</Link>
      </div>

      {isLoading ? (
        <div className="mt-6 h-32 animate-pulse rounded-lg bg-white/5" />
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {CARDS.map((c) => {
            const v = data?.[c.key] ?? 0;
            return (
              <div key={c.key} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className={`text-2xl font-semibold tabular-nums ${c.tone ? c.tone(v) : "text-zinc-100"}`}>{v}</div>
                <div className="mt-1 text-xs text-zinc-400">{c.label}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
