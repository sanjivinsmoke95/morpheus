import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, EmptyState, FilterChip, PageHeader, Skeleton, StatusChip } from "@/components/ui";
import { useStandardsSearch } from "@/lib/morpheus";

const SECTORS = ["electrical", "mechanical", "materials", "civil", "construction", "water", "electronics", "food"];
type StatusFilter = "all" | "current" | "not-current";

export function StandardsLibraryPage() {
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState<string>("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const { data, isLoading } = useStandardsSearch(query, sector);

  const rows = useMemo(() => {
    const all = data ?? [];
    if (status === "current") return all.filter((s) => s.status === "ACTIVE");
    if (status === "not-current") return all.filter((s) => s.status !== "ACTIVE");
    return all;
  }, [data, status]);

  const currentCount = (data ?? []).filter((s) => s.status === "ACTIVE").length;

  return (
    <div>
      <PageHeader
        title="Standards Library"
        subtitle="Search the Indian Standards catalogue and open any standard to see its analysis context. Demo records are labelled Demo data."
      />

      <div className="relative mb-4">
        <svg
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search standards"
          placeholder="Search by IS number, title, or scope…"
          className="w-full rounded-xl border border-line bg-surface pl-10 pr-10 py-2.5 text-sm text-ink placeholder:text-muted/60 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 shadow-2xs"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-xs text-muted hover:bg-line/40 hover:text-ink transition-colors"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <FilterChip active={sector === ""} onClick={() => setSector("")}>All sectors</FilterChip>
        {SECTORS.map((s) => (
          <FilterChip key={s} active={sector === s} onClick={() => setSector(s)}>
            <span className="capitalize">{s}</span>
          </FilterChip>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted/70">Status</span>
        <FilterChip active={status === "all"} onClick={() => setStatus("all")} count={data?.length}>All</FilterChip>
        <FilterChip active={status === "current"} onClick={() => setStatus("current")} count={currentCount}>Current</FilterChip>
        <FilterChip active={status === "not-current"} onClick={() => setStatus("not-current")} count={(data?.length ?? 0) - currentCount}>Superseded / outdated</FilterChip>
      </div>

      {isLoading ? (
        <div className="space-y-2"><Skeleton className="h-14" /><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
      ) : !rows.length ? (
        <EmptyState>No standards match your search.</EmptyState>
      ) : (
        <>
          <div className="mb-2 text-xs text-muted tabular-nums">{rows.length} standard{rows.length === 1 ? "" : "s"}</div>
          <Card className="divide-y divide-line overflow-hidden p-0" hover={false}>
            {rows.map((s) => (
              <Link key={s.id} to={`/standards/${s.id}`}
                className="group flex items-center gap-3.5 px-4 py-3.5 transition-all duration-150 hover:bg-panel">
                <span className="w-28 flex-none font-tech text-sm font-bold text-primary group-hover:underline">{s.is_number}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{s.title}</span>
                  <span className="text-xs capitalize text-muted">{s.sector}</span>
                </span>
                <div className="flex flex-none items-center gap-2">
                  {s.data_origin === "DEMO_SYNTHETIC" && <StatusChip tone="neutral">Demo data</StatusChip>}
                  <StatusChip tone={s.status === "ACTIVE" ? "success" : "warning"}>{s.status}</StatusChip>
                  <span className="flex-none text-primary font-bold transition-transform group-hover:translate-x-1" aria-hidden>→</span>
                </div>
              </Link>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
