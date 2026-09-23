import { useParams } from "react-router-dom";
import { AnalysisTabs } from "@/components/AnalysisTabs";
import {
  Button, Card, EmptyState, PageHeader, SectionAccordion, Skeleton, StatTile, StatusBanner,
  StatusChip, type Tone,
} from "@/components/ui";
import { downloadReport, useCreateReport, useReportSummary, type ReportSummary } from "@/lib/morpheus";
import { MiiCard } from "@/components/MiiCard";

const VERDICT_TONE: Record<string, Tone> = {
  "READY TO TENDER": "success", "REVIEW RECOMMENDED": "warning",
  "ACTION REQUIRED": "danger", "REVIEW REQUIRED": "neutral",
};

export function ReportsPage() {
  const { id = "" } = useParams();
  const { data: summary, isLoading } = useReportSummary(id);
  const create = useCreateReport();

  async function make(format: "PDF" | "DOCX") {
    const report = await create.mutateAsync({ analysisId: id, format });
    await downloadReport(report.id, format);
  }

  return (
    <div>
      <PageHeader
        title="Compliance report"
        subtitle="A curated summary for the procurement file — the strongest matches and what to advise the agency."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => make("PDF")} disabled={create.isPending}>
              {create.isPending ? "Generating…" : "Download PDF (audit record)"}
            </Button>
            <Button variant="secondary" onClick={() => make("DOCX")} disabled={create.isPending}>DOCX</Button>
          </div>
        }
      />
      <AnalysisTabs id={id} />

      {isLoading || !summary ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="space-y-6">
          <StatusBanner tone={VERDICT_TONE[summary.verdict] ?? "neutral"} title={summary.verdict} detail={summary.verdict_detail} />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <StatTile value={`${summary.compliance_pct}%`} label="Compliance"
              tone={summary.compliance_pct >= 70 ? "success" : summary.compliance_pct >= 40 ? "warning" : "danger"} />
            <StatTile value={summary.requirements_total} label="Requirements" />
            <StatTile value={summary.covered} label="Fully covered" tone="success" />
            <StatTile value={summary.partial} label="Partial" tone="warning" />
            <StatTile value={summary.mandatory_count} label="QCO mandatory" tone={summary.mandatory_count > 0 ? "danger" : "neutral"} />
          </div>

          {/* Advise the agency */}
          <Card className="p-5">
            <h2 className="mb-3 font-display text-lg font-semibold text-ink">Advise the procurement agency</h2>
            {summary.actions.length === 0 ? (
              <p className="text-sm text-muted">No blocking actions — the specification is ready to tender.</p>
            ) : (
              <ol className="space-y-2">
                {summary.actions.map((a, i) => {
                  const mandatory = a.startsWith("MANDATORY");
                  return (
                    <li key={i} className="flex gap-3">
                      <span className={`grid h-6 w-6 flex-none place-items-center rounded-full text-xs font-bold text-white ${mandatory ? "bg-danger" : "bg-primary"}`}>{i + 1}</span>
                      <span className={`text-sm ${mandatory ? "font-medium text-danger" : "text-ink"}`}>{a}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>

          <MiiCard analysisId={id} />

          {/* Key standards */}
          <Card>
            <div className="border-b border-line px-5 py-3">
              <h2 className="text-sm font-semibold text-ink">Key standards to require</h2>
            </div>
            {summary.top_rows.length === 0 ? (
              <div className="p-5"><EmptyState>No strong matches.</EmptyState></div>
            ) : (
              <div className="divide-y divide-line">
                {summary.top_rows.map((r) => <TopRow key={r.is_number} row={r} />)}
              </div>
            )}
          </Card>

          {summary.appendix_count > 0 && (
            <SectionAccordion title={`Appendix — ${summary.appendix_count} additional partial matches`}>
              <p className="px-4 py-3 text-sm text-muted">
                {summary.appendix_count} lower-relevance partial match(es) are recorded in MORPHEUS and kept out of the
                summary. Open the <span className="font-medium text-ink">Standards Review</span> tab to review them in full.
              </p>
            </SectionAccordion>
          )}
        </div>
      )}
    </div>
  );
}

function TopRow({ row }: { row: ReportSummary["top_rows"][number] }) {
  return (
    <div className="flex flex-wrap items-start gap-3 px-5 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-primary">{row.is_number}</span>
          {row.mandatory && <span className="rounded-md bg-danger px-2 py-0.5 text-[11px] font-bold text-white">⚠ QCO MANDATORY</span>}
          {row.is_demo && <StatusChip tone="neutral">DEMO</StatusChip>}
        </div>
        <div className="mt-0.5 text-xs text-muted">{row.title}</div>
        <div className="mt-1 text-sm text-ink">{row.advice}</div>
      </div>
      <div className="text-right">
        <div className="text-sm font-semibold tabular-nums text-ink">{row.match_pct}%</div>
        <div className="text-[11px] text-muted">{row.relevance}</div>
      </div>
    </div>
  );
}
