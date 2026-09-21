import type { ReactNode } from "react";
import { useParams } from "react-router-dom";
import { useAmendmentImpact, useCertification, useQco } from "@/lib/morpheus";

const QCO_COLOR: Record<string, string> = {
  MANDATORY: "text-red-400", CONDITIONAL: "text-amber-400", VOLUNTARY: "text-emerald-400", UNKNOWN: "text-zinc-400",
};

export function RegulatoryPage() {
  const { id = "" } = useParams();
  const { data: qco } = useQco(id);
  const { data: cert } = useCertification(id);
  const { data: amends } = useAmendmentImpact(id);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="text-xl font-semibold">Certification & QCO</h1>
      <p className="mt-0.5 text-sm text-zinc-400">Regulatory status shown only from stored records, with source. Never inferred.</p>

      <Section title="Quality Control Orders (QCO)">
        {!qco?.length ? <Empty text="No QCO records for the identified standards." /> : qco.map((q, i) => (
          <div key={i} className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-mono">{q.is_number}</span>
              <span className={QCO_COLOR[q.qco_status]}>{q.qco_status}</span>
            </div>
            <div className="mt-0.5 text-xs text-zinc-400">{q.order_name || q.product_description}</div>
            <div className="mt-0.5 text-[11px] text-zinc-500">{q.notes}</div>
            <div className="mt-1 text-[10px] text-zinc-600">
              {q.effective_date ? `effective ${q.effective_date} · ` : ""}source {q.source_name} · {q.data_origin}
            </div>
          </div>
        ))}
      </Section>

      <Section title="Certification schemes">
        {!cert?.length ? <Empty text="No certification records." /> : cert.map((c, i) => (
          <div key={i} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
            <span className="rounded border border-white/15 px-1.5 py-0.5 text-[10px] uppercase text-zinc-400">{c.scheme}</span>
            <span className="font-mono text-xs">{c.is_number}</span>
            <span className="min-w-0 flex-1 truncate text-xs text-zinc-400">{c.requirement}</span>
            <span className="text-[10px] text-zinc-600">{c.data_origin}</span>
          </div>
        ))}
      </Section>

      <Section title="Amendment impact (for review)">
        {!amends?.length ? <Empty text="No amendments on the directly-applicable standards." /> : amends.map((a, i) => (
          <div key={i} className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span><span className="font-mono">{a.is_number}</span> · {a.amendment_no}</span>
              <span className="text-[11px] text-amber-400">{a.confidence}</span>
            </div>
            <div className="mt-0.5 text-xs text-zinc-400">{a.summary}</div>
            <div className="mt-0.5 text-[11px] text-zinc-500">{a.potential_impact}</div>
            {a.affected_clauses?.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {a.affected_clauses.map((cl: string) => <span key={cl} className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-400">{cl}</span>)}
              </div>
            )}
          </div>
        ))}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <div className="mt-5"><div className="mb-2 text-sm font-medium">{title}</div><div className="space-y-2">{children}</div></div>;
}
function Empty({ text }: { text: string }) {
  return <div className="text-xs text-zinc-500">{text}</div>;
}
