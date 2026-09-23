import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth";

type NavItem = { to: string; label: string; icon: string; roles?: string[] };

const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: "⌂" },
  { to: "/analyses/new", label: "New analysis", icon: "＋" },
  { to: "/history", label: "My tenders", icon: "▤" },
];

const SECONDARY: NavItem[] = [
  { to: "/evaluation", label: "Evaluation", icon: "◈", roles: ["ADMIN", "REVIEWER"] },
  { to: "/feedback", label: "Feedback", icon: "✦", roles: ["ADMIN"] },
  { to: "/admin", label: "Administration", icon: "⚙", roles: ["ADMIN"] },
];

export function Layout() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const roleItems = SECONDARY.filter((i) => !i.roles || (user && i.roles.includes(user.role)));

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col bg-primary text-white lg:flex">
        <div className="border-b border-white/10 px-5 py-5">
          <NavLink to="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/20 bg-white/10 text-lg font-bold">M</span>
            <span>
              <span className="block text-[15px] font-extrabold tracking-[0.16em]">MORPHEUS</span>
              <span className="block text-[10px] leading-4 text-white/60">Standards intelligence</span>
            </span>
          </NavLink>
          <div className="mt-4 h-[3px] overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/3 bg-[#ff9933]" />
            <div className="ml-1/3 -mt-[3px] h-full w-1/3 bg-white" />
            <div className="ml-2/3 -mt-[3px] h-full w-1/3 bg-[#138808]" />
          </div>
        </div>

        <nav className="flex-1 px-3 py-5">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">Workspace</div>
          <div className="space-y-1">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === "/"} className={sideLink}>
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/5 text-sm">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
          <div className="mt-8 px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">Workspace tools</div>
          <div className="space-y-1">
            <NavLink to="/history" className={sideLink}><span className="grid h-7 w-7 place-items-center rounded-lg bg-white/5">◷</span><span>History</span></NavLink>
          </div>
          {roleItems.length > 0 && (
            <>
              <div className="mt-8 px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">Administration</div>
              <div className="space-y-1">
                {roleItems.map((item) => <NavLink key={item.to} to={item.to} className={sideLink}><span className="grid h-7 w-7 place-items-center rounded-lg bg-white/5">{item.icon}</span><span>{item.label}</span></NavLink>)}
              </div>
            </>
          )}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="rounded-xl bg-white/7 p-3">
            <div className="text-[10px] uppercase tracking-widest text-white/40">Morpheus principle</div>
            <div className="mt-1 text-xs leading-5 text-white/75">AI understands · Search discovers · Rules validate · Evidence supports</div>
          </div>
          <button onClick={logout} className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-white/55 hover:bg-white/10 hover:text-white">↪ Sign out</button>
        </div>
      </aside>

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-20 border-b border-line/80 bg-[#fffdf8]/90 backdrop-blur">
          <div className="mx-auto flex h-[72px] max-w-[1440px] items-center gap-3 px-4 sm:px-6 xl:px-8">
            <div className="flex items-center gap-2 lg:hidden">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-sm font-bold text-white">M</span>
              <span className="font-extrabold tracking-[0.12em]">MORPHEUS</span>
            </div>
            <div className="hidden min-w-0 flex-1 md:block">
              <div className="relative max-w-xl">
                <span className="pointer-events-none absolute left-3 top-2.5 text-muted">⌕</span>
                <input placeholder="Search tenders, standards, or keywords…" className="h-10 w-full rounded-xl border border-line bg-white pl-9 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10" />
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-white text-muted hover:bg-panel">◔</button>
              <div className="relative">
                <button onClick={() => setMenuOpen(v => !v)} className="flex items-center gap-2 rounded-xl border border-line bg-white px-2 py-1.5 hover:bg-panel" aria-expanded={menuOpen}>
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-saffron text-xs font-bold text-white">{(user?.full_name || user?.email || "?").slice(0,1).toUpperCase()}</span>
                  <span className="hidden text-left sm:block">
                    <span className="block max-w-[130px] truncate text-xs font-bold">{user?.full_name || user?.email}</span>
                    <span className="block text-[10px] text-muted">{user?.role}</span>
                  </span>
                  <span className="text-xs text-muted">⌄</span>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-line bg-surface p-1.5 shadow-xl">
                    <NavLink to="/history" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-panel">My tenders</NavLink>
                    <button onClick={() => { setMenuOpen(false); logout(); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-danger-soft">Sign out</button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex h-[3px]">
            <div className="w-1/3 bg-[#ff9933]" /><div className="w-1/3 bg-white" /><div className="w-1/3 bg-[#138808]" />
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 xl:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const sideLink = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
    isActive ? "bg-white text-primary shadow-sm" : "text-white/68 hover:bg-white/10 hover:text-white"
  }`;
