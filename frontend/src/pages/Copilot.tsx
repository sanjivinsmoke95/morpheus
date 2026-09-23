import { useParams } from "react-router-dom";
import { AnalysisHeader } from "@/components/AnalysisHeader";
import { Card } from "@/components/ui";
import { useCopilot, useHistoryCompare } from "@/lib/morpheus";

export function CopilotPage() {
  const { id = "" } = useParams();
  const { data: drafts } = useCopilot(id);
  const { data: history } = useHistoryCompare(id);

  return (
    <div>
      <AnalysisHeader id={id} section="Copilot & history" />

      <div className="space-y-2">
        {!drafts?.length ? (
          <div className="text-sm text-muted">No draft suggestions — the spec looks complete for the detected categories.</div>
        ) : drafts.map((d, i) => (
          <div key={i} className="rounded-xl border border-warning/30 bg-warning-soft p-3 text-sm">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-warning">{d.label}</div>
            <div className="mt-1 text-ink">{d.draft_text}</div>
            <div className="mt-1 text-xs text-muted">{d.rationale}</div>
            {d.supporting_standard && <div className="mt-0.5 text-[11px] text-muted">Supported by {d.supporting_standard}</div>}
          </div>
        ))}
      </div>

      <h2 className="mt-8 text-lg font-semibold text-ink">Historical comparison</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Card className="p-3">
          <div className="text-sm font-medium text-ink">Similar past tenders</div>
          {!history?.similar?.length ? (
            <div className="mt-1 text-xs text-muted">No comparable historical tenders yet.</div>
          ) : history.similar.map((s: any, i: number) => (
            <div key={i} className="mt-2 text-sm">
              <div className="truncate text-ink">{s.title}</div>
              <div className="text-[11px] text-muted">{s.overlap_count} shared standard(s): {s.overlap.join(", ") || "—"}</div>
            </div>
          ))}
        </Card>
        <Card className="p-3 text-sm">
          <div className="font-medium text-ink">Differences</div>
          <div className="mt-2 text-xs">
            <div className="font-medium text-success">Newly appearing</div>
            <div className="text-muted">{history?.newly_appearing?.join(", ") || "—"}</div>
          </div>
          <div className="mt-2 text-xs">
            <div className="font-medium text-warning">Used before, not here</div>
            <div className="text-muted">{history?.potentially_missing?.join(", ") || "—"}</div>
          </div>
        </Card>
      </div>
    </div>
  );
}
