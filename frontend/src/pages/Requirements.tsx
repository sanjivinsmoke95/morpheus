import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { AnalysisTabs } from "@/components/AnalysisTabs";
import {
  Button, Card, DetailDrawer, EmptyState, FilterChip, PageHeader, Skeleton, StatusChip, Tabs, type Tone,
} from "@/components/ui";
import {
  useAddNote, useAddRequirement, useCoverage, useEditRequirement, useNotes, useRecommendations,
  useRequirements, type Requirement,
} from "@/lib/morpheus";

const REQ_TYPES = ["PRODUCT", "PARAMETER", "DIMENSION", "MATERIAL", "PERFORMANCE", "SAFETY",
  "TESTING", "CERTIFICATION", "INSTALLATION", "REFERENCED_STANDARD"];
const CONF_TONE: Record<string, Tone> = { HIGH: "success", MEDIUM: "warning", LOW: "neutral", REVIEW_REQUIRED: "danger" };
type CovFilter = "all" | "MISSING" | "PARTIAL" | "FULL";

export function RequirementsPage() {
  const { id = "" } = useParams();
  const { data: reqs, isLoading } = useRequirements(id);
  const { data: coverage } = useCoverage(id);
  const addReq = useAddRequirement(id);

  const [filter, setFilter] = useState<CovFilter>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Requirement | null>(null);
  const [adding, setAdding] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const [newType, setNewType] = useState("PARAMETER");

  // requirement_code -> worst coverage class
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

  const counts = useMemo(() => {
    const c = { all: reqs?.length ?? 0, MISSING: 0, PARTIAL: 0, FULL: 0 };
    for (const r of reqs ?? []) {
      const cov = covByReq.get(r.req_code);
      if (cov === "MISSING") c.MISSING++; else if (cov === "PARTIAL") c.PARTIAL++; else if (cov === "FULL") c.FULL++;
    }
    return c;
  }, [reqs, covByReq]);

  const shown = useMemo(() => {
    let rows = reqs ?? [];
    if (filter !== "all") rows = rows.filter((r) => covByReq.get(r.req_code) === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((r) => r.description.toLowerCase().includes(q) || r.req_code.toLowerCase().includes(q));
    }
    return rows;
  }, [reqs, filter, query, covByReq]);

  function submitAdd() {
    if (!newDesc.trim()) return;
    addReq.mutate({ description: newDesc.trim(), requirement_type: newType },
      { onSuccess: () => { setNewDesc(""); setAdding(false); } });
  }

  return (
    <div>
      <PageHeader title="Requirements" subtitle="Extracted from the specification. Add a missing one, or open a row to review its standards and evidence." />
      <AnalysisTabs id={id} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")} count={counts.all}>All</FilterChip>
          <FilterChip active={filter === "MISSING"} onClick={() => setFilter("MISSING")} count={counts.MISSING}>Not covered</FilterChip>
          <FilterChip active={filter === "PARTIAL"} onClick={() => setFilter("PARTIAL")} count={counts.PARTIAL}>Partial</FilterChip>
          <FilterChip active={filter === "FULL"} onClick={() => setFilter("FULL")} count={counts.FULL}>Covered</FilterChip>
        </div>
        <div className="flex items-center gap-2">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…"
            className="w-40 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink outline-none focus:border-primary" />
          <Button className="px-3 py-1.5 text-xs" onClick={() => setAdding((v) => !v)}>＋ Add requirement</Button>
        </div>
      </div>

      {adding && (
        <Card className="mb-4 p-4">
          <div className="mb-2 text-sm font-medium text-ink">Add a requirement the extractor missed</div>
          <div className="flex flex-wrap gap-2">
            <input autoFocus value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
              placeholder="e.g. Corrosion protection coating for pole finish"
              className="min-w-[16rem] flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary" />
            <select value={newType} onChange={(e) => setNewType(e.target.value)}
              className="rounded-lg border border-line bg-surface px-2 py-2 text-sm text-ink outline-none focus:border-primary">
              {REQ_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </select>
            <Button onClick={submitAdd} disabled={addReq.isPending || !newDesc.trim()}>
              {addReq.isPending ? "Adding…" : "Add & match"}
            </Button>
            <Button variant="secondary" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {isLoading ? (
        <Skeleton className="h-40" />
      ) : !shown.length ? (
        <EmptyState>No requirements match this filter.</EmptyState>
      ) : (
        <Card className="overflow-hidden">
          {shown.map((r) => {
            const cov = covByReq.get(r.req_code);
            return (
              <button key={r.id} onClick={() => setSelected(r)}
                className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-panel">
                <span className="w-14 flex-none text-xs font-semibold text-muted">{r.req_code}</span>
                <StatusChip tone="neutral">{r.requirement_type.replace(/_/g, " ")}</StatusChip>
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{r.description}</span>
                {r.is_edited && <span className="text-[10px] uppercase tracking-wide text-primary">edited</span>}
                <CovChip cov={cov} />
                <span className="flex-none text-primary">→</span>
              </button>
            );
          })}
        </Card>
      )}

      <RequirementDrawer analysisId={id} req={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function CovChip({ cov }: { cov?: string }) {
  if (cov === "FULL") return <StatusChip tone="success">Covered</StatusChip>;
  if (cov === "PARTIAL") return <StatusChip tone="warning">Partial</StatusChip>;
  if (cov === "MISSING") return <StatusChip tone="danger">Not covered</StatusChip>;
  return <StatusChip tone="neutral">—</StatusChip>;
}

function RequirementDrawer({ analysisId, req, onClose }: { analysisId: string; req: Requirement | null; onClose: () => void }) {
  const [tab, setTab] = useState("details");
  if (!req) return null;
  return (
    <DetailDrawer open={!!req} onClose={onClose} title={`${req.req_code} · ${req.requirement_type.replace(/_/g, " ")}`}
      subtitle={req.source_page ? `Page ${req.source_page}` : undefined}>
      <Tabs active={tab} onChange={setTab} tabs={[
        { key: "details", label: "Details" }, { key: "standards", label: "Standards" },
        { key: "notes", label: "Notes" },
      ]} />
      <div className="pt-4">
        {tab === "details" && <DetailsTab analysisId={analysisId} req={req} />}
        {tab === "standards" && <StandardsTab analysisId={analysisId} req={req} />}
        {tab === "notes" && <NotesTab req={req} />}
      </div>
    </DetailDrawer>
  );
}

function DetailsTab({ analysisId, req }: { analysisId: string; req: Requirement }) {
  const edit = useEditRequirement(analysisId);
  const [desc, setDesc] = useState(req.description);
  const [type, setType] = useState(req.requirement_type);
  const dirty = desc !== req.description || type !== req.requirement_type;
  return (
    <div className="space-y-4 text-sm">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted">Description</label>
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3}
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted">Type</label>
        <select value={type} onChange={(e) => setType(e.target.value)}
          className="w-full rounded-lg border border-line bg-surface px-2 py-2 text-sm text-ink outline-none focus:border-primary">
          {REQ_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
        </select>
      </div>
      {req.attributes.length > 0 && (
        <div>
          <div className="mb-1 text-xs font-medium text-muted">Extracted attributes</div>
          <div className="flex flex-wrap gap-1.5">
            {req.attributes.map((a) => (
              <span key={a.id} className="rounded-md bg-panel px-2 py-1 text-xs text-ink">
                {a.key} {a.comparator} {a.raw_value} {a.unit}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Button disabled={!dirty || edit.isPending}
          onClick={() => edit.mutate({ id: req.id, description: desc, requirement_type: type })}>
          {edit.isPending ? "Saving…" : "Save & re-match"}
        </Button>
        <span className="flex items-center gap-1 text-xs text-muted">
          Confidence <StatusChip tone={CONF_TONE[req.confidence] ?? "neutral"}>{req.confidence}</StatusChip>
        </span>
      </div>
      <p className="text-xs text-muted">Editing the description or type re-runs standard matching for this requirement.</p>
    </div>
  );
}

function StandardsTab({ analysisId, req }: { analysisId: string; req: Requirement }) {
  const { data: recs } = useRecommendations(analysisId);
  const mine = (recs ?? []).filter((r) => r.requirement_id === req.id).sort((a, b) => b.relevance_score - a.relevance_score);
  if (!mine.length) return <EmptyState>No standards matched this requirement yet.</EmptyState>;
  return (
    <div className="space-y-2">
      {mine.map((r) => (
        <div key={r.id} className="rounded-lg border border-line p-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-primary">{r.standard.is_number}</span>
            <span className="ml-auto text-xs font-semibold tabular-nums text-ink">{Math.round(r.relevance_score * 100)}%</span>
          </div>
          <div className="mt-0.5 text-xs text-muted">{r.standard.title}</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <StatusChip tone="info">{r.applicability_class.replace(/_/g, " ")}</StatusChip>
            <StatusChip tone="neutral">{r.relevance}</StatusChip>
          </div>
        </div>
      ))}
    </div>
  );
}

function NotesTab({ req }: { req: Requirement }) {
  const { data: notes } = useNotes(req.id);
  const add = useAddNote(req.id);
  const [text, setText] = useState("");
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {(notes ?? []).map((n) => (
          <div key={n.id} className="rounded-lg bg-panel px-3 py-2 text-sm">
            <div className="text-ink">{n.body}</div>
            <div className="mt-1 text-[11px] text-muted">{n.author ?? "You"} · {n.created_at ? new Date(n.created_at).toLocaleString() : ""}</div>
          </div>
        ))}
        {!notes?.length && <p className="text-sm text-muted">No notes yet.</p>}
      </div>
      <div className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a note for the record…"
          className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary" />
        <Button disabled={!text.trim() || add.isPending}
          onClick={() => add.mutate(text.trim(), { onSuccess: () => setText("") })}>Add</Button>
      </div>
    </div>
  );
}
