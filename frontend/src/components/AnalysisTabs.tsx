import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

type Tab = { to: string; label: string; end?: boolean };

// Primary analysis workflow — one simple row, read left to right.
const primary = (id: string): Tab[] => [
  { to: `/analyses/${id}`, label: "Overview", end: true },
  { to: `/analyses/${id}/requirements`, label: "Requirements" },
  { to: `/analyses/${id}/standards`, label: "Standards" },
  { to: `/analyses/${id}/issues`, label: "Issues & Gaps" },
  { to: `/analyses/${id}/evidence`, label: "Evidence" },
  { to: `/analyses/${id}/review`, label: "Review" },
  { to: `/analyses/${id}/reports`, label: "Report" },
];

// Secondary / analyst tools — available, not competing for attention.
const advanced = (id: string): Tab[] => [
  { to: `/analyses/${id}/recommendations`, label: "Why matched" },
  { to: `/analyses/${id}/copilot`, label: "Copilot" },
  { to: `/analyses/${id}/graph`, label: "Knowledge graph" },
  { to: `/analyses/${id}/audit`, label: "Coverage detail" },
  { to: `/analyses/${id}/regulatory`, label: "Certification & QCO" },
];

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `whitespace-nowrap border-b-2 px-1 pb-2 text-sm font-medium transition-colors ${
    isActive ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"
  }`;

export function AnalysisTabs({ id }: { id: string }) {
  const location = useLocation();
  const advTabs = advanced(id);
  const onAdvanced = advTabs.some((t) => location.pathname === t.to);
  const [open, setOpen] = useState(onAdvanced);

  return (
    <nav className="mb-6 border-b border-line" aria-label="Analysis sections">
      <div className="flex flex-wrap items-center gap-x-5">
        {primary(id).map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={tabClass}>
            {t.label}
          </NavLink>
        ))}
        <button
          onClick={() => setOpen((v) => !v)}
          className={`ml-auto flex items-center gap-1 pb-2 text-sm font-medium transition-colors ${
            onAdvanced ? "text-primary" : "text-muted hover:text-ink"
          }`}
          aria-expanded={open}
        >
          Advanced
          <span className={`text-xs transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
        </button>
      </div>

      {open && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-b-lg bg-panel/60 px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted/70">Analyst tools</span>
          {advTabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end
              className={({ isActive }) =>
                `text-sm ${isActive ? "font-semibold text-primary" : "text-muted hover:text-ink"}`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  );
}
