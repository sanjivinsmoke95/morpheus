import { Link } from "react-router-dom";
import { Card, PageHeader } from "@/components/ui";

const STEPS = [
  { t: "1. Upload a tender", d: "Go to New Analysis and upload a PDF/DOCX/TXT specification, or paste the text directly." },
  { t: "2. Review the overview", d: "MORPHEUS extracts requirements and gives a verdict: ready, review, or action required." },
  { t: "3. Check standards & QCO", d: "Standards Review ranks applicable Indian Standards and flags QCO-mandatory certification." },
  { t: "4. Resolve issues", d: "Issues & Gaps lists conflicts, gaps and outdated references with recommended actions." },
  { t: "5. Verify evidence", d: "Evidence traces every match to a clause, and Ask MORPHEUS answers from stored evidence." },
  { t: "6. Generate the report", d: "The Report tab produces a curated summary + audit-ready PDF to attach to the tender file." },
];

export function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Help & Support" subtitle="How MORPHEUS turns a tender specification into a standards-checked, audit-ready decision." />
      <div className="grid gap-3 sm:grid-cols-2">
        {STEPS.map((s) => (
          <Card key={s.t} className="p-4">
            <div className="text-sm font-semibold text-ink">{s.t}</div>
            <div className="mt-1 text-sm text-muted">{s.d}</div>
          </Card>
        ))}
      </div>
      <Card className="mt-4 p-5">
        <div className="text-sm font-semibold text-ink">The core principle</div>
        <p className="mt-1 text-sm text-muted">
          AI understands · Search discovers · The knowledge graph connects · Rules validate · Evidence supports ·
          <span className="font-medium text-ink"> the officer decides.</span> MORPHEUS never invents a standard,
          clause or legal status — when evidence is insufficient it abstains.
        </p>
        <Link to="/analyses/new" className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark">
          Start a new analysis →
        </Link>
      </Card>
    </div>
  );
}
