import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

type Tab = { to: string; label: string; end?: boolean };
type Group = { no: string; name: string; tabs: Tab[] };

/** Analysis workflow, grouped into the conceptual stages a procurement officer
 *  moves through. Routes are unchanged — grouping is presentation only, so every
 *  existing deep link still resolves. */
const groups = (id: string): Group[] => [
  {
    no: "01",
    name: "Understand",
    tabs: [
      { to: `/analyses/${id}`, label: "Overview", end: true },
      { to: `/analyses/${id}/requirements`, label: "Requirements" },
      { to: `/analyses/${id}/standards`, label: "Standards" },
    ],
  },
  {
    no: "02",
    name: "Verify",
    tabs: [
      { to: `/analyses/${id}/issues`, label: "Issues & Gaps" },
      { to: `/analyses/${id}/evidence`, label: "Evidence" },
      { to: `/analyses/${id}/recommendations`, label: "Why matched" },
    ],
  },
  {
    no: "03",
    name: "Decide",
    tabs: [
      { to: `/analyses/${id}/review`, label: "Review" },
      { to: `/analyses/${id}/audit`, label: "Coverage detail" },
    ],
  },
  {
    no: "04",
    name: "Output",
    tabs: [{ to: `/analyses/${id}/reports`, label: "Report" }],
  },
];

const explore = (id: string): Tab[] => [
  { to: `/analyses/${id}/regulatory`, label: "Certification & QCO" },
  { to: `/analyses/${id}/graph`, label: "How standards connect" },
  { to: `/analyses/${id}/copilot`, label: "Copilot & history" },
];

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
    isActive ? "bg-primary-soft text-primary" : "text-muted hover:bg-panel hover:text-ink"
  }`;

export function AnalysisTabs({ id }: { id: string }) {
  const location = useLocation();
  const exploreTabs = explore(id);
  const onExplore = exploreTabs.some((t) => location.pathname === t.to);
  const [open, setOpen] = useState(onExplore);

  return (
    <nav className="mb-6 border-b border-line pb-3" aria-label="Analysis sections">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
        {groups(id).map((g, gi) => (
          <div key={g.no} className="flex items-center gap-x-1">
            {gi > 0 && <span className="mx-1.5 h-6 w-px bg-line" aria-hidden />}
            <span className="mr-0.5 flex items-baseline gap-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted/70">
              <span className="tabular-nums text-primary/50">{g.no}</span>
              {g.name}
            </span>
            {g.tabs.map((t) => (
              <NavLink key={t.to} to={t.to} end={t.end} className={tabClass}>
                {t.label}
              </NavLink>
            ))}
          </div>
        ))}

        <button
          onClick={() => setOpen((v) => !v)}
          className={`ml-auto flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
            onExplore ? "text-primary" : "text-muted hover:bg-panel hover:text-ink"
          }`}
          aria-expanded={open}
        >
          Explore
          <span className={`text-xs transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
        </button>
      </div>

      {open && (
        <div className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-1 rounded-lg bg-panel/60 px-3 py-2">
          <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted/70">Analyst tools</span>
          {exploreTabs.map((t) => (
            <NavLink key={t.to} to={t.to} end className={tabClass}>
              {t.label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  );
}
