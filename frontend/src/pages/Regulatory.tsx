import type { ReactNode } from "react";
import { useParams } from "react-router-dom";
import { AnalysisHeader } from "@/components/AnalysisHeader";
import { Card, StatusChip, type Tone } from "@/components/ui";
import { useAmendmentImpact, useCertification, useQco } from "@/lib/morpheus";

const QCO_TONE: Record<string, Tone> = {
  MANDATORY: "danger", CONDITIONAL: "warning", VOLUNTARY: "success", UNKNOWN: "neutral",
};

export function RegulatoryPage() {
  const { id = "" } = useParams();
  const { data: qco } = useQco(id);
  const { data: cert } = useCertification(id);
  const { data: amends } = useAmendmentImpact(id);

  return (
    <div>
      <AnalysisHeader id={id} section="Certification & QCO" />

      <Section title="Quality Control Orders (QCO)">
        {!qco?.length ? <Empty text="No QCO records for the identified standards." /> : qco.map((q, i) => (
          <Card key={i} className="p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium text-ink">{q.is_number}</span>
              <StatusChip tone={QCO_TONE[q.qco_status] ?? "neutral"}>{q.qco_status}</StatusChip>
            </div>
            <div className="mt-0.5 text-xs text-muted">{q.order_name || q.product_description}</div>
            <div className="mt-0.5 text-[11px] text-muted">{q.notes}</div>
            <div className="mt-1 text-[10px] text-muted">
              {q.effective_date ? `effective ${q.effective_date} · ` : ""}source {q.source_name} · {q.data_origin}
            </div>
          </Card>
        ))}
      </Section>

      <Section title="Certification schemes">
        {!cert?.length ? <Empty text="No certification records." /> : cert.map((c, i) => (
          <Card key={i} className="flex items-center gap-2 p-3 text-sm">
            <StatusChip tone="info">{c.scheme}</StatusChip>
            <span className="text-xs text-ink">{c.is_number}</span>
            <span className="min-w-0 flex-1 truncate text-xs text-muted">{c.requirement}</span>
            <span className="text-[10px] text-muted">{c.data_origin}</span>
          </Card>
        ))}
      </Section>

      <Section title="Amendment impact (for review)">
        {!amends?.length ? <Empty text="No amendments on the directly-applicable standards." /> : amends.map((a, i) => (
          <Card key={i} className="p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-ink"><span className="font-medium">{a.is_number}</span> · {a.amendment_no}</span>
              <StatusChip tone="warning">{a.confidence}</StatusChip>
            </div>
            <div className="mt-0.5 text-xs text-muted">{a.summary}</div>
            <div className="mt-0.5 text-[11px] text-muted">{a.potential_impact}</div>
            {a.affected_clauses?.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {a.affected_clauses.map((cl: string) => <span key={cl} className="rounded bg-panel px-1.5 py-0.5 text-[10px] text-muted">{cl}</span>)}
              </div>
            )}
          </Card>
        ))}
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
