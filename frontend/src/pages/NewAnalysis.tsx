import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiError } from "@/lib/api";
import { Button, Card, PageHeader } from "@/components/ui";
import { useCreateAnalysis } from "@/lib/morpheus";

const SECTORS = ["", "mechanical", "electrical", "water", "civil", "construction", "materials", "food", "electronics"];

export function NewAnalysisPage() {
  const navigate = useNavigate();
  const create = useCreateAnalysis();
  const [mode, setMode] = useState<"file" | "text">("file");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [pasteTitle, setPasteTitle] = useState("");
  const [sector, setSector] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function submit() {
    if (mode === "file") {
      if (!file) return;
      create.mutate({ file, sector, title: file.name },
        { onSuccess: (a) => navigate(`/analyses/${a.id}/processing`) });
    } else {
      if (!text.trim()) return;
      const name = (pasteTitle.trim() || "Pasted specification") + ".txt";
      const blob = new File([text], name, { type: "text/plain" });
      create.mutate({ file: blob, sector, title: name },
        { onSuccess: (a) => navigate(`/analyses/${a.id}/processing`) });
    }
  }

  const canSubmit = mode === "file" ? !!file : !!text.trim();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="New tender analysis"
        subtitle="Upload a procurement specification (PDF, DOCX or TXT) to check it against Indian Standards."
      />

      <Card className="p-6">
        <div className="mb-4 inline-flex rounded-lg border border-line p-0.5">
          <button onClick={() => setMode("file")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${mode === "file" ? "bg-primary text-white" : "text-muted hover:text-ink"}`}>
            Upload file
          </button>
          <button onClick={() => setMode("text")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${mode === "text" ? "bg-primary text-white" : "text-muted hover:text-ink"}`}>
            Paste text
          </button>
        </div>

        {mode === "file" ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); setFile(e.dataTransfer.files[0] ?? null); }}
            onClick={() => inputRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
              dragOver ? "border-primary bg-primary-soft" : "border-line hover:border-primary/50 hover:bg-panel"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div>
                <div className="text-sm font-semibold text-primary">{file.name}</div>
                <div className="mt-0.5 text-xs text-muted">{Math.round(file.size / 1024)} KB — click to replace</div>
              </div>
            ) : (
              <div className="text-sm text-muted">
                <span className="font-medium text-ink">Drag a tender document here</span>, or click to browse
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <input value={pasteTitle} onChange={(e) => setPasteTitle(e.target.value)}
              placeholder="Title (e.g. Solar pump spec — Rajasthan)"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary" />
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={10}
              placeholder="Paste the tender specification text here…"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary" />
            <div className="text-xs text-muted">{text.trim() ? `${text.trim().length} characters` : "Paste the spec from an email, table, or document."}</div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <label htmlFor="sector" className="text-sm font-medium text-muted">Sector</label>
          <select
            id="sector"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary"
          >
            {SECTORS.map((s) => <option key={s} value={s}>{s ? s[0].toUpperCase() + s.slice(1) : "Auto-detect"}</option>)}
          </select>
        </div>

        {create.isError && <p className="mt-4 text-sm text-danger">{apiError(create.error)}</p>}

        <div className="mt-6">
          <Button onClick={submit} disabled={!canSubmit || create.isPending}>
            {create.isPending ? "Uploading…" : "Start analysis"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
