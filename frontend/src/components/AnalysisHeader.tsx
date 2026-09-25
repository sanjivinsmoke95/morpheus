import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AnalysisTabs } from "@/components/AnalysisTabs";
import { downloadReport, useAnalysis, useCreateReport, useDocument } from "@/lib/morpheus";

export function AnalysisHeader({ id, section, right }: { id: string; section: string; right?: ReactNode }) {
  const { data: analysis } = useAnalysis(id);
  const { data: doc } = useDocument(analysis?.document_id);
  const create = useCreateReport();
  const [busy, setBusy] = useState(false);

  const title = analysis?.title || doc?.filename || "Analysis";
  const ready = analysis?.status === "READY";
  const date = analysis?.created_at
    ? new Date(analysis.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "";

  async function download() {
    setBusy(true);
    try {
      const rep = await create.mutateAsync({ analysisId: id, format: "PDF" });
      await downloadReport(rep.id, rep.format);
    } finally { setBusy(false); }
  }

  return (
    <div className="mb-5">
      <div className="text-xs text-muted">
        <Link to="/history" className="font-medium hover:text-primary">← My Analyses</Link>
        <span className="mx-1.5 text-muted/50" aria-hidden>·</span>
        <span>{section}</span>
      </div>

      <div className="mt-1.5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-xl font-semibold text-ink sm:text-2xl">{title}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ready ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}>
              {ready ? "Completed" : "Processing"}
            </span>
          </div>
          {/* compact factual metadata — one restrained line */}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            {analysis?.sector && <span className="font-medium capitalize text-ink">{analysis.sector}</span>}
            {doc?.page_count ? <><Dot /><span className="font-tech">{doc.page_count} page{doc.page_count === 1 ? "" : "s"}</span></> : null}
            {date && <><Dot /><span>Analyzed <span className="font-tech">{date}</span></span></>}
            {right}
          </div>
        </div>
        <div className="flex flex-none items-center gap-2">
          <button onClick={download} disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50">
            {busy ? "Preparing…" : "Download Report"}
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink hover:bg-panel">Share</button>
          <button aria-label="More actions" className="rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-muted hover:bg-panel">⋯</button>
        </div>
      </div>

      <div className="mt-4">
        <AnalysisTabs id={id} />
      </div>
    </div>
  );
}

function Dot() {
  return <span className="text-muted/50" aria-hidden>·</span>;
}
