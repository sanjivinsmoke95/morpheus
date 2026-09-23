import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth";

type NavItem = { to: string; label: string; icon: string; end?: boolean; roles?: string[] };
type NavGroup = { heading: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    heading: "Workspace",
    items: [
      { to: "/", label: "Dashboard", icon: "▦", end: true },
      { to: "/analyses/new", label: "New Analysis", icon: "＋" },
      { to: "/history", label: "My Tenders", icon: "▤" },
    ],
  },
  {
    heading: "Intelligence",
    items: [
      { to: "/analytics", label: "Department Analytics", icon: "◔" },
      { to: "/standards", label: "Standards Library", icon: "▣" },
      { to: "/regulatory-updates", label: "Regulatory Updates", icon: "◈" },
    ],
  },
  {
    heading: "Account",
    items: [
      { to: "/evaluation", label: "Accuracy Proof", icon: "◎", roles: ["ADMIN", "REVIEWER"] },
      { to: "/feedback", label: "Feedback", icon: "✎", roles: ["ADMIN"] },
      { to: "/admin", label: "Admin", icon: "⚙", roles: ["ADMIN"] },
    ],
  },
];

function itemVisible(item: NavItem, role?: string) {
  return !item.roles || (role != null && item.roles.includes(role));
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? "bg-white/15 text-white"
      : "text-white/75 hover:bg-white/10 hover:text-white"
  }`;

export function Layout() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebar = (
    <div className="flex h-full flex-col bg-primary text-white">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <img
          src="/brand/morpheus_wordmark_light.png"
          alt="MORPHEUS"
          className="h-7 w-auto"
        />
      </div>
      <div className="px-5 pb-4">
        <p className="text-[11px] leading-snug text-white/60">
          Standards Compliance Intelligence for Public Procurement
        </p>
      </div>

      {/* Nav */}
      <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-2">
        {NAV.map((group) => {
          const items = group.items.filter((i) => itemVisible(i, user?.role));
          if (items.length === 0) return null;
          return (
            <div key={group.heading}>
              <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/45">
                {group.heading}
              </div>
              <div className="space-y-0.5">
                {items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={linkClass}
                    onClick={() => setMobileOpen(false)}
                  >
                    <span className="w-4 text-center text-white/60" aria-hidden>
                      {item.icon}
                    </span>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User + sign out */}
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-white/20 text-xs font-semibold">
            {(user?.full_name || user?.email || "?").slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-xs font-medium">
              {user?.full_name || user?.email}
            </span>
            <span className="block text-[10px] uppercase tracking-wide text-white/60">
              {user?.role}
            </span>
          </span>
        </div>
        <button
          onClick={logout}
          className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white"
        >
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas text-ink lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 flex-none lg:block">
        <div className="fixed inset-y-0 left-0 w-60">{sidebar}</div>
      </aside>

      {/* Mobile top bar */}
      <header className="flex items-center gap-3 bg-primary px-4 py-3 text-white lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/10"
        >
          ☰
        </button>
        <img src="/brand/morpheus_wordmark_light.png" alt="MORPHEUS" className="h-6 w-auto" />
      </header>

      {/* Mobile slide-over */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMobileOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0 w-64">
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg text-white/80 hover:bg-white/10"
            >
              ✕
            </button>
            {sidebar}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="min-w-0 flex-1">
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
          <Outlet />
        </main>
        <footer className="mx-auto max-w-6xl px-4 pb-8 sm:px-6 lg:px-10">
          <p className="border-t border-line pt-4 text-[11px] leading-snug text-muted">
            Prototype — not an official Government of India system. Standards data shown may be
            labelled <span className="font-medium">DEMO_SYNTHETIC</span> and is not authoritative BIS
            data. Every finding is grounded in the uploaded document or the system abstains.
          </p>
        </footer>
      </div>
    </div>
  );
}
