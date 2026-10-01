import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { prefetchAnalysisBundle } from "@/lib/navigation";

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
  `relative -mb-px whitespace-nowrap border-b-2 px-1.5 pb-2.5 text-sm ${
    isActive
      ? "border-primary text-primary font-bold shadow-[0_1px_0_0_var(--color-primary)]"
      : "border-transparent text-muted hover:border-line hover:text-ink font-medium"
  }`;

export function AnalysisTabs({ id }: { id: string }) {
  const location = useLocation();
  const advTabs = advanced(id);
  const onAdvanced = advTabs.some((t) => location.pathname === t.to);
  const [open, setOpen] = useState(onAdvanced);

  // Instantly warm the cache for all analysis tabs so navigation is 0ms
  useEffect(() => {
    prefetchAnalysisBundle(id);
  }, [id]);

  return (
    <nav className="mb-6 border-b border-line" aria-label="Analysis sections">
      <div className="flex flex-wrap items-center gap-x-5">
        {primary(id).map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={tabClass}
            onMouseEnter={() => prefetchAnalysisBundle(id)}
          >
            {t.label}
          </NavLink>
        ))}
        <button
          onClick={() => setOpen((v) => !v)}
          className={`ml-auto flex items-center gap-1 pb-2.5 text-sm font-semibold transition-colors cursor-pointer ${
            onAdvanced ? "text-primary" : "text-muted hover:text-ink"
          }`}
          aria-expanded={open}
        >
          Advanced
          <span className={`text-xs transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
        </button>
      </div>

      {open && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-b-lg bg-panel/70 px-3.5 py-2.5 border-t border-line/40">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Analyst tools</span>
          {advTabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end
              onMouseEnter={() => prefetchAnalysisBundle(id)}
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
