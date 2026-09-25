import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AnalysisTabs } from "@/components/AnalysisTabs";
import { WorkflowStepper } from "@/components/workspace";
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
    <div className="relative mb-5">
      {/* tricolor wave decoration */}
      <div className="pointer-events-none absolute right-0 top-0 hidden h-20 w-72 opacity-70 lg:block"
        style={{ background: "radial-gradient(120% 80% at 100% 0,rgba(255,153,51,.18),transparent 45%),radial-gradient(120% 80% at 80% 0,rgba(19,136,8,.16),transparent 45%)" }} />

      <div className="relative">
        <div className="text-xs text-muted">
          <Link to="/history" className="hover:text-primary">My Tenders</Link>
          <span className="mx-1.5">›</span>
          <span className="text-ink">{title}</span>
          <span className="mx-1.5">›</span>
          <span className="font-medium text-ink">{section}</span>
        </div>

        <div className="mt-1.5 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">{title}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ready ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}>
              {ready ? "Completed" : "Processing"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={download} disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50">
              ⬇ {busy ? "Preparing…" : "Download Report"}
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink hover:bg-panel">⇗ Share</button>
            <button className="rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-muted hover:bg-panel">⋯</button>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted">
          <Meta k="Document" v={doc?.filename || "—"} />
          {date && <Meta k="Analyzed" v={date} mono />}
          {analysis?.sector && <Meta k="Sector" v={analysis.sector} accent />}
          {doc?.page_count ? <Meta k="Pages" v={String(doc.page_count)} mono /> : null}
          {right}
        </div>

        {analysis?.workflow_status && ready && (
          <div className="mt-3">
            <WorkflowStepper status={analysis.workflow_status} />
          </div>
        )}
      </div>

      <div className="mt-3">
        <AnalysisTabs id={id} />
      </div>
    </div>
  );
}

function Meta({ k, v, mono, accent }: { k: string; v: string; mono?: boolean; accent?: boolean }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted/70">{k}</span>
      <span className={`${mono ? "font-tech" : ""} ${accent ? "font-medium capitalize text-saffron" : "text-ink"}`}>{v}</span>
    </span>
  );
}
