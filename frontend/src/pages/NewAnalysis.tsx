import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiError } from "@/lib/api";
import { useCreateAnalysis } from "@/lib/morpheus";

const SECTORS = ["", "mechanical", "electrical", "water", "civil", "construction", "materials", "food", "electronics"];

export function NewAnalysisPage() {
  const navigate = useNavigate();
  const create = useCreateAnalysis();
  const [file, setFile] = useState<File | null>(null);
  const [sector, setSector] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function submit() {
    if (!file) return;
    create.mutate(
      { file, sector, title: file.name },
      { onSuccess: (a) => navigate(`/analyses/${a.id}/processing`) },
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-xl font-semibold">New analysis</h1>
      <p className="mt-0.5 text-sm text-zinc-400">Upload a procurement specification (PDF, DOCX or TXT).</p>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); setFile(e.dataTransfer.files[0] ?? null); }}
        onClick={() => inputRef.current?.click()}
        className={`mt-5 cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          dragOver ? "border-emerald-400 bg-emerald-500/5" : "border-white/15 hover:border-white/30"
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
            <div className="text-sm font-medium text-emerald-300">{file.name}</div>
            <div className="text-xs text-zinc-500">{Math.round(file.size / 1024)} KB — click to replace</div>
          </div>
        ) : (
          <div className="text-sm text-zinc-400">Drag a file here, or click to browse</div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <label className="text-xs text-zinc-400">Sector</label>
        <select
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-emerald-500"
        >
          {SECTORS.map((s) => <option key={s} value={s}>{s || "(auto / unspecified)"}</option>)}
        </select>
      </div>

      {create.isError && <p className="mt-3 text-sm text-red-400">{apiError(create.error)}</p>}

      <button
        onClick={submit}
        disabled={!file || create.isPending}
        className="mt-5 rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-black hover:bg-emerald-400 disabled:opacity-50"
      >
        {create.isPending ? "Uploading…" : "Start analysis"}
      </button>
    </div>
  );
}
