import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStandardDetail } from "@/lib/morpheus";

export function StandardDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useStandardDetail(id);

  if (isLoading) return <div className="mx-auto max-w-3xl px-6 py-8"><div className="h-40 animate-pulse rounded-lg bg-white/5" /></div>;
  if (isError || !data) return <div className="mx-auto max-w-3xl px-6 py-8 text-sm text-red-400">Standard not found.</div>;

  const s = data.standard;
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <button onClick={() => navigate(-1)} className="mb-3 text-xs text-zinc-500 hover:text-zinc-300">← back</button>
      <div className="flex items-center gap-2">
        <h1 className="font-mono text-xl font-semibold">{s.is_number}</h1>
        <span className="rounded border border-white/15 px-1.5 py-0.5 text-[10px] uppercase text-zinc-400">{s.status}</span>
        {s.data_origin === "DEMO_SYNTHETIC" && <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-500">DEMO</span>}
      </div>
      <div className="mt-1 text-zinc-200">{s.title}</div>
      <p className="mt-2 text-sm text-zinc-400">{data.scope}</p>
      <div className="mt-2 text-xs text-zinc-500">
        Sector {s.sector || "—"} · current version {data.current_version || "—"} · verification {data.verification_status}
        {data.source_url && <> · <a href={data.source_url} target="_blank" rel="noreferrer" className="text-sky-400">source ↗</a></>}
      </div>

      <Section title="Versions">
        {data.versions.length === 0 ? <Empty /> : data.versions.map((v, i) => (
          <div key={i} className="flex items-center justify-between rounded border border-white/10 px-2.5 py-1.5 text-sm">
            <span className="font-mono">{v.version_label}</span>
            <span className={v.is_current ? "text-emerald-400" : "text-zinc-500"}>{v.is_current ? "current" : "superseded"}</span>
          </div>
        ))}
      </Section>

      <Section title="Amendments">
        {data.amendments.length === 0 ? <Empty /> : data.amendments.map((a, i) => (
          <div key={i} className="rounded border border-white/10 px-2.5 py-1.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{a.amendment_no}</span>
              <span className="text-xs text-zinc-500">{a.amendment_date ?? "—"}</span>
            </div>
            <div className="text-xs text-zinc-400">{a.summary}</div>
            {a.affected_clauses.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {a.affected_clauses.map((c) => <span key={c} className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-400">{c}</span>)}
              </div>
            )}
          </div>
        ))}
      </Section>

      <Section title="Relationships">
        {data.relationships.length === 0 ? <Empty /> : data.relationships.map((r) => (
          <div key={r.id} className="flex items-center gap-2 rounded border border-white/10 px-2.5 py-1.5 text-sm">
            <span className="rounded border border-white/15 px-1.5 py-0.5 text-[10px] uppercase text-zinc-400">{r.relationship_type.replace(/_/g, " ")}</span>
            <span className="text-zinc-500">{r.direction === "out" ? "→" : "←"}</span>
            <span className="font-mono text-xs">{r.target_is_number}</span>
            <span className="min-w-0 flex-1 truncate text-xs text-zinc-500">{r.target_title}</span>
            <span className="text-[10px] text-zinc-600">{r.confidence}</span>
          </div>
        ))}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-5">
      <div className="mb-1.5 text-sm font-medium">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
function Empty() {
  return <div className="text-xs text-zinc-500">None recorded.</div>;
}
