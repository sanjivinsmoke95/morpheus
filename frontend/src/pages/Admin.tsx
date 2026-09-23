import { useRef, useState } from "react";
import { apiError } from "@/lib/api";
import { Button, Card, PageHeader } from "@/components/ui";
import { useAdminHealth, useCreateStandard, useImportStandards, useIngestion } from "@/lib/morpheus";

const cls = "rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-primary";

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
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Admin"
        subtitle="Manage the authoritative standards catalogue. Officers cannot edit these records."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <div className="mb-2 text-sm font-medium text-ink">Dataset</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {ingestion && Object.entries(ingestion).map(([k, v]) => (
              <div key={k} className="flex justify-between rounded bg-panel px-2 py-1">
                <span className="text-muted">{k.replace(/_/g, " ")}</span>
                <span className="font-medium text-ink">{String(v)}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <div className="mb-2 text-sm font-medium text-ink">System health</div>
          <div className="space-y-1 text-xs">
            {health && Object.entries(health.components).map(([k, v]: [string, any]) => (
              <div key={k} className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${v.status === "ok" || v.available ? "bg-success" : v.status === "not_configured" ? "bg-muted" : "bg-danger"}`} />
                <span className="flex-1 text-muted">{k.replace(/_/g, " ")}</span>
                <span className="text-muted">{v.status ?? (v.available ? "ok" : "off")}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-4 p-4">
        <div className="mb-3 text-sm font-medium text-ink">Add a standard</div>
        <div className="grid gap-2 sm:grid-cols-2">
          <input value={isNumber} onChange={(e) => setIsNumber(e.target.value)} placeholder="IS number (e.g. IS 9999 : 2024)" className={cls} />
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className={cls} />
          <input value={scope} onChange={(e) => setScope(e.target.value)} placeholder="Scope" className={`${cls} sm:col-span-2`} />
          <input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="Keywords (comma-separated)" className={`${cls} sm:col-span-2`} />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Button onClick={addStandard} disabled={create.isPending || !isNumber.trim() || !title.trim()}>
            {create.isPending ? "Adding…" : "Add standard"}
          </Button>
          {create.isSuccess && <span className="text-xs text-success">Added + indexed.</span>}
          {create.isError && <span className="text-xs text-danger">{apiError(create.error)}</span>}
        </div>
      </Card>

      <Card className="mt-4 p-4">
        <div className="mb-2 text-sm font-medium text-ink">Import standards (CSV)</div>
        <p className="mb-3 text-xs text-muted">Columns: is_number, title, scope, sector, keywords (semicolon-separated).</p>
        <input ref={fileRef} type="file" accept=".csv" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importCsv.mutate(f); }} />
        <Button variant="secondary" onClick={() => fileRef.current?.click()}>Choose CSV…</Button>
        {importCsv.data && (
          <span className="ml-3 text-xs text-success">
            {importCsv.data.inserted} inserted, {importCsv.data.updated} updated, {importCsv.data.rejected.length} rejected.
          </span>
        )}
      </Card>
    </div>
  );
}
