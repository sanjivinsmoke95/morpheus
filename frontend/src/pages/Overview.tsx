import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AnalysisTabs } from "@/components/AnalysisTabs";
import {
  ActionItem,
  Button,
  Card,
  EmptyState,
  LinkButton,
  Meter,
  PageHeader,
  Skeleton,
  Stat,
  StatusBanner,
} from "@/components/ui";
import {
  downloadReport,
  useAnalysis,
  useConflicts,
  useCoverage,
  useCreateReport,
  useDecide,
  useGaps,
  useReadiness,
  useVersionFindings,
} from "@/lib/morpheus";
import { buildActions, verdictFromReadiness } from "@/lib/verdict";

export function OverviewPage() {
  const { id = "" } = useParams();
  const { data: analysis } = useAnalysis(id);
  const { data: readiness, isLoading } = useReadiness(id);
  const { data: coverage } = useCoverage(id);
  const { data: conflicts } = useConflicts(id);
  const { data: gaps } = useGaps(id);
  const { data: versions } = useVersionFindings(id);

  const createReport = useCreateReport();
  const decide = useDecide(id);
  const [reviewed, setReviewed] = useState(false);

  const verdict = verdictFromReadiness(readiness);
  const actions = buildActions({ coverage, conflicts, gaps, versions });

  async function download() {
    const rep = await createReport.mutateAsync({ analysisId: id, format: "PDF" });
    await downloadReport(rep.id, rep.format);
  }

  function markReviewed() {
    decide.mutate(
      { target_type: "analysis", target_id: id, decision: "REVIEWED", reason: "Officer sign-off" },
      { onSuccess: () => setReviewed(true) },
    );
  }

  return (
    <div>
      <PageHeader
        title={analysis?.title ?? "Analysis"}
        subtitle={
          <>
            Tender compliance review
            {analysis?.sector ? ` · ${analysis.sector}` : ""}
          </>
        }
        actions={
          <>
            <Button variant="secondary" onClick={download} disabled={createReport.isPending}>
              {createReport.isPending ? "Preparing…" : "Download report"}
            </Button>
            <Button onClick={markReviewed} disabled={decide.isPending || reviewed}>
              {reviewed ? "Reviewed ✓" : "Mark as reviewed"}
            </Button>
          </>
        }
      />

      <AnalysisTabs id={id} />

      {isLoading ? (
        <Skeleton className="h-24" />
      ) : (
        <div className="space-y-6">
          <StatusBanner tone={verdict.tone} title={verdict.title} detail={verdict.detail} />

          {readiness && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="p-5 md:col-span-1">
                <Meter
                  value={readiness.requirements_covered}
                  total={readiness.requirements_total}
                  label="Requirements fully covered"
                  tone={verdict.tone}
                />
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <CoverageLine label="Fully covered" value={readiness.requirements_covered} tone="text-success" />
                  <CoverageLine label="Partially covered" value={readiness.requirements_partial} tone="text-warning" />
                  <CoverageLine label="Not covered" value={readiness.requirements_missing} tone="text-danger" />
                  <CoverageLine label="Standards identified" value={readiness.standards_identified} tone="text-ink" />
                </div>
              </Card>

              <div className="grid grid-cols-2 gap-4 md:col-span-2">
                <Stat value={readiness.conflicts} label="Specification conflicts" tone={readiness.conflicts > 0 ? "danger" : "success"} />
                <Stat value={readiness.gaps} label="Potential gaps" tone={readiness.gaps > 0 ? "warning" : "success"} />
                <Stat value={readiness.outdated_references} label="Outdated references" tone={readiness.outdated_references > 0 ? "warning" : "success"} />
                <Stat value={readiness.unresolved_references} label="Unresolved references" tone={readiness.unresolved_references > 0 ? "neutral" : "success"} />
              </div>
            </div>
          )}

          <Card>
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-sm font-semibold text-ink">
                Action required{actions.length > 0 ? ` (${actions.length})` : ""}
              </h2>
              <Link to={`/analyses/${id}/standards`} className="text-sm font-medium text-primary hover:underline">
                View all standards →
              </Link>
            </div>
            {actions.length === 0 ? (
              <div className="p-4">
                <EmptyState>
                  Nothing to fix — every requirement is covered and no conflicts were found.
                </EmptyState>
              </div>
            ) : (
              <div>
                {actions.slice(0, 8).map((a, i) => (
                  <ActionItem key={i} tone={a.tone} title={a.title} detail={a.detail} />
                ))}
                {actions.length > 8 && (
                  <div className="px-4 py-3 text-sm text-muted">
                    +{actions.length - 8} more —{" "}
                    <Link to={`/analyses/${id}/standards`} className="font-medium text-primary hover:underline">
                      see full list
                    </Link>
                  </div>
                )}
              </div>
            )}
          </Card>

          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={download} disabled={createReport.isPending}>
              {createReport.isPending ? "Preparing report…" : "Download compliance report (PDF)"}
            </Button>
            <LinkButton to={`/analyses/${id}/standards`} variant="ghost">
              Review standards checklist
            </LinkButton>
          </div>
        </div>
      )}
    </div>
  );
}

function CoverageLine({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-line px-3 py-2">
      <span className="text-muted">{label}</span>
      <span className={`font-semibold tabular-nums ${tone}`}>{value}</span>
    </div>
  );
}
