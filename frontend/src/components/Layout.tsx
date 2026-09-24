import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

type NavItem = { to: string; label: string; icon: string; end?: boolean; roles?: string[] };

const MAIN: NavItem[] = [
  { to: "/", label: "Dashboard", icon: "home", end: true },
  { to: "/analyses/new", label: "New Analysis", icon: "plus" },
  { to: "/history", label: "My Tenders", icon: "docs" },
  { to: "/standards", label: "Standards Library", icon: "book" },
  { to: "/analytics", label: "Reports", icon: "report" },
];
const SECONDARY: NavItem[] = [
  { to: "/regulatory-updates", label: "Regulatory Updates", icon: "bell" },
  { to: "/admin", label: "Admin", icon: "gear", roles: ["ADMIN"] },
  { to: "/evaluation", label: "Accuracy Proof", icon: "check", roles: ["ADMIN", "REVIEWER"] },
  { to: "/help", label: "Help & Support", icon: "help" },
];

function Icon({ name }: { name: string }) {
  const p: Record<string, string> = {
    home: "M3 10.5 12 3l9 7.5M5 9.5V20h5v-5h4v5h5V9.5",
    plus: "M12 5v14M5 12h14",
    docs: "M7 3h7l5 5v13H7zM14 3v5h5",
    book: "M4 5a2 2 0 0 1 2-2h11v16H6a2 2 0 0 0-2 2z",
    report: "M5 21V8l5-5h9v18zM10 3v5H5",
    bell: "M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2 2 0 0 0 4 0",
    gear: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.7-1L14.5 2h-4l-.4 2.5a7 7 0 0 0-1.7 1l-2.3-1-2 3.4L4 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7 7 0 0 0 1.7-1l2.3 1 2-3.4L18.9 13",
    check: "M20 6 9 17l-5-5",
    help: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M9.5 9a2.5 2.5 0 0 1 4.5 1.5c0 1.5-2 2-2 3M12 17h.01",
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d={p[name] ?? p.home} />
    </svg>
  );
}

function visible(i: NavItem, role?: string) {
  return !i.roles || (role != null && i.roles.includes(role));
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
    isActive ? "bg-white text-primary shadow-sm" : "text-white/75 hover:bg-white/10 hover:text-white"
  }`;

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);

  const sidebar = (
    <div
      className="flex h-full flex-col text-white"
      style={{ background: "#16362d" }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 pb-2 pt-5">
        <img src="/brand/government_emblem_left.png" alt="" className="h-9 w-auto brightness-0 invert" />
        <div className="leading-tight">
          <div className="font-display text-lg font-semibold tracking-wide">MORPHEUS</div>
          <div className="text-[10px] leading-tight text-white/55">Standards Intelligence<br />for Public Procurement</div>
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {MAIN.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.end} className={linkClass} onClick={() => setMobileOpen(false)}>
            <Icon name={i.icon} /> {i.label}
          </NavLink>
        ))}
        <div className="my-3 border-t border-white/10" />
        {SECONDARY.filter((i) => visible(i, user?.role)).map((i) => (
          <NavLink key={i.to} to={i.to} className={linkClass} onClick={() => setMobileOpen(false)}>
            <Icon name={i.icon} /> {i.label}
          </NavLink>
        ))}
      </nav>

      {/* Decorative footer (matches the design: monuments line-art + motto + quote) */}
      <div className="px-4 pb-5 pt-2 text-center">
        <img src="/brand/india_gate_lineart.png" alt="" className="mx-auto w-full max-w-[210px]"
          style={{ mixBlendMode: "lighten" }} />
        <div className="mt-1 text-[12px] font-semibold leading-tight text-white/85">
          Transparent Procurement<br />Stronger India
        </div>
        <div className="mx-auto my-2.5 h-2 w-16 rounded-full"
          style={{ background: "linear-gradient(90deg,#FF9933,#ffffff,#138808)", clipPath: "polygon(0 40%,100% 0,100% 60%,0 100%)" }} />
        <p className="text-[11px] italic leading-snug text-white/55">
          “Good governance<br />builds a stronger nation.”
        </p>
        <p className="mt-0.5 text-[10px] text-white/45">— Government of India</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas text-ink lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-none lg:block">
        <div className="fixed inset-y-0 left-0 w-64">{sidebar}</div>
      </aside>

      {/* Mobile slide-over */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMobileOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0 w-64">
            <button onClick={() => setMobileOpen(false)} aria-label="Close menu"
              className="absolute right-3 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg text-white/80 hover:bg-white/10">✕</button>
            {sidebar}
          </div>
        </div>
      )}

      {/* Content column */}
      <div className="min-w-0 flex-1">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8"
          style={{ top: "env(safe-area-inset-top, 0px)" }}>
          <button onClick={() => setMobileOpen(true)} aria-label="Open menu"
            className="grid h-9 w-9 flex-none place-items-center rounded-lg text-muted hover:bg-panel lg:hidden">☰</button>
          <div className="relative min-w-0 flex-1 max-w-xl">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" strokeLinecap="round" />
              </svg>
            </span>
            <input placeholder="Search tenders, standards, keywords…"
              className="w-full rounded-xl border border-line bg-canvas py-2 pl-9 pr-14 text-sm text-ink outline-none focus:border-primary"
              onKeyDown={(e) => { if (e.key === "Enter") navigate("/standards"); }} />
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-line bg-surface px-1.5 py-0.5 text-[10px] text-muted sm:block">⌘K</kbd>
          </div>
          <button className="relative grid h-9 w-9 flex-none place-items-center rounded-lg text-muted hover:bg-panel" aria-label="Notifications">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5"><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2 2 0 0 0 4 0" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger ring-2 ring-surface" />
          </button>
          <div className="relative flex-none">
            <button onClick={() => setUserMenu((v) => !v)} className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-panel">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-xs font-semibold text-white">
                {(user?.full_name || "U").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
              </span>
              <span className="hidden text-left leading-tight sm:block">
                <span className="block text-xs font-semibold text-ink">{user?.full_name || user?.email}</span>
                <span className="block text-[10px] capitalize text-muted">{(user?.role || "").toLowerCase()}</span>
              </span>
              <span className="hidden text-xs text-muted sm:block">▾</span>
            </button>
            {userMenu && (
              <>
                <button className="fixed inset-0 z-10 cursor-default" aria-hidden onClick={() => setUserMenu(false)} />
                <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-lg">
                  <button onClick={() => { setUserMenu(false); logout(); }}
                    className="block w-full px-3 py-2 text-left text-sm text-danger hover:bg-danger-soft">Sign out</button>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
        <footer className="mx-auto max-w-[1400px] px-4 pb-8 sm:px-6 lg:px-8">
          <p className="border-t border-line pt-4 text-[11px] leading-snug text-muted">
            Prototype — not an official Government of India system. Standards data shown may be labelled
            <span className="font-medium"> DEMO_SYNTHETIC</span> and is not authoritative BIS data.
          </p>
        </footer>
      </div>
    </div>
  );
}
