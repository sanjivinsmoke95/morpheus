import { useParams } from "react-router-dom";
import { AnalysisHeader } from "@/components/AnalysisHeader";
import { AIAnswerPanel } from "@/components/AIAnswerPanel";
import { Card } from "@/components/ui";
import { SectionHeader } from "@/components/workspace";
import { useCopilot, useHistoryCompare } from "@/lib/morpheus";

const COPILOT_SUGGESTIONS = [
  "Why was this standard matched?",
  "Which requirements have insufficient evidence?",
  "What evidence supports the earthing requirement?",
  "Which issues need human review?",
  "Summarize the unresolved gaps.",
];

export function CopilotPage() {
  const { id = "" } = useParams();
  const { data: drafts } = useCopilot(id);
  const { data: history } = useHistoryCompare(id);

  return (
    <div>
      <AnalysisHeader id={id} section="Copilot" />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Primary: grounded research assistant */}
        <AIAnswerPanel analysisId={id} suggestions={COPILOT_SUGGESTIONS} />

        {/* Secondary: draft suggestions + historical comparison (preserved) */}
        <div className="space-y-4">
          <Card className="p-4">
            <SectionHeader eyebrow="Copilot" title="Draft suggestions" />
            {!drafts?.length ? (
              <p className="text-sm text-muted">No draft suggestions — the spec looks complete for the detected categories.</p>
            ) : (
              <div className="space-y-2">
                {drafts.map((d, i) => (
                  <div key={i} className="rounded-lg border border-warning/30 bg-warning-soft/60 p-3 text-sm">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-warning">{d.label}</div>
                    <div className="mt-1 text-ink">{d.draft_text}</div>
                    <div className="mt-1 text-xs text-muted">{d.rationale}</div>
                    {d.supporting_standard && (
                      <div className="mt-0.5 font-tech text-[11px] text-muted">Supported by {d.supporting_standard}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <p className="mt-2 text-[11px] text-muted">Suggestions are drafts for the officer to consider — not decisions.</p>
          </Card>

          <Card className="p-4">
            <SectionHeader eyebrow="History" title="Comparison" />
            <div className="text-xs font-semibold text-ink">Similar past tenders</div>
            {!history?.similar?.length ? (
              <div className="mt-1 text-xs text-muted">No comparable historical tenders yet.</div>
            ) : (
              history.similar.map((s: any, i: number) => (
                <div key={i} className="mt-2 text-sm">
                  <div className="truncate text-ink">{s.title}</div>
                  <div className="text-[11px] text-muted">{s.overlap_count} shared standard(s): {s.overlap.join(", ") || "—"}</div>
                </div>
              ))
            )}
            <div className="mt-3 border-t border-line pt-2 text-xs">
              <div className="font-medium text-success">Newly appearing</div>
              <div className="font-tech text-muted">{history?.newly_appearing?.join(", ") || "—"}</div>
              <div className="mt-2 font-medium text-warning">Used before, not here</div>
              <div className="font-tech text-muted">{history?.potentially_missing?.join(", ") || "—"}</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
