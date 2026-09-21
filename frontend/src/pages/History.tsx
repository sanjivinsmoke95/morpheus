import { Link } from "react-router-dom";
import { useAnalyses } from "@/lib/morpheus";

const STATUS_COLOR: Record<string, string> = {
  READY: "text-emerald-400", FAILED: "text-red-400",
};

export function HistoryPage() {
  const { data: analyses, isLoading } = useAnalyses();

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Analysis history</h1>
        <Link to="/analyses/new" className="rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-medium text-black hover:bg-emerald-400">
          + New analysis
        </Link>
      </div>

      {isLoading ? (
        <div className="mt-6 h-32 animate-pulse rounded-lg bg-white/5" />
      ) : !analyses?.length ? (
        <p className="mt-6 text-sm text-zinc-400">No analyses yet. Start one above.</p>
      ) : (
        <div className="mt-5 divide-y divide-white/5 rounded-lg border border-white/10 bg-black/20">
          {analyses.map((a) => (
            <Link
              key={a.id}
              to={a.status === "READY" ? `/analyses/${a.id}/requirements` : `/analyses/${a.id}/processing`}
              className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/5"
            >
              <span className="min-w-0 flex-1 truncate">{a.title || a.id}</span>
              <span className="text-xs text-zinc-500">{a.sector || "—"}</span>
              <span className={`text-xs ${STATUS_COLOR[a.status] ?? "text-amber-400"}`}>{a.status}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
