import { Card, SeverityPill, StatusChip, Tooltip, type Tone } from "@/components/ui";
import { useGfr } from "@/lib/morpheus";

const STATUS: Record<string, { tone: Tone; label: string }> = {
  OK: { tone: "success", label: "No flags" },
  ADVISORY: { tone: "warning", label: "Advisory" },
  REVIEW: { tone: "danger", label: "Review needed" },
};
const SEV: Record<string, "critical" | "high" | "medium" | "low"> = { HIGH: "high", MEDIUM: "medium", LOW: "low" };

export function GfrCard({ analysisId }: { analysisId: string }) {
  const { data } = useGfr(analysisId);
  if (!data?.available) return null;
  const s = STATUS[data.status] ?? { tone: "neutral" as Tone, label: data.status };

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="font-display text-base font-semibold text-ink">GFR 2017 procurement review</h2>
        <Tooltip text="Advisory rule checks against General Financial Rules 2017 (Rule 149 GeM, Rule 161/173 specifications, sustainability). Not a legal determination." />
        <span className="ml-auto"><StatusChip tone={s.tone}>{s.label}</StatusChip></span>
      </div>
      {data.flags.length === 0 ? (
        <p className="text-sm text-muted">No GFR procurement-review concerns detected.</p>
      ) : (
        <div className="space-y-2.5">
          {data.flags.map((f, i) => (
            <div key={i} className="rounded-lg border border-line p-3">
              <div className="flex flex-wrap items-center gap-2">
                <SeverityPill level={SEV[f.severity] ?? "low"} />
                <span className="rounded bg-panel px-1.5 py-0.5 text-[11px] font-semibold text-muted">{f.rule}</span>
                <span className="text-sm font-semibold text-ink">{f.title}</span>
              </div>
              <p className="mt-1 text-xs text-muted">{f.detail}</p>
              <p className="mt-1.5 rounded bg-primary-soft/40 px-2.5 py-1 text-xs text-ink"><span className="font-semibold">Action:</span> {f.action}</p>
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 text-[11px] italic text-muted">{data.disclaimer}</p>
    </Card>
  );
}
