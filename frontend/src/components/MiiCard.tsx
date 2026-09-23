import { Card, SeverityPill, StatusChip, Tooltip, type Tone } from "@/components/ui";
import { useMii } from "@/lib/morpheus";

const STATUS: Record<string, { tone: Tone; label: string }> = {
  OK: { tone: "success", label: "Compliant" },
  REVIEW: { tone: "warning", label: "Minor gaps" },
  ACTION: { tone: "danger", label: "Action needed" },
};

const SEV: Record<string, "critical" | "high" | "medium" | "low"> = {
  HIGH: "high", MEDIUM: "medium", LOW: "low",
};

export function MiiCard({ analysisId }: { analysisId: string }) {
  const { data } = useMii(analysisId);
  if (!data?.available) return null;
  const s = STATUS[data.status] ?? { tone: "neutral" as Tone, label: data.status };

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-semibold text-ink">Make in India / PPP-MII check</h2>
        <Tooltip text="A rule-based scan for Public Procurement (Preference to Make in India) compliance. Advisory, not a legal determination." />
        <span className="ml-auto"><StatusChip tone={s.tone}>{s.label}</StatusChip></span>
      </div>

      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        <Flag ok={data.has_preference_clause} label="Purchase-preference clause" />
        <Flag ok={data.has_local_content_declaration} label="Local-content declaration" />
        <Flag ok={data.foreign_brand_terms.length === 0} label="No foreign-brand restriction" />
      </div>

      <p className="mb-3 text-sm text-muted">{data.advisory}</p>

      {data.issues.length > 0 && (
        <div className="space-y-2">
          {data.issues.map((i, idx) => (
            <div key={idx} className="flex items-start gap-2 rounded-lg border border-line px-3 py-2">
              <SeverityPill level={SEV[i.severity] ?? "low"} />
              <span className="text-sm text-ink">{i.text}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function Flag({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium ${ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
      {ok ? "✓" : "✕"} {label}
    </span>
  );
}
