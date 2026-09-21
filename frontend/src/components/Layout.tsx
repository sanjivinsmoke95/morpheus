import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth";

// Full product navigation. Phase 1 ships Dashboard; later phases enable the rest.
type NavItem = { to?: string; label: string; enabled: boolean; roles?: string[] };

const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", enabled: true },
  { to: "/analyses/new", label: "New Analysis", enabled: true },
  { to: "/history", label: "History", enabled: true },
  { to: "/evaluation", label: "Evaluation", enabled: true, roles: ["ADMIN", "REVIEWER"] },
  { to: "/feedback", label: "Feedback", enabled: true, roles: ["ADMIN"] },
  { to: "/admin", label: "Admin", enabled: true, roles: ["ADMIN"] },
];

export function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="flex min-h-screen bg-[#0b0f17] text-zinc-100">
      <aside className="flex w-60 flex-none flex-col border-r border-white/10 bg-black/20">
        <div className="flex items-center gap-2 px-4 py-4">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-emerald-500 font-bold text-black">M</div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-wide">MORPHEUS</div>
            <div className="font-mono text-[10px] text-zinc-500">standards intelligence</div>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 px-2 py-2 text-sm">
          {NAV.filter((item) => !item.roles || (user && item.roles.includes(user.role))).map((item) =>
            item.enabled && item.to ? (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) =>
                  `block rounded-md px-3 py-2 ${isActive ? "bg-emerald-500/15 text-emerald-300" : "text-zinc-300 hover:bg-white/5"}`
                }
              >
                {item.label}
              </NavLink>
            ) : (
              <div key={item.label} className="flex items-center justify-between rounded-md px-3 py-2 text-zinc-600">
                {item.label}
                <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wide">soon</span>
              </div>
            ),
          )}
        </nav>
        <div className="border-t border-white/10 p-3 text-xs">
          <div className="truncate font-medium">{user?.full_name || user?.email}</div>
          <div className="mb-2 text-[11px] text-emerald-400">{user?.role}</div>
          <button onClick={logout} className="w-full rounded-md bg-white/5 py-1.5 hover:bg-white/10">
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
