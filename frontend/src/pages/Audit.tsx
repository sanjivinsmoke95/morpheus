import type { ReactNode } from "react";
import { useParams } from "react-router-dom";
import { useConflicts, useCoverage, useGaps } from "@/lib/morpheus";

const COV_COLOR: Record<string, string> = {
  FULL: "text-emerald-400", PARTIAL: "text-amber-400", MISSING: "text-red-400", UNKNOWN: "text-zinc-400",
};

export function AuditPage() {
  const { id = "" } = useParams();
  const { data: coverage } = useCoverage(id);
  const { data: gaps } = useGaps(id);
  const { data: conflicts } = useConflicts(id);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="text-xl font-semibold">Coverage & findings</h1>
      <p className="mt-0.5 text-sm text-zinc-400">Requirement coverage, potential gaps, and conflicts — for your review.</p>

      {/* Conflicts */}
      <Section title={`Conflicts (${conflicts?.length ?? 0})`}>
        {!conflicts?.length ? <Empty text="No conflicting values detected." /> : conflicts.map((c) => (
          <div key={c.id} className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium capitalize">{c.parameter} conflict</span>
              <span className="text-[11px] uppercase text-red-400">{c.severity} · {c.status}</span>
            </div>
            <div className="mt-1 font-mono text-xs text-zinc-300">
              {c.value_a} {c.unit_a} <span className="text-zinc-500">({c.source_a})</span>
              {"  vs  "}
              {c.value_b} {c.unit_b} <span className="text-zinc-500">({c.source_b})</span>
            </div>
            <div className="mt-1 text-xs text-zinc-500">{c.explanation}</div>
          </div>
        ))}
      </Section>

      {/* Gaps */}
      <Section title={`Potential gaps (${gaps?.length ?? 0})`}>
        {!gaps?.length ? <Empty text="No gaps flagged." /> : gaps.map((g) => (
          <div key={g.id} className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span>{g.description}</span>
              <span className="text-[11px] uppercase text-amber-400">{g.severity}</span>
            </div>
            {g.related_standard && <div className="mt-0.5 text-xs text-zinc-500">Related: {g.related_standard}</div>}
            <div className="mt-0.5 text-[10px] text-zinc-600">potential — not asserted as mandatory</div>
          </div>
        ))}
      </Section>

      {/* Coverage matrix */}
      <Section title="Coverage matrix">
        <div className="overflow-hidden rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase text-zinc-400">
              <tr><th className="px-3 py-2">Req</th><th className="px-3 py-2">Standard</th><th className="px-3 py-2">Coverage</th></tr>
            </thead>
            <tbody>
              {(coverage ?? []).map((c) => (
                <tr key={c.id} className="border-t border-white/5">
                  <td className="px-3 py-2"><span className="font-mono text-xs text-zinc-400">{c.requirement_code}</span> {c.requirement?.slice(0, 50)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{c.standard ?? "—"}</td>
                  <td className={`px-3 py-2 text-xs ${COV_COLOR[c.coverage]}`}>{c.coverage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
