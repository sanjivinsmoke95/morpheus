import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { apiError } from "@/lib/api";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@morpheus.example.com");
  const [password, setPassword] = useState("");
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
    <div className="grid min-h-screen place-items-center bg-[#0b0f17] px-4 text-zinc-100">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-emerald-500 font-bold text-black">M</div>
          <div>
            <div className="text-lg font-semibold tracking-wide">MORPHEUS</div>
            <div className="font-mono text-[11px] text-zinc-500">procurement standards intelligence</div>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-5">
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="username"
              className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={busy || !email || !password}
            className="w-full rounded-md bg-emerald-500 py-2 text-sm font-medium text-black hover:bg-emerald-400 disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <p className="text-center text-[11px] text-zinc-500">
            Dev seed: admin / officer / reviewer @morpheus.example.com
          </p>
        </form>
      </div>
    </div>
  );
}
