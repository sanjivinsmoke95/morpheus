import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAnalyses, useStandardsSearch } from "@/lib/morpheus";

type Item = { id: string; label: string; sub?: string; group: string; to: string };

/** Global ⌘K / Ctrl+K command palette. Searches real tenders + standards and offers
 *  navigation actions. No fake results — everything routes to a real screen. */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: analyses } = useAnalyses();
  const { data: standards } = useStandardsSearch(q.length >= 2 ? q : "");

  useEffect(() => { if (open) { setQ(""); setActive(0); setTimeout(() => inputRef.current?.focus(), 20); } }, [open]);

  const items = useMemo<Item[]>(() => {
    const ql = q.toLowerCase().trim();
    const actions: Item[] = [
      { id: "a1", label: "Analyze new tender", group: "Actions", to: "/analyses/new" },
      { id: "a2", label: "Open review queue (My Tenders)", group: "Actions", to: "/history" },
      { id: "a3", label: "Department analytics", group: "Actions", to: "/analytics" },
      { id: "a4", label: "Standards library", group: "Actions", to: "/standards" },
      { id: "a5", label: "Regulatory updates", group: "Actions", to: "/regulatory-updates" },
    ].filter((a) => !ql || a.label.toLowerCase().includes(ql));

    const tenders: Item[] = (analyses ?? [])
      .filter((a) => !ql || (a.title || "").toLowerCase().includes(ql) || (a.sector || "").toLowerCase().includes(ql))
      .slice(0, 6)
      .map((a) => ({ id: "t" + a.id, label: a.title || "Untitled tender", sub: a.sector || undefined,
                     group: "Tenders", to: a.status === "READY" ? `/analyses/${a.id}` : `/analyses/${a.id}/processing` }));

    const stds: Item[] = (ql.length >= 2 ? standards ?? [] : []).slice(0, 6)
      .map((s) => ({ id: "s" + s.id, label: s.is_number, sub: s.title, group: "Standards", to: `/standards/${s.id}` }));

    return [...actions, ...tenders, ...stds];
  }, [q, analyses, standards]);

  useEffect(() => { setActive((i) => Math.min(i, Math.max(0, items.length - 1))); }, [items.length]);

  if (!open) return null;

  function go(item?: Item) {
    const it = item ?? items[active];
    if (it) { navigate(it.to); onClose(); }
  }

  let lastGroup = "";
  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
        <div className="flex items-center gap-2 border-b border-line px-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-muted"><circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" strokeLinecap="round" /></svg>
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, items.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
              else if (e.key === "Enter") { e.preventDefault(); go(); }
              else if (e.key === "Escape") onClose();
            }}
            placeholder="Search tenders, standards, or run an action…"
            className="w-full bg-transparent py-3.5 text-sm text-ink outline-none placeholder:text-muted" />
          <kbd className="rounded border border-line bg-panel px-1.5 py-0.5 text-[10px] text-muted">esc</kbd>
        </div>
        <div className="max-h-[52vh] overflow-y-auto py-2">
          {items.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted">No matches. Try a tender name or IS number.</div>
          ) : items.map((it, i) => {
            const header = it.group !== lastGroup ? (lastGroup = it.group) : null;
            return (
              <div key={it.id}>
                {header && <div className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted">{header}</div>}
                <button onMouseEnter={() => setActive(i)} onClick={() => go(it)}
                  className={`flex w-full items-center gap-3 px-4 py-2 text-left ${i === active ? "bg-primary-soft" : "hover:bg-panel"}`}>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm ${it.group === "Standards" ? "font-tech" : ""} ${i === active ? "font-medium text-primary" : "text-ink"}`}>{it.label}</span>
                    {it.sub && <span className="block truncate text-xs text-muted">{it.sub}</span>}
                  </span>
                  <span className="text-xs text-muted">↵</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
