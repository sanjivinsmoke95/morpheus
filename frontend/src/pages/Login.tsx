import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { apiError } from "@/lib/api";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@morpheus.example.com");
  const [password, setPassword] = useState("dev");  // DEV MODE: any password works
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
    <div className="grid min-h-screen place-items-center bg-canvas px-4 text-ink">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-primary text-lg font-bold text-white">M</div>
          <div>
            <div className="text-lg font-semibold tracking-wide">MORPHEUS</div>
            <div className="text-xs text-muted">Standards Compliance for Public Procurement</div>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-3 rounded-2xl border border-line bg-surface p-6 shadow-[0_8px_30px_rgba(73,55,27,0.05)]">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="username"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">Password</label>
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
            className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <div className="flex justify-center gap-1.5 pt-1">
            {["admin", "officer", "reviewer"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setEmail(`${r}@morpheus.example.com`)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                  email === `${r}@morpheus.example.com`
                    ? "bg-primary-soft text-primary"
                    : "bg-panel text-muted hover:bg-line/60"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <p className="text-center text-xs text-muted">
            Demo mode: any password works. Pick a role above and sign in.
          </p>
        </form>
      </div>
    </div>
  );
}
