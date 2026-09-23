import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AnalysisTabs } from "@/components/AnalysisTabs";
import { Card, EmptyState, PageHeader, Skeleton, StatusChip, type Tone } from "@/components/ui";
import {
  useAnalysis,
  useCoverage,
  useRecommendations,
  type CoverageLevel,
  type CoverageRow,
} from "@/lib/morpheus";

const COVERAGE_META: Record<CoverageLevel, { tone: Tone; label: string; icon: string }> = {
  FULL: { tone: "success", label: "Covered", icon: "✓" },
  PARTIAL: { tone: "warning", label: "Partial", icon: "⚠" },
  MISSING: { tone: "danger", label: "Missing", icon: "⛔" },
};

const ORDER: CoverageLevel[] = ["MISSING", "PARTIAL", "FULL"];

export function StandardsPage() {
  const { id = "" } = useParams();
  const { data: analysis } = useAnalysis(id);
  const { data: coverage, isLoading } = useCoverage(id);
  const { data: recs } = useRecommendations(id);

  // Deduped standards identified, with their DB id for detail links.
  const stdById = new Map<string, { id: string; is_number: string; title: string }>();
  (recs ?? []).forEach((r) => {
    if (!r.excluded) stdById.set(r.standard.id, r.standard);
  });

  const rows = [...(coverage ?? [])].sort(
    (a, b) => ORDER.indexOf(a.coverage) - ORDER.indexOf(b.coverage),
  );

  return (
    <div>
      <PageHeader
        title={analysis?.title ?? "Standards"}
        subtitle="Every requirement in the tender and the standard that covers it."
      />
      <AnalysisTabs id={id} />

      {isLoading ? (
        <Skeleton className="h-40" />
      ) : rows.length === 0 ? (
        <EmptyState>No coverage results yet.</EmptyState>
      ) : (
        <div className="space-y-6">
          <Card>
            <div className="border-b border-line px-4 py-3 text-sm font-semibold text-ink">
              Requirement coverage ({rows.length})
            </div>
            <div>
              {rows.map((row) => (
                <CoverageItem key={row.id} row={row} />
              ))}
            </div>
          </Card>

          {stdById.size > 0 && (
            <Card>
              <div className="border-b border-line px-4 py-3 text-sm font-semibold text-ink">
                Standards identified ({stdById.size})
              </div>
              <div className="grid gap-2 p-4 sm:grid-cols-2">
                {[...stdById.values()].map((s) => (
                  <Link
                    key={s.id}
                    to={`/standards/${s.id}`}
                    className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm transition-colors hover:bg-panel"
                  >
                    <span className="min-w-0">
                      <span className="font-semibold text-ink">{s.is_number}</span>
                      <span className="ml-2 truncate text-muted">{s.title}</span>
                    </span>
                    <span className="flex-none text-primary">→</span>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function CoverageItem({ row }: { row: CoverageRow }) {
  const [open, setOpen] = useState(false);
  const meta = COVERAGE_META[row.coverage];
  return (
    <div className="border-b border-line last:border-b-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-panel"
      >
        <StatusChip tone={meta.tone} className="mt-0.5 flex-none">
          {meta.icon} {meta.label}
        </StatusChip>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-ink">
            {row.requirement ?? row.requirement_code ?? "Requirement"}
          </span>
          {row.standard && (
            <span className="mt-0.5 block text-xs text-muted">Matched standard: {row.standard}</span>
          )}
        </span>
        <span className={`flex-none text-xs text-muted transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="bg-panel px-4 py-3 text-sm text-muted">
          {row.explanation || "No further detail."}
        </div>
      )}
    </div>
  );
}
