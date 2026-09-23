import { useParams } from "react-router-dom";
import { AnalysisTabs } from "@/components/AnalysisTabs";
import { Button, Card, PageHeader } from "@/components/ui";
import { downloadReport, useCreateReport } from "@/lib/morpheus";

export function ReportsPage() {
  const { id = "" } = useParams();
  const create = useCreateReport();

  async function make(format: "PDF" | "DOCX") {
    const report = await create.mutateAsync({ analysisId: id, format });
    await downloadReport(report.id, format);
  }

  return (
    <div>
      <PageHeader
        title="Compliance report"
        subtitle="A full audit record: requirements, applicable standards, evidence, gaps, conflicts, and your decisions."
      />
      <AnalysisTabs id={id} />

      <Card className="p-6">
        <p className="text-sm text-muted">
          Download a shareable report to attach to the tender file or send to a colleague for review.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button onClick={() => make("PDF")} disabled={create.isPending}>
            {create.isPending ? "Generating…" : "Download PDF"}
          </Button>
          <Button variant="secondary" onClick={() => make("DOCX")} disabled={create.isPending}>
            Download DOCX
          </Button>
        </div>
        {create.isError && <p className="mt-3 text-sm text-danger">Could not generate the report.</p>}
      </Card>
    </div>
  );
}
