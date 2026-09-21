import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface ComponentStatus {
  status: string;
  detail?: string;
}
interface Health {
  status: string;
  components: {
    database: ComponentStatus;
    neo4j: ComponentStatus;
    object_store: ComponentStatus;
    llm_provider: { name: string; available: boolean };
    embedding_provider: { name: string; available: boolean; dim: number };
  };
}

const DOT: Record<string, string> = {
  ok: "bg-emerald-400",
  not_configured: "bg-zinc-500",
  unavailable: "bg-red-400",
  degraded: "bg-amber-400",
};

export function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const { data: health, isLoading, isError } = useQuery<Health>({
    queryKey: ["health"],
    enabled: isAdmin,
    queryFn: async () => (await api.get<Health>("/admin/health")).data,
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <p className="mt-0.5 text-sm text-zinc-400">
        Signed in as <span className="text-zinc-200">{user?.email}</span> · role{" "}
        <span className="text-emerald-400">{user?.role}</span>
      </p>

      {/* Phase status */}
      <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-5">
        <div className="text-xs uppercase tracking-wide text-zinc-500">Build status</div>
        <div className="mt-1 text-sm">
          <span className="rounded bg-emerald-500/15 px-2 py-0.5 font-mono text-emerald-300">Phase 1 — Foundation</span>
          <span className="ml-2 text-zinc-400">
            auth, RBAC, database, migrations, health checks, provider abstraction.
          </span>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          Analysis pipeline (upload → requirements → recommendations → report) arrives in Phase 2.
        </p>
      </div>

      {/* System health */}
      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-5">
        <div className="mb-3 text-sm font-medium">System health</div>
        {!isAdmin ? (
          <p className="text-xs text-zinc-500">Component health is visible to administrators.</p>
        ) : isLoading ? (
          <div className="h-16 animate-pulse rounded-md bg-white/5" />
        ) : isError ? (
          <p className="text-sm text-red-400">Could not reach the API.</p>
        ) : health ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <HealthRow label="Database" status={health.components.database.status} />
            <HealthRow label="Object store" status={health.components.object_store.status} />
            <HealthRow label="Neo4j (graph)" status={health.components.neo4j.status} />
            <HealthRow
              label={`LLM provider (${health.components.llm_provider.name})`}
              status={health.components.llm_provider.available ? "ok" : "not_configured"}
              note={health.components.llm_provider.available ? "" : "stub — abstains until configured"}
            />
            <HealthRow
              label={`Embeddings (${health.components.embedding_provider.name})`}
              status={health.components.embedding_provider.available ? "ok" : "unavailable"}
              note={`dim ${health.components.embedding_provider.dim}`}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function HealthRow({ label, status, note }: { label: string; status: string; note?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm">
      <span className={`h-2 w-2 flex-none rounded-full ${DOT[status] ?? "bg-zinc-500"}`} />
      <span className="flex-1">{label}</span>
      <span className="font-mono text-[11px] text-zinc-500">{note || status}</span>
    </div>
  );
}
