import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, Skeleton, StatusChip } from "@/components/ui";
import { useStandardDetail } from "@/lib/morpheus";

export function StandardDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useStandardDetail(id);

  if (isLoading) return <div className="mx-auto max-w-3xl"><Skeleton className="h-40" /></div>;
  if (isError || !data)
    return <div className="mx-auto max-w-3xl text-sm text-danger">Standard not found.</div>;

  const s = data.standard;
  return (
    <div className="mx-auto max-w-3xl">
      <button onClick={() => navigate(-1)} className="mb-4 text-sm text-primary hover:underline">
        ← Back
      </button>

      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{s.is_number}</h1>
        <StatusChip tone={s.status === "ACTIVE" ? "success" : "neutral"}>{s.status}</StatusChip>
        {s.data_origin === "DEMO_SYNTHETIC" && <StatusChip tone="neutral">Demo data</StatusChip>}
      </div>
      <div className="mt-1 text-lg text-ink">{s.title}</div>

      <Card className="mt-4 p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted">What this standard covers</div>
        <p className="mt-1.5 text-sm text-ink">{data.scope || "No scope description recorded."}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <span>Sector: <span className="text-ink">{s.sector || "—"}</span></span>
          <span>Current version: <span className="text-ink">{data.current_version || "—"}</span></span>
          <span>Verification: <span className="text-ink">{data.verification_status}</span></span>
          {data.source_url && (
            <a href={data.source_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
              Official source ↗
            </a>
          )}
        </div>
      </Card>

      <Section title="Versions">
        {data.versions.length === 0 ? (
          <Empty />
        ) : (
          data.versions.map((v, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm">
              <span className="font-medium text-ink">{v.version_label}</span>
              <StatusChip tone={v.is_current ? "success" : "neutral"}>
                {v.is_current ? "Current" : "Superseded"}
              </StatusChip>
            </div>
          ))
        )}
      </Section>

      <Section title="Amendments">
        {data.amendments.length === 0 ? (
          <Empty />
        ) : (
          data.amendments.map((a, i) => (
            <div key={i} className="rounded-lg border border-line px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-ink">{a.amendment_no}</span>
                <span className="text-xs text-muted">{a.amendment_date ?? "—"}</span>
              </div>
              <div className="mt-0.5 text-sm text-muted">{a.summary}</div>
              {a.affected_clauses.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {a.affected_clauses.map((c) => (
                    <span key={c} className="rounded bg-panel px-1.5 py-0.5 text-xs text-muted">{c}</span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </Section>

      <Section title="Related standards">
        {data.relationships.length === 0 ? (
          <Empty />
        ) : (
          data.relationships.map((r) => (
            <div key={r.id} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm">
              <StatusChip tone="info">{r.relationship_type.replace(/_/g, " ")}</StatusChip>
              <span className="text-muted">{r.direction === "out" ? "→" : "←"}</span>
              <span className="font-medium text-ink">{r.target_is_number}</span>
              <span className="min-w-0 flex-1 truncate text-muted">{r.target_title}</span>
            </div>
          ))
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-6">
      <div className="mb-2 text-sm font-semibold text-ink">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
function Empty() {
  return <div className="text-sm text-muted">None recorded.</div>;
}
