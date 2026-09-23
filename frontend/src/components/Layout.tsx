import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth";

type NavItem = { to: string; label: string; roles?: string[] };

const NAV: NavItem[] = [
  { to: "/", label: "Home" },
  { to: "/analyses/new", label: "New Analysis" },
  { to: "/history", label: "History" },
];

const ACCOUNT_NAV: NavItem[] = [
  { to: "/evaluation", label: "Evaluation", roles: ["ADMIN", "REVIEWER"] },
  { to: "/feedback", label: "Feedback", roles: ["ADMIN"] },
  { to: "/admin", label: "Admin", roles: ["ADMIN"] },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
    isActive ? "bg-white/15 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
  }`;

export function Layout() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const accountItems = ACCOUNT_NAV.filter((i) => !i.roles || (user && i.roles.includes(user.role)));

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="bg-primary text-white">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
          <NavLink to="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-white font-bold text-primary">
              M
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold tracking-wide">MORPHEUS</span>
              <span className="block text-[11px] text-white/70">
                Standards Compliance for Public Procurement
              </span>
            </span>
          </NavLink>

          <nav className="ml-4 hidden items-center gap-1 sm:flex">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === "/"} className={linkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="relative ml-auto">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-white/10"
              aria-expanded={menuOpen}
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-white/20 text-xs font-semibold">
                {(user?.full_name || user?.email || "?").slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden text-left leading-tight sm:block">
                <span className="block max-w-[10rem] truncate text-xs font-medium">
                  {user?.full_name || user?.email}
                </span>
                <span className="block text-[10px] uppercase tracking-wide text-white/70">
                  {user?.role}
                </span>
              </span>
              <span className="text-xs">▾</span>
            </button>

            {menuOpen && (
              <>
                <button
                  className="fixed inset-0 z-10 cursor-default"
                  aria-hidden
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-lg border border-line bg-surface py-1 text-ink shadow-lg">
                  <div className="border-b border-line px-3 py-2 sm:hidden">
                    {NAV.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === "/"}
                        onClick={() => setMenuOpen(false)}
                        className="block rounded px-2 py-1.5 text-sm text-ink hover:bg-panel"
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                  {accountItems.length > 0 && (
                    <div className="border-b border-line py-1">
                      {accountItems.map((item) => (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          onClick={() => setMenuOpen(false)}
                          className="block px-3 py-2 text-sm text-ink hover:bg-panel"
                        >
                          {item.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                    className="block w-full px-3 py-2 text-left text-sm text-danger hover:bg-danger-soft"
                  >
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
