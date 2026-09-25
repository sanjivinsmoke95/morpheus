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

      <div className="mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search standards"
          placeholder="Search by IS number, title, or scope…"
          className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink outline-none focus:border-primary"
        />
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
          <Card>
            {rows.map((s) => (
              <Link key={s.id} to={`/standards/${s.id}`}
                className="flex items-center gap-3 border-b border-line px-4 py-3 transition-colors last:border-b-0 hover:bg-panel">
                <span className="w-28 flex-none font-tech text-sm font-semibold text-primary">{s.is_number}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink">{s.title}</span>
                  <span className="text-xs capitalize text-muted">{s.sector}</span>
                </span>
                {s.data_origin === "DEMO_SYNTHETIC" && <StatusChip tone="neutral">Demo data</StatusChip>}
                <StatusChip tone={s.status === "ACTIVE" ? "success" : "warning"}>{s.status}</StatusChip>
                <span className="flex-none text-primary" aria-hidden>→</span>
              </Link>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
