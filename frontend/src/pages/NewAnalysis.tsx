import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiError } from "@/lib/api";
import { Button, Card, PageHeader } from "@/components/ui";
import { useCreateAnalysis } from "@/lib/morpheus";

const SECTORS = ["", "electrical", "mechanical", "water", "civil", "construction", "materials", "electronics"];

const SAMPLES = [
  {
    title: "Municipal Solar Street Lighting Specification",
    sector: "electrical",
    text: `1. Luminaire Housing: Pressure die-cast aluminium housing with IP66 ingress protection and IK08 impact resistance according to IS 10322 (Part 5/Sec 3).
2. LED Module: System luminous efficacy >= 130 lm/W with correlated colour temperature 5700K adhering to IS 16102 (Part 1 and 2).
3. Driver & Protection: Electronic LED driver with surge protection >= 4kV and THD < 10% complying with IS 15885 (Part 2/Sec 13).
4. Battery & Storage: Lithium Ferrophosphate (LiFePO4) battery pack with smart BMS complying with IS 16046 and IS 16270.
5. Solar PV Module: Crystalline silicon terrestrial photovoltaic modules with efficiency >= 19% certified under IS 14286 and MNRE QCO statutory mandates.`,
  },
  {
    title: "Agricultural Submersible Pump Set 5HP",
    sector: "water",
    text: `1. Pump Unit: Multi-stage centrifugal water-lubricated submersible pump set conforming to IS 8034.
2. Motor Specification: Submersible 3-phase induction motor 415V, 50Hz with Class F insulation adhering to IS 9283.
3. Power Cable: 3-core flat PVC insulated copper conductor submersible cable complying with IS 694.
4. Discharge Pipe: Heavy-duty galvanized iron pipes class B conforming to IS 1239 (Part 1).`,
  },
  {
    title: "Reinforced Concrete Infrastructure Specification",
    sector: "civil",
    text: `1. Reinforcement Steel: High-strength deformed steel bars Grade Fe 500D with minimum elongation 16% conforming to IS 1786.
2. Cement: 53 Grade Ordinary Portland Cement (OPC) adhering strictly to IS 12269.
3. Concrete Mix: Design mix concrete grade M25/M30 with maximum aggregate size 20mm compliant with IS 456 code of practice.`,
  },
];

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

  function loadSample(s: (typeof SAMPLES)[number]) {
    setMode("text");
    setPasteTitle(s.title);
    setText(s.text);
    setSector(s.sector);
  }

  function submit() {
    if (mode === "file") {
      if (!file) return;
      create.mutate(
        { file, sector, title: file.name },
        { onSuccess: (a) => navigate(`/analyses/${a.id}/processing`) }
      );
    } else {
      if (!text.trim()) return;
      const name = (pasteTitle.trim() || "Pasted specification") + ".txt";
      const blob = new File([text], name, { type: "text/plain" });
      create.mutate(
        { file: blob, sector, title: name },
        { onSuccess: (a) => navigate(`/analyses/${a.id}/processing`) }
      );
    }
  }

  const canSubmit = mode === "file" ? !!file : !!text.trim();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="New Tender Analysis"
        subtitle="Upload or paste a procurement specification (PDF, DOCX, or TXT) to identify applicable Indian Standards, flag statutory QCO gaps, and formulate GeM-ready clauses."
      />

      {/* Quick Demo Tender Presets */}
      <div className="rounded-2xl border border-primary/25 bg-gradient-to-r from-primary-soft/30 via-surface to-surface p-4 shadow-2xs">
        <div className="flex items-center gap-2 mb-2">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-primary text-white text-xs font-bold">★</span>
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Quick Demo Tender Presets</span>
          <span className="text-[10px] text-muted">(Click to load verified test specification)</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {SAMPLES.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => loadSample(s)}
              className="rounded-xl border border-line bg-surface p-2.5 text-left transition-all hover:border-primary/50 hover:bg-panel hover:shadow-xs active:scale-[0.98] cursor-pointer"
            >
              <div className="truncate text-xs font-bold text-ink">{s.title}</div>
              <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted">
                <span className="rounded bg-panel px-1.5 py-0.2 font-semibold capitalize text-primary">{s.sector}</span>
                <span>·</span>
                <span>Ready to analyze</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <Card className="p-6 border border-line shadow-xs">
        {/* Mode Selector Tabs */}
        <div className="mb-5 inline-flex rounded-xl border border-line bg-panel/60 p-1 shadow-inner">
          <button
            type="button"
            onClick={() => setMode("file")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              mode === "file" ? "bg-surface text-primary shadow-xs ring-1 ring-line" : "text-muted hover:text-ink"
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span>Upload Document</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("text")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              mode === "text" ? "bg-surface text-primary shadow-xs ring-1 ring-line" : "text-muted hover:text-ink"
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Paste Clause Text</span>
          </button>
        </div>

        {mode === "file" ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              setFile(e.dataTransfer.files[0] ?? null);
            }}
            onClick={() => inputRef.current?.click()}
            className={`group cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
              dragOver
                ? "border-primary bg-primary-soft shadow-inner"
                : "border-line/80 hover:border-primary/60 hover:bg-panel/40"
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
              <div className="space-y-1.5">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-xs">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <div className="text-sm font-bold text-ink">{file.name}</div>
                <div className="font-tech text-xs text-muted">{Math.round(file.size / 1024)} KB · Click to replace file</div>
              </div>
            ) : (
              <div className="space-y-3">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-2xs group-hover:scale-105 transition-transform">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </span>
                <div>
                  <div className="text-sm font-bold text-ink">
                    Drag and drop tender file here, or <span className="text-primary underline">browse</span>
                  </div>
                  <div className="mt-1 text-xs text-muted">Supports procurement specifications in PDF, Word (DOCX), or plain text</div>
                </div>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <span className="rounded-md border border-line bg-surface px-2 py-0.5 font-tech text-[10px] font-bold text-muted">PDF</span>
                  <span className="rounded-md border border-line bg-surface px-2 py-0.5 font-tech text-[10px] font-bold text-muted">DOCX</span>
                  <span className="rounded-md border border-line bg-surface px-2 py-0.5 font-tech text-[10px] font-bold text-muted">TXT</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">Dossier Title</label>
              <input
                value={pasteTitle}
                onChange={(e) => setPasteTitle(e.target.value)}
                placeholder="e.g. Solar Street Light Specification — Municipal Corporation"
                className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">Technical Clauses</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={9}
                placeholder="Paste the tender specifications, parameter tables, or scope clauses here…"
                className="w-full rounded-xl border border-line bg-surface p-3.5 text-sm text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 font-mono text-xs leading-relaxed"
              />
              <div className="mt-1 flex items-center justify-between text-xs text-muted">
                <span>{text.trim() ? `${text.trim().length} characters entered` : "Paste specifications from tender document or notice."}</span>
                {text.trim() && (
                  <button type="button" onClick={() => setText("")} className="text-danger hover:underline">Clear text</button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sector Selection */}
        <div className="mt-6 border-t border-line/80 pt-5 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-muted">Procurement Sector</label>
            <span className="text-[11px] text-muted">Select sector to boost domain-specific BIS matching</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {SECTORS.map((s) => {
              const active = sector === s;
              const label = s ? s[0].toUpperCase() + s.slice(1) : "Auto-detect";
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSector(s)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? "bg-primary text-white shadow-xs ring-1 ring-primary"
                      : "border border-line bg-surface text-muted hover:border-primary/50 hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {create.isError && (
          <div className="mt-4 rounded-xl border border-danger/30 bg-danger-soft p-3 text-xs font-semibold text-danger">
            {apiError(create.error)}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-line/80 pt-4">
          <span className="text-xs text-muted">
            {mode === "file" ? (file ? "Ready to ingest and extract" : "Select a document to continue") : (text.trim() ? "Ready to analyze clauses" : "Enter specification clauses")}
          </span>
          <Button
            onClick={submit}
            disabled={!canSubmit || create.isPending}
            className="bg-primary hover:bg-primary-dark text-white px-6 py-2.5 text-sm font-bold shadow-xs cursor-pointer disabled:opacity-50"
          >
            {create.isPending ? "Ingesting & Analyzing…" : "Start Standards Analysis →"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

