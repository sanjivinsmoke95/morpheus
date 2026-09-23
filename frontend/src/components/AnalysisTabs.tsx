import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

type Tab = { to: string; label: string };

const primary = (id: string): Tab[] => [
  { to: `/analyses/${id}`, label: "Overview" },
  { to: `/analyses/${id}/standards`, label: "Standards" },
  { to: `/analyses/${id}/reports`, label: "Report" },
];

const advanced = (id: string): Tab[] => [
  { to: `/analyses/${id}/requirements`, label: "Requirements" },
  { to: `/analyses/${id}/recommendations`, label: "Match signals" },
  { to: `/analyses/${id}/audit`, label: "Coverage & findings" },
  { to: `/analyses/${id}/regulatory`, label: "Certification & QCO" },
  { to: `/analyses/${id}/graph`, label: "Knowledge graph" },
  { to: `/analyses/${id}/copilot`, label: "Copilot & history" },
  { to: `/analyses/${id}/review`, label: "Decision log" },
];

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `whitespace-nowrap border-b-2 px-1 pb-2 text-sm font-medium transition-colors ${
    isActive
      ? "border-primary text-primary"
      : "border-transparent text-muted hover:text-ink"
  }`;

export function AnalysisTabs({ id }: { id: string }) {
  const location = useLocation();
  const advTabs = advanced(id);
  const onAdvanced = advTabs.some((t) => location.pathname === t.to);
  const [open, setOpen] = useState(onAdvanced);

  return (
    <div className="mb-6 border-b border-line">
      <div className="flex flex-wrap items-center gap-x-6">
        {primary(id).map((t) => (
          <NavLink key={t.to} to={t.to} end className={tabClass}>
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
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-b-lg bg-panel px-3 py-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            Analyst view
          </span>
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
    </div>
  );
}
