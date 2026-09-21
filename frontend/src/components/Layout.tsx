import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth";

// Full product navigation. Phase 1 ships Dashboard; later phases enable the rest.
const NAV = [
  { to: "/", label: "Dashboard", enabled: true },
  { label: "New Analysis", enabled: false },
  { label: "Requirement Matrix", enabled: false },
  { label: "Recommendations", enabled: false },
  { label: "Knowledge Graph", enabled: false },
  { label: "Coverage & Gaps", enabled: false },
  { label: "Conflicts", enabled: false },
  { label: "Readiness", enabled: false },
  { label: "Review", enabled: false },
  { label: "Reports", enabled: false },
  { label: "History", enabled: false },
  { label: "Evaluation", enabled: false },
  { label: "Admin", enabled: false },
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
          {NAV.map((item) =>
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
