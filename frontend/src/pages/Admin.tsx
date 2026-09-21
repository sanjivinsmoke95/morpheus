import { useRef, useState } from "react";
import { apiError } from "@/lib/api";
import { useAdminHealth, useCreateStandard, useImportStandards, useIngestion } from "@/lib/morpheus";

export function AdminPage() {
  const { data: ingestion } = useIngestion();
  const { data: health } = useAdminHealth();
  const create = useCreateStandard();
  const importCsv = useImportStandards();
  const fileRef = useRef<HTMLInputElement>(null);

  const [isNumber, setIsNumber] = useState("");
  const [title, setTitle] = useState("");
  const [scope, setScope] = useState("");
  const [keywords, setKeywords] = useState("");

  function addStandard() {
    if (!isNumber.trim() || !title.trim()) return;
    create.mutate(
      { is_number: isNumber.trim(), title: title.trim(), scope, keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean), data_origin: "CURATED" },
      { onSuccess: () => { setIsNumber(""); setTitle(""); setScope(""); setKeywords(""); } },
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="text-xl font-semibold">Admin</h1>
      <p className="mt-0.5 text-sm text-zinc-400">Manage the authoritative standards catalogue. Officers cannot edit these records.</p>

      {/* Ingestion + health */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="mb-2 text-sm font-medium">Dataset</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {ingestion && Object.entries(ingestion).map(([k, v]) => (
              <div key={k} className="flex justify-between rounded bg-white/5 px-2 py-1">
                <span className="text-zinc-400">{k.replace(/_/g, " ")}</span>
                <span className="font-mono text-zinc-200">{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="mb-2 text-sm font-medium">System health</div>
          <div className="space-y-1 text-xs">
            {health && Object.entries(health.components).map(([k, v]: [string, any]) => (
              <div key={k} className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${v.status === "ok" || v.available ? "bg-emerald-400" : v.status === "not_configured" ? "bg-zinc-500" : "bg-red-400"}`} />
                <span className="flex-1 text-zinc-400">{k.replace(/_/g, " ")}</span>
                <span className="font-mono text-zinc-500">{v.status ?? (v.available ? "ok" : "off")}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add standard */}
      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
        <div className="mb-3 text-sm font-medium">Add a standard</div>
        <div className="grid gap-2 sm:grid-cols-2">
          <input value={isNumber} onChange={(e) => setIsNumber(e.target.value)} placeholder="IS number (e.g. IS 9999 : 2024)" className={cls} />
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className={cls} />
          <input value={scope} onChange={(e) => setScope(e.target.value)} placeholder="Scope" className={`${cls} sm:col-span-2`} />
          <input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="Keywords (comma-separated)" className={`${cls} sm:col-span-2`} />
        </div>
        <div className="mt-2 flex items-center gap-3">
          <button onClick={addStandard} disabled={create.isPending || !isNumber.trim() || !title.trim()}
            className="rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-medium text-black hover:bg-emerald-400 disabled:opacity-50">
            {create.isPending ? "Adding…" : "Add standard"}
          </button>
          {create.isSuccess && <span className="text-xs text-emerald-400">Added + indexed.</span>}
          {create.isError && <span className="text-xs text-red-400">{apiError(create.error)}</span>}
        </div>
      </div>

      {/* CSV import */}
      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
        <div className="mb-2 text-sm font-medium">Import standards (CSV)</div>
        <p className="mb-2 text-xs text-zinc-500">Columns: is_number, title, scope, sector, keywords (semicolon-separated).</p>
        <input ref={fileRef} type="file" accept=".csv" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importCsv.mutate(f); }} />
        <button onClick={() => fileRef.current?.click()} className="rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20">
          Choose CSV…
        </button>
        {importCsv.data && (
          <span className="ml-3 text-xs text-emerald-400">
            {importCsv.data.inserted} inserted, {importCsv.data.updated} updated, {importCsv.data.rejected.length} rejected.
          </span>
        )}
      </div>
    </div>
  );
}

const cls = "rounded-md border border-white/10 bg-black/30 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-500";
