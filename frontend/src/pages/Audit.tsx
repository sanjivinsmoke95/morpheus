import type { ReactNode } from "react";
import { useParams } from "react-router-dom";
import { AnalysisTabs } from "@/components/AnalysisTabs";
import { Card, PageHeader, StatusChip, type Tone } from "@/components/ui";
import { useConflicts, useCoverage, useGaps } from "@/lib/morpheus";

const COV_TONE: Record<string, Tone> = {
  FULL: "success", PARTIAL: "warning", MISSING: "danger", UNKNOWN: "neutral",
};

export function AuditPage() {
  const { id = "" } = useParams();
  const { data: coverage } = useCoverage(id);
  const { data: gaps } = useGaps(id);
  const { data: conflicts } = useConflicts(id);

  return (
    <div>
      <PageHeader
        title="Coverage & findings"
        subtitle="Requirement coverage, potential gaps, and conflicts — for your review."
      />
      <AnalysisTabs id={id} />

      <Section title={`Conflicts (${conflicts?.length ?? 0})`}>
        {!conflicts?.length ? <Empty text="No conflicting values detected." /> : conflicts.map((c) => (
          <div key={c.id} className="rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium capitalize text-ink">{c.parameter} conflict</span>
              <span className="text-[11px] uppercase text-danger">{c.severity} · {c.status}</span>
            </div>
            <div className="mt-1 text-xs text-ink">
              {c.value_a} {c.unit_a} <span className="text-muted">({c.source_a})</span>
              {"  vs  "}
              {c.value_b} {c.unit_b} <span className="text-muted">({c.source_b})</span>
            </div>
            <div className="mt-1 text-xs text-muted">{c.explanation}</div>
          </div>
        ))}
      </Section>

      <Section title={`Potential gaps (${gaps?.length ?? 0})`}>
        {!gaps?.length ? <Empty text="No gaps flagged." /> : gaps.map((g) => (
          <Card key={g.id} className="p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-ink">{g.description}</span>
              <StatusChip tone={g.is_mandatory_claim ? "danger" : "warning"}>{g.severity}</StatusChip>
            </div>
            {g.related_standard && <div className="mt-0.5 text-xs text-muted">Related: {g.related_standard}</div>}
            <div className="mt-0.5 text-[10px] text-muted">potential — not asserted as mandatory</div>
          </Card>
        ))}
      </Section>

      <Section title="Coverage matrix">
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-panel text-left text-xs uppercase text-muted">
                <tr><th className="px-3 py-2">Req</th><th className="px-3 py-2">Standard</th><th className="px-3 py-2">Coverage</th></tr>
              </thead>
              <tbody>
                {(coverage ?? []).map((c) => (
                  <tr key={c.id} className="border-t border-line">
                    <td className="px-3 py-2 text-ink"><span className="text-xs text-muted">{c.requirement_code}</span> {c.requirement?.slice(0, 50)}</td>
                    <td className="px-3 py-2 text-xs text-ink">{c.standard ?? "—"}</td>
                    <td className="px-3 py-2"><StatusChip tone={COV_TONE[c.coverage] ?? "neutral"}>{c.coverage}</StatusChip></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <div className="mt-6"><div className="mb-2 text-sm font-semibold text-ink">{title}</div><div className="space-y-2">{children}</div></div>;
}
function Empty({ text }: { text: string }) {
  return <div className="text-sm text-muted">{text}</div>;
}
