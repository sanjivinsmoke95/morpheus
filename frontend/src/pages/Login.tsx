import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { apiError } from "@/lib/api";

const ROLES = [
  { key: "officer", label: "Procurement Officer", desc: "Review tenders, decide, generate reports" },
  { key: "reviewer", label: "Senior Reviewer", desc: "Verify decisions, sign off" },
  { key: "admin", label: "Administrator", desc: "Manage standards catalogue" },
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("officer@morpheus.example.com");
  const [password, setPassword] = useState("dev"); // DEV MODE: any password works
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas text-ink lg:grid lg:grid-cols-2">
      {/* Brand / hero panel */}
      <div className="relative hidden overflow-hidden bg-primary lg:block">
        <img
          src="/brand/hero_india_government_building.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/70 to-primary-dark/95" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <img src="/brand/morpheus_wordmark_light.png" alt="MORPHEUS" className="h-9 w-auto self-start" />
          <div className="max-w-md">
            <h1 className="font-display text-3xl font-semibold leading-tight">
              Every tender specification, checked against the Indian Standards ecosystem.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-white/80">
              MORPHEUS reads a procurement spec, maps each requirement to the applicable IS
              standards, flags QCO-mandatory certification, detects gaps and conflicts, and grounds
              every finding in evidence — so the officer decides with confidence.
            </p>
          </div>
          <p className="text-[11px] leading-snug text-white/55">
            Prototype — not an official Government of India system. Demo data labelled DEMO_SYNTHETIC.
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex min-h-screen items-center justify-center px-4 py-10 lg:min-h-0">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-primary text-lg font-bold text-white">
              M
            </div>
            <div>
              <div className="text-lg font-semibold tracking-wide">MORPHEUS</div>
              <div className="text-xs text-muted">Standards Compliance for Public Procurement</div>
            </div>
          </div>

          <h2 className="font-display text-2xl font-semibold text-ink">Sign in</h2>
          <p className="mt-1 text-sm text-muted">Choose your role to continue.</p>

          {/* Role cards */}
          <div className="mt-5 space-y-2">
            {ROLES.map((r) => {
              const value = `${r.key}@morpheus.example.com`;
              const active = email === value;
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setEmail(value)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                    active
                      ? "border-primary bg-primary-soft"
                      : "border-line bg-surface hover:border-primary/40"
                  }`}
                >
                  <span
                    className={`grid h-9 w-9 flex-none place-items-center rounded-full text-sm font-semibold ${
                      active ? "bg-primary text-white" : "bg-panel text-muted"
                    }`}
                  >
                    {r.label.slice(0, 1)}
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-sm font-semibold ${active ? "text-primary" : "text-ink"}`}>
                      {r.label}
                    </span>
                    <span className="block truncate text-xs text-muted">{r.desc}</span>
                  </span>
                  {active && <span className="ml-auto text-primary">✓</span>}
                </button>
              );
            })}
          </div>

          <form onSubmit={submit} className="mt-4 space-y-3">
            <input type="hidden" value={email} readOnly autoComplete="username" />
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Password</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="current-password"
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary"
              />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <button
              type="submit"
              disabled={busy || !email}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
            >
              {busy ? "Signing in…" : `Sign in as ${ROLES.find((r) => email.startsWith(r.key))?.label ?? "user"}`}
            </button>
            <p className="text-center text-xs text-muted">
              Demo mode — any password works.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
