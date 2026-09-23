import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { AnalysisHeader } from "@/components/AnalysisHeader";
import { Button, Card, EmptyState, Skeleton, StatusChip, Tabs } from "@/components/ui";
import {
  useAddNote, useAddRequirement, useCoverage, useEditRequirement, useNotes, useReadiness,
  useRecommendations, useRequirements, type Requirement,
} from "@/lib/morpheus";

const REQ_TYPES = ["PRODUCT", "PARAMETER", "DIMENSION", "MATERIAL", "PERFORMANCE", "SAFETY", "TESTING", "CERTIFICATION", "INSTALLATION", "REFERENCED_STANDARD"];
const CAT_PILL: Record<string, string> = {
  MATERIAL: "bg-emerald-100 text-emerald-700", PERFORMANCE: "bg-blue-100 text-blue-700",
  SAFETY: "bg-red-100 text-red-700", TESTING: "bg-orange-100 text-orange-700",
  CERTIFICATION: "bg-purple-100 text-purple-700", PARAMETER: "bg-sky-100 text-sky-700",
  INSTALLATION: "bg-teal-100 text-teal-700", PRODUCT: "bg-amber-100 text-amber-700",
};

function valueOf(r: Requirement) {
  if (r.attributes.length) return r.attributes.map((a) => `${a.raw_value}${a.unit ? " " + a.unit : ""}`).filter(Boolean).join(", ") || "—";
  return r.description.length > 40 ? r.description.slice(0, 40) + "…" : r.description;
}

