import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, EmptyState, FilterChip, PageHeader, Skeleton, StatusChip } from "@/components/ui";
import { useStandardsSearch } from "@/lib/morpheus";

const SECTORS = ["electrical", "mechanical", "materials", "civil", "construction", "water", "electronics", "food"];

export function StandardsLibraryPage() {
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState<string>("");
  const { data, isLoading } = useStandardsSearch(query, sector);

  return (
    <div>
      <PageHeader
        title="Standards Library"
        subtitle="Search the Indian Standards catalogue. Demo records are labelled DEMO_SYNTHETIC."
      />

      <div className="mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by IS number, title, or scope…"
          className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink outline-none focus:border-primary"
        />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <FilterChip active={sector === ""} onClick={() => setSector("")}>All sectors</FilterChip>
        {SECTORS.map((s) => (
          <FilterChip key={s} active={sector === s} onClick={() => setSector(s)}>
            <span className="capitalize">{s}</span>
          </FilterChip>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2"><Skeleton className="h-14" /><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
      ) : !data?.length ? (
        <EmptyState>No standards match your search.</EmptyState>
      ) : (
        <Card>
          {data.map((s) => (
            <Link key={s.id} to={`/standards/${s.id}`}
              className="flex items-center gap-3 border-b border-line px-4 py-3 transition-colors last:border-b-0 hover:bg-panel">
              <span className="w-28 flex-none text-sm font-semibold tabular-nums text-primary">{s.is_number}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-ink">{s.title}</span>
                <span className="text-xs capitalize text-muted">{s.sector}</span>
              </span>
              {s.data_origin === "DEMO_SYNTHETIC" && <StatusChip tone="neutral">DEMO</StatusChip>}
              <StatusChip tone={s.status === "ACTIVE" ? "success" : "warning"}>{s.status}</StatusChip>
              <span className="flex-none text-primary">→</span>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
