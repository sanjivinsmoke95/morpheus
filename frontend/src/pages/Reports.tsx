import { useParams } from "react-router-dom";
import { downloadReport, useCreateReport } from "@/lib/morpheus";

export function ReportsPage() {
  const { id = "" } = useParams();
  const create = useCreateReport();

  async function make(format: "PDF" | "DOCX") {
    const report = await create.mutateAsync({ analysisId: id, format });
    await downloadReport(report.id, format);
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-xl font-semibold">Procurement report</h1>
      <p className="mt-0.5 text-sm text-zinc-400">
        Generate an audit report of extracted requirements, applicable standards, evidence, and your decisions.
      </p>

      <div className="mt-6 flex gap-3">
        <button onClick={() => make("PDF")} disabled={create.isPending}
          className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-black hover:bg-emerald-400 disabled:opacity-50">
          {create.isPending ? "Generating…" : "Download PDF"}
        </button>
        <button onClick={() => make("DOCX")} disabled={create.isPending}
          className="rounded-md bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20 disabled:opacity-50">
          Download DOCX
        </button>
      </div>
      {create.isError && <p className="mt-3 text-sm text-red-400">Could not generate the report.</p>}
    </div>
  );
}