export function RequirementsPage() {
  const { id = "" } = useParams();
  const { data: reqs, isLoading } = useRequirements(id);
  const { data: coverage } = useCoverage(id);
  const { data: r } = useReadiness(id);
  const addReq = useAddRequirement(id);

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const [newType, setNewType] = useState("PARAMETER");

  const covByReq = useMemo(() => {
    const m = new Map<string, string>();
    const rank = { MISSING: 0, PARTIAL: 1, FULL: 2 } as Record<string, number>;
    for (const c of coverage ?? []) {
      if (!c.requirement_code) continue;
      const cur = m.get(c.requirement_code);
      if (cur == null || (rank[c.coverage] ?? 9) < (rank[cur] ?? 9)) m.set(c.requirement_code, c.coverage);
    }
    return m;
  }, [coverage]);

  const shown = useMemo(() => {
    let rows = reqs ?? [];
    if (query.trim()) { const q = query.toLowerCase(); rows = rows.filter((x) => x.description.toLowerCase().includes(q) || x.req_code.toLowerCase().includes(q)); }
    return rows;
  }, [reqs, query]);

  useEffect(() => { if (!selectedId && shown.length) setSelectedId(shown[0].id); }, [shown, selectedId]);
  const selected = (reqs ?? []).find((x) => x.id === selectedId) ?? null;
  const selIdx = shown.findIndex((x) => x.id === selectedId);

  function statusOf(code: string) {
    const c = covByReq.get(code);
    if (c === "FULL") return { label: "Mapped", tone: "success" as const };
    if (c === "PARTIAL") return { label: "Needs Review", tone: "warning" as const };
    return { label: "Unmapped", tone: "danger" as const };
  }
  function submitAdd() {
    if (!newDesc.trim()) return;
    addReq.mutate({ description: newDesc.trim(), requirement_type: newType }, { onSuccess: () => { setNewDesc(""); setAdding(false); } });
  }

  return (
    <div>
      <AnalysisHeader id={id} section="Requirements" />

      {/* 4 KPIs */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <RKpi icon="📄" tone="neutral" n={r?.requirements_total ?? 0} label="Total Requirements" />
        <RKpi icon="📗" tone="success" n={(r?.requirements_covered ?? 0) + (r?.requirements_partial ?? 0)} label="Mapped to Standards" />
        <RKpi icon="⚠" tone="warning" n={r?.requirements_partial ?? 0} label="Need Review" />
        <RKpi icon="◷" tone="danger" n={r?.requirements_missing ?? 0} label="Unmapped" />
      </div>

      {isLoading ? <Skeleton className="h-64" /> : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* Table */}
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search requirements…"
                className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary" />
              <Button className="px-3 py-2 text-xs" onClick={() => setAdding((v) => !v)}>＋ Add</Button>
            </div>

            {adding && (
              <Card className="mb-3 p-3">
                <div className="flex flex-wrap gap-2">
                  <input autoFocus value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Requirement the extractor missed…"
                    className="min-w-[12rem] flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-primary" />
                  <select value={newType} onChange={(e) => setNewType(e.target.value)} className="rounded-lg border border-line bg-surface px-2 py-2 text-sm outline-none focus:border-primary">
                    {REQ_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                  </select>
                  <Button onClick={submitAdd} disabled={addReq.isPending || !newDesc.trim()}>Add & match</Button>
                </div>
              </Card>
            )}

            <Card className="overflow-hidden">
              <div className="grid grid-cols-[3rem_1fr_5rem_5rem] gap-2 border-b border-line bg-panel px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted sm:grid-cols-[3rem_1fr_6rem_6rem_4rem_6rem]">
                <span>ID</span><span>Requirement</span>
                <span className="hidden sm:block">Category</span>
                <span className="hidden sm:block">Value</span>
                <span className="hidden sm:block">Source</span>
                <span>Status</span>
              </div>
              <div className="max-h-[520px] overflow-y-auto">
                {shown.map((req) => {
                  const st = statusOf(req.req_code);
                  const active = req.id === selectedId;
                  return (
                    <button key={req.id} onClick={() => setSelectedId(req.id)}
                      className={`grid w-full grid-cols-[3rem_1fr_5rem_5rem] items-center gap-2 border-b border-line px-3 py-2.5 text-left text-sm last:border-b-0 sm:grid-cols-[3rem_1fr_6rem_6rem_4rem_6rem] ${active ? "bg-primary-soft/60 ring-1 ring-inset ring-primary/30" : "hover:bg-panel"}`}>
                      <span className="text-xs font-semibold text-muted">{req.req_code}</span>
                      <span className="min-w-0 truncate text-ink">{req.description}</span>
                      <span className="hidden sm:block"><span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${CAT_PILL[req.requirement_type] ?? "bg-panel text-muted"}`}>{req.requirement_type.replace(/_/g, " ")}</span></span>
                      <span className="hidden truncate text-xs text-muted sm:block">{valueOf(req)}</span>
                      <span className="hidden text-xs text-muted sm:block">{req.source_page ? `Page ${req.source_page}` : "—"}</span>
                      <span><StatusChip tone={st.tone}>{st.label}</StatusChip></span>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between border-t border-line px-3 py-2 text-xs text-muted">
                <span>Showing {shown.length} of {reqs?.length ?? 0} requirements</span>
              </div>
            </Card>
          </div>

          {/* Detail panel */}
          <Card className="p-4">
            {!selected ? <EmptyState>Select a requirement.</EmptyState> : (
              <RequirementPanel key={selected.id} analysisId={id} req={selected}
                onPrev={selIdx > 0 ? () => setSelectedId(shown[selIdx - 1].id) : undefined}
                onNext={selIdx < shown.length - 1 ? () => setSelectedId(shown[selIdx + 1].id) : undefined} />
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function RequirementPanel({ analysisId, req, onPrev, onNext }: { analysisId: string; req: Requirement; onPrev?: () => void; onNext?: () => void }) {
  const [tab, setTab] = useState("details");
  const { data: recs } = useRecommendations(analysisId);
  const mine = (recs ?? []).filter((x) => x.requirement_id === req.id).sort((a, b) => b.relevance_score - a.relevance_score);
  const edit = useEditRequirement(analysisId);
  const [type, setType] = useState(req.requirement_type);

  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-display text-base font-bold text-ink">{req.req_code} – {req.description.length > 40 ? req.description.slice(0, 40) + "…" : req.description}</div>
          <div className="mt-1 flex gap-1.5">
            <StatusChip tone="info">{req.requirement_type.replace(/_/g, " ")}</StatusChip>
          </div>
        </div>
        <div className="flex flex-none gap-1 text-xs">
          <button onClick={onPrev} disabled={!onPrev} className="rounded px-1.5 py-1 text-muted hover:bg-panel disabled:opacity-30">‹ Prev</button>
          <button onClick={onNext} disabled={!onNext} className="rounded px-1.5 py-1 text-muted hover:bg-panel disabled:opacity-30">Next ›</button>
        </div>
      </div>

      <div className="mt-3">
        <Tabs active={tab} onChange={setTab} tabs={[
          { key: "details", label: "Details" }, { key: "standards", label: `Standards (${mine.length})` }, { key: "notes", label: "Notes" },
        ]} />
      </div>

      <div className="pt-4">
        {tab === "details" && (
          <div className="space-y-4">
            <div>
              <div className="mb-1 text-xs font-semibold text-muted">Requirement</div>
              <div className="rounded-lg bg-panel/60 p-3 text-sm text-ink">{req.description}</div>
            </div>
            {req.attributes.length > 0 && (
              <div>
                <div className="mb-1.5 text-xs font-semibold text-muted">Structured Information</div>
                <div className="grid grid-cols-2 gap-2">
                  {req.attributes.map((a) => (
                    <div key={a.id} className="rounded-lg border border-line px-2.5 py-1.5">
                      <div className="text-[10px] uppercase text-muted">{a.key}</div>
                      <div className="text-sm font-medium text-ink">{a.comparator} {a.raw_value} {a.unit}</div>
                    </div>
                  ))}
                  <div className="rounded-lg border border-line px-2.5 py-1.5"><div className="text-[10px] uppercase text-muted">Source</div><div className="text-sm font-medium text-ink">{req.source_page ? `Page ${req.source_page}` : "—"}</div></div>
                  <div className="rounded-lg border border-line px-2.5 py-1.5"><div className="text-[10px] uppercase text-muted">Requirement ID</div><div className="text-sm font-medium text-ink">{req.req_code}</div></div>
                </div>
              </div>
            )}
            <div>
              <div className="mb-1 text-xs font-semibold text-muted">Change category (re-runs matching)</div>
              <div className="flex gap-2">
                <select value={type} onChange={(e) => setType(e.target.value)} className="flex-1 rounded-lg border border-line bg-surface px-2 py-1.5 text-sm outline-none focus:border-primary">
                  {REQ_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                </select>
                <Button disabled={type === req.requirement_type || edit.isPending} onClick={() => edit.mutate({ id: req.id, requirement_type: type })}>Save</Button>
              </div>
            </div>
          </div>
        )}
        {tab === "standards" && (
          mine.length === 0 ? <EmptyState>No standards matched.</EmptyState> : (
            <div className="space-y-2">
              {mine.map((rec) => (
                <div key={rec.id} className="rounded-lg border border-line p-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-primary">{rec.standard.is_number}</span>
                    {rec.is_primary && <StatusChip tone="info">Primary</StatusChip>}
                    <span className="ml-auto text-xs font-semibold text-ink">{Math.round(rec.relevance_score * 100)}%</span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted">{rec.standard.title}</div>
                </div>
              ))}
            </div>
          )
        )}
        {tab === "notes" && <NotesTab req={req} />}
      </div>
    </div>
  );
}

function NotesTab({ req }: { req: Requirement }) {
  const { data: notes } = useNotes(req.id);
  const add = useAddNote(req.id);
  const [text, setText] = useState("");
  return (
    <div className="space-y-3">
      {(notes ?? []).map((n) => (
        <div key={n.id} className="rounded-lg bg-panel px-3 py-2 text-sm">
          <div className="text-ink">{n.body}</div>
          <div className="mt-1 text-[11px] text-muted">{n.author ?? "You"} · {n.created_at ? new Date(n.created_at).toLocaleString() : ""}</div>
        </div>
      ))}
      {!notes?.length && <p className="text-sm text-muted">No notes yet.</p>}
      <div className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a note…" className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-primary" />
        <Button disabled={!text.trim() || add.isPending} onClick={() => add.mutate(text.trim(), { onSuccess: () => setText("") })}>Add</Button>
      </div>
    </div>
  );
}

function RKpi({ icon, tone, n, label }: { icon: string; tone: string; n: number; label: string }) {
  const cls = tone === "success" ? "bg-success-soft text-success" : tone === "danger" ? "bg-danger-soft text-danger" : tone === "warning" ? "bg-warning-soft text-warning" : "bg-primary-soft text-primary";
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
      <span className={`grid h-10 w-10 flex-none place-items-center rounded-lg text-sm ${cls}`}>{icon}</span>
      <div><div className="text-2xl font-bold tabular-nums text-ink">{n}</div><div className="text-[11px] text-muted">{label}</div></div>
    </div>
  );
}
