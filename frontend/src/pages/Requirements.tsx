import { useState } from "react";
import { useParams } from "react-router-dom";
import { AnalysisTabs } from "@/components/AnalysisTabs";
import { Button, Card, EmptyState, PageHeader, Skeleton, StatusChip, type Tone } from "@/components/ui";
import { useEditRequirement, useRequirements, type Requirement } from "@/lib/morpheus";

const CONF_TONE: Record<string, Tone> = {
  HIGH: "success", MEDIUM: "warning", LOW: "neutral", REVIEW_REQUIRED: "danger",
};

export function RequirementsPage() {
  const { id = "" } = useParams();
  const { data: reqs, isLoading, isError } = useRequirements(id);

  return (
    <div>
      <PageHeader
        title="Requirement matrix"
        subtitle="Extracted from the specification. Edit a description to re-run matching."
      />
      <AnalysisTabs id={id} />

      {isLoading ? (
        <Skeleton className="h-40" />
      ) : isError ? (
        <p className="text-sm text-danger">Could not load requirements.</p>
      ) : !reqs?.length ? (
        <EmptyState>No requirements were extracted.</EmptyState>
      ) : (
        <div className="space-y-2">
          {reqs.map((r) => <Row key={r.id} analysisId={id} req={r} />)}
        </div>
      )}
    </div>
  );
}

function Row({ analysisId, req }: { analysisId: string; req: Requirement }) {
  const edit = useEditRequirement(analysisId);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(req.description);

  return (
    <Card className="p-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded bg-panel px-1.5 py-0.5 text-[11px] font-medium text-muted">{req.req_code}</span>
        <StatusChip tone="neutral">{req.requirement_type}</StatusChip>
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex flex-wrap gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="flex-1 rounded-lg border border-line bg-surface px-2 py-1 text-sm text-ink outline-none focus:border-primary"
              />
              <Button className="px-3 py-1 text-xs" onClick={() => { edit.mutate({ id: req.id, description: text }); setEditing(false); }}>Save</Button>
              <Button variant="secondary" className="px-3 py-1 text-xs" onClick={() => { setEditing(false); setText(req.description); }}>Cancel</Button>
            </div>
          ) : (
            <div className="text-sm text-ink">
              {req.description}
              {req.is_edited && <StatusChip tone="warning" className="ml-2">edited</StatusChip>}
            </div>
          )}
          {req.attributes.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {req.attributes.map((a) => (
                <span key={a.id} className="rounded bg-panel px-1.5 py-0.5 text-[11px] font-medium text-ink">
                  {a.key} {a.comparator !== "=" ? a.comparator : ""} {a.raw_value}{a.unit && ` ${a.unit}`}
                  {a.normalized_value != null && ` → ${a.normalized_value} ${a.canonical_unit}`}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-none items-center gap-2 text-[11px] text-muted">
          <span>pg {req.source_page ?? "—"}</span>
          <StatusChip tone={CONF_TONE[req.confidence] ?? "neutral"}>{req.confidence}</StatusChip>
          {!editing && <button onClick={() => setEditing(true)} className="rounded bg-panel px-2 py-1 hover:bg-line/60">Edit</button>}
        </div>
      </div>
    </Card>
  );
}
