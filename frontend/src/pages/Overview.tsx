import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AnalysisTabs } from "@/components/AnalysisTabs";
import {
  Button, Card, EmptyState, PageHeader, SeverityPill, Skeleton, StatTile, StatusBanner, Tooltip,
} from "@/components/ui";
import {
  downloadReport, useAnalysis, useCoverageByCategory, useCreateReport, useIssues, useReadiness,
} from "@/lib/morpheus";
import { verdictFromReadiness } from "@/lib/verdict";

const SEV_MAP: Record<string, "critical" | "high" | "medium" | "low"> = {
  CRITICAL: "critical", HIGH: "high", MEDIUM: "medium", LOW: "low",
};

export function OverviewPage() {
  const { id = "" } = useParams();
  const { data: analysis } = useAnalysis(id);
  const { data: readiness, isLoading } = useReadiness(id);
  const { data: categories } = useCoverageByCategory(id);
  const { data: issues } = useIssues(id);
  const createReport = useCreateReport();
  const [busy, setBusy] = useState(false);

  const verdict = verdictFromReadiness(readiness);

  async function download() {
    setBusy(true);
    try {
      const rep = await createReport.mutateAsync({ analysisId: id, format: "PDF" });
      await downloadReport(rep.id, rep.format);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={analysis?.title ?? "Analysis"}
        subtitle={<>Tender compliance overview{analysis?.sector ? ` · ${analysis.sector}` : ""}</>}
        actions={
          <Button variant="secondary" onClick={download} disabled={busy}>
            {busy ? "Preparing…" : "Download report (PDF)"}
          </Button>
        }
      />
      <AnalysisTabs id={id} />

      {isLoading || !readiness ? (
        <Skeleton className="h-24" />
      ) : (
        <div className="space-y-6">
          <StatusBanner tone={verdict.tone} title={verdict.title} detail={verdict.detail} />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile value={readiness.requirements_total} label="Requirements"
              hint="Distinct requirements extracted from the specification." />
            <StatTile value={readiness.standards_identified} label="Standards matched" tone="info" />
            <StatTile value={readiness.gaps} label="Potential gaps"
              tone={readiness.gaps > 0 ? "warning" : "success"}
              hint="Applicable standards that may be missing from the spec." />
            <StatTile value={readiness.conflicts} label="Conflicts"
              tone={readiness.conflicts > 0 ? "danger" : "success"}
              hint="Contradictory values found within the specification." />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Coverage by category */}
            <Card className="p-5">
              <div className="mb-4 flex items-center gap-1.5">
                <h2 className="text-sm font-semibold text-ink">Coverage by requirement type</h2>
                <Tooltip text="How well each type of requirement is covered by an applicable standard: full, partial, or none." />
              </div>
              {!categories?.length ? (
                <EmptyState>No coverage computed.</EmptyState>
              ) : (
                <div className="space-y-3">
                  {categories.map((c) => {
                    const fpct = c.total ? (c.full / c.total) * 100 : 0;
                    const ppct = c.total ? (c.partial / c.total) * 100 : 0;
                    const mpct = c.total ? (c.missing / c.total) * 100 : 0;
                    return (
                      <div key={c.category}>
                        <div className="mb-1 flex items-baseline justify-between text-sm">
                          <span className="font-medium capitalize text-ink">{c.category.toLowerCase()}</span>
                          <span className="text-xs text-muted">{c.full}/{c.total} full</span>
                        </div>
                        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-panel">
                          <div className="h-full bg-success" style={{ width: `${fpct}%` }} />
                          <div className="h-full bg-warning" style={{ width: `${ppct}%` }} />
                          <div className="h-full bg-danger" style={{ width: `${mpct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex gap-4 pt-1 text-[11px] text-muted">
                    <span className="flex items-center gap-1"><i className="inline-block h-2 w-2 rounded-full bg-success" /> Full</span>
                    <span className="flex items-center gap-1"><i className="inline-block h-2 w-2 rounded-full bg-warning" /> Partial</span>
                    <span className="flex items-center gap-1"><i className="inline-block h-2 w-2 rounded-full bg-danger" /> None</span>
                  </div>
                </div>
              )}
            </Card>

            {/* Key findings */}
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ink">Key findings</h2>
                <Link to={`/analyses/${id}/issues`} className="text-xs font-medium text-primary hover:underline">
                  All issues →
                </Link>
              </div>
              {!issues?.length ? (
                <EmptyState>No issues found — the specification looks clean.</EmptyState>
              ) : (
                <div className="space-y-2">
                  {issues.slice(0, 4).map((i) => (
                    <div key={i.id} className="flex items-start gap-2.5 rounded-lg border border-line px-3 py-2">
                      <SeverityPill level={SEV_MAP[i.severity] ?? "low"} />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-ink">{i.title}</div>
                        <div className="mt-0.5 text-xs text-muted">{i.recommended_action}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Next steps */}
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-ink">Next steps</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <NextStep to={`/analyses/${id}/standards`} n={1} title="Review matched standards"
                detail="Confirm the applicable standards, note QCO-mandatory certification." />
              <NextStep to={`/analyses/${id}/issues`} n={2} title="Resolve issues & gaps"
                detail="Address conflicts and missing standards before tendering." />
              <NextStep to={`/analyses/${id}/reports`} n={3} title="Generate the report"
                detail="Curated summary + actions to advise the procurement agency." />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function NextStep({ to, n, title, detail }: { to: string; n: number; title: string; detail: string }) {
  return (
    <Link to={to} className="group rounded-xl border border-line p-4 transition-colors hover:border-primary hover:bg-primary-soft/40">
      <div className="mb-1.5 grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-bold text-white">{n}</div>
      <div className="text-sm font-semibold text-ink group-hover:text-primary">{title}</div>
      <div className="mt-0.5 text-xs text-muted">{detail}</div>
    </Link>
  );
}
