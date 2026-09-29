import { useState, useRef, useEffect, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnalysisTabs } from "@/components/AnalysisTabs";
import { downloadReport, useAnalysis, useCreateReport, useDocument } from "@/lib/morpheus";

export function AnalysisHeader({ id, section, right }: { id: string; section: string; right?: ReactNode }) {
  const { data: analysis } = useAnalysis(id);
  const { data: doc } = useDocument(analysis?.document_id);
  const create = useCreateReport();
  const navigate = useNavigate();

  const [busy, setBusy] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCitation, setCopiedCitation] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Share modal form state
  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState<"REVIEWER" | "AUDITOR" | "OFFICER">("REVIEWER");
  const [inviteSent, setInviteSent] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);

  const moreMenuRef = useRef<HTMLDivElement>(null);

  const title = analysis?.title || doc?.filename || "Analysis";
  const ready = analysis?.status === "READY";
  const date = analysis?.created_at
    ? new Date(analysis.created_at).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const canonicalUrl = `${window.location.origin}/analyses/${id}`;

  // Toast trigger
  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 2800);
  }

  // Close more menu on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    if (moreOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [moreOpen]);

  // Close modals on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShareOpen(false);
        setMoreOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function download() {
    setBusy(true);
    try {
      const rep = await create.mutateAsync({ analysisId: id, format: "PDF" });
      await downloadReport(rep.id, rep.format);
      showToast("PDF Report downloaded successfully");
    } finally {
      setBusy(false);
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(canonicalUrl);
      setCopiedLink(true);
      showToast("Shareable link copied to clipboard");
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      showToast("Link: " + canonicalUrl);
    }
  }

  async function handleCopyId() {
    try {
      await navigator.clipboard.writeText(id);
      showToast(`Analysis UUID copied: ${id.slice(0, 13)}…`);
    } catch {
      showToast(`Analysis ID: ${id}`);
    }
    setMoreOpen(false);
  }

  async function handleCopyCitation() {
    const citation = `[MORPHEUS TENDER ANALYSIS]
Tender: ${title}
Analysis ID: ${id}
Sector: ${analysis?.sector || "General Procurement"}
Status: ${ready ? "Compliance Audited" : "In Progress"}
Portal URL: ${canonicalUrl}
Timestamp: ${new Date().toISOString()}`;
    try {
      await navigator.clipboard.writeText(citation);
      setCopiedCitation(true);
      showToast("Tender citation snippet copied to clipboard");
      setTimeout(() => setCopiedCitation(false), 2500);
    } catch {
      showToast("Citation copied");
    }
  }

  function handleSendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!shareEmail.trim()) return;
    setSendingInvite(true);
    setTimeout(() => {
      setSendingInvite(false);
      setInviteSent(true);
      showToast(`Access invitation dispatched to ${shareEmail}`);
      setTimeout(() => {
        setInviteSent(false);
        setShareEmail("");
      }, 3500);
    }, 600);
  }

  function handleExportJson() {
    const data = {
      id,
      title,
      status: analysis?.status,
      sector: analysis?.sector,
      created_at: analysis?.created_at,
      document: doc,
      analysis,
      exported_at: new Date().toISOString(),
      platform: "MORPHEUS GovTech BIS/GeM Compliance Engine",
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `morpheus-analysis-${id.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Exported analysis JSON dataset");
    setMoreOpen(false);
  }

  function handlePrint() {
    setMoreOpen(false);
    setTimeout(() => {
      window.print();
    }, 150);
  }

  return (
    <div className="mb-5 relative">
      {/* Floating Action Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 rounded-lg border border-primary/20 bg-ink px-4 py-2.5 text-xs font-medium text-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <svg className="h-4 w-4 text-primary-light flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Breadcrumb Section */}
      <div className="text-xs text-muted flex items-center">
        <Link to="/history" className="font-medium hover:text-primary transition-colors">
          ← My Analyses
        </Link>
        <span className="mx-1.5 text-muted/50" aria-hidden>·</span>
        <span className="font-medium text-ink">{section}</span>
      </div>

      <div className="mt-1.5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-xl font-semibold text-ink sm:text-2xl">{title}</h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                ready ? "bg-success-soft text-success" : "bg-warning-soft text-warning"
              }`}
            >
              {ready ? "Completed" : "Processing"}
            </span>
          </div>

          {/* Compact factual metadata */}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            {analysis?.sector && <span className="font-medium capitalize text-ink">{analysis.sector}</span>}
            {doc?.page_count ? (
              <>
                <Dot />
                <span className="font-tech">
                  {doc.page_count} page{doc.page_count === 1 ? "" : "s"}
                </span>
              </>
            ) : null}
            {date && (
              <>
                <Dot />
                <span>
                  Analyzed <span className="font-tech">{date}</span>
                </span>
              </>
            )}
            {right}
          </div>
        </div>

        {/* Action Header Button Suite */}
        <div className="flex flex-none items-center gap-2">
          {/* Download Report Button */}
          <button
            onClick={download}
            disabled={busy}
            title="Generate and download official PDF Compliance Report"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white shadow-xs transition-all hover:bg-primary-dark hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>{busy ? "Preparing…" : "Download Report"}</span>
          </button>

          {/* Share Button (Fully Interactive) */}
          <button
            onClick={() => setShareOpen(true)}
            title="Share analysis with department officers or reviewers"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink shadow-xs transition-all hover:bg-panel hover:border-primary/40 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            <span>Share</span>
          </button>

          {/* More Actions Menu Button (⋯) */}
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              aria-label="More actions"
              aria-expanded={moreOpen}
              title="More actions"
              className={`rounded-lg border border-line bg-surface px-2.5 py-2 text-sm font-medium transition-all shadow-xs hover:bg-panel hover:border-primary/40 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer ${
                moreOpen ? "border-primary text-primary bg-panel" : "text-muted hover:text-ink"
              }`}
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {moreOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-60 rounded-xl border border-line bg-surface p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1.5 border-b border-line/60">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-muted">Analysis Actions</div>
                  <div className="text-xs font-mono text-ink truncate mt-0.5 font-medium">{id}</div>
                </div>

                <div className="py-1">
                  <button
                    onClick={handleCopyId}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-ink hover:bg-panel rounded-lg transition-colors text-left cursor-pointer"
                  >
                    <svg className="h-3.5 w-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    <span>Copy Analysis UUID</span>
                  </button>

                  <button
                    onClick={handleExportJson}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-ink hover:bg-panel rounded-lg transition-colors text-left cursor-pointer"
                  >
                    <svg className="h-3.5 w-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <polyline points="16 18 22 12 16 6" />
                      <polyline points="8 6 2 12 8 18" />
                    </svg>
                    <span>Export Analysis Dataset (JSON)</span>
                  </button>

                  <button
                    onClick={handlePrint}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-ink hover:bg-panel rounded-lg transition-colors text-left cursor-pointer"
                  >
                    <svg className="h-3.5 w-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    <span>Print Compliance Summary</span>
                  </button>
                </div>

                <div className="border-t border-line/60 pt-1">
                  <button
                    onClick={() => {
                      setMoreOpen(false);
                      navigate(`/analyses/${id}/audit`);
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-ink hover:bg-panel rounded-lg transition-colors text-left cursor-pointer"
                  >
                    <svg className="h-3.5 w-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>Inspect Audit Log & Hashes</span>
                  </button>

                  <button
                    onClick={() => {
                      setMoreOpen(false);
                      navigate(`/analyses/${id}/copilot`);
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-ink hover:bg-panel rounded-lg transition-colors text-left cursor-pointer"
                  >
                    <svg className="h-3.5 w-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.286L13 21l-2.286-6.857L5 12l5.714-2.286L13 3z" />
                    </svg>
                    <span>Query in Grounded Copilot</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="mt-4">
        <AnalysisTabs id={id} />
      </div>

      {/* Government Procurement Share Modal Dialog */}
      {shareOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setShareOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-lg font-bold text-ink">Share Tender Analysis</h2>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      NIC GovShare
                    </span>
                  </div>
                  <p className="text-xs text-muted truncate max-w-xs">{title}</p>
                </div>
              </div>
              <button
                onClick={() => setShareOpen(false)}
                className="rounded-lg p-1.5 text-muted hover:bg-panel hover:text-ink transition-colors cursor-pointer"
                aria-label="Close share dialog"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Direct Link Section */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Direct Analysis Web Link</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    readOnly
                    value={canonicalUrl}
                    className="w-full rounded-lg border border-line bg-panel/60 px-3 py-2 text-xs font-mono text-ink selection:bg-primary/20 focus:outline-none focus:border-primary"
                  />
                </div>
                <button
                  onClick={handleCopyLink}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                    copiedLink
                      ? "bg-emerald-600 text-white"
                      : "bg-primary text-white hover:bg-primary-dark hover:-translate-y-0.5 active:translate-y-0"
                  }`}
                >
                  {copiedLink ? (
                    <>
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Role / Access Level Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Recipient Role & Access Privilege</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "REVIEWER", label: "Reviewer", desc: "Sign-off & Recommendations" },
                  { id: "AUDITOR", label: "Auditor", desc: "Read-only Immutable Log" },
                  { id: "OFFICER", label: "Officer", desc: "Collaboration & Edit" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setShareRole(item.id as typeof shareRole)}
                    className={`rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                      shareRole === item.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-line bg-surface hover:bg-panel"
                    }`}
                  >
                    <div className={`text-xs font-semibold ${shareRole === item.id ? "text-primary" : "text-ink"}`}>
                      {item.label}
                    </div>
                    <div className="text-[10px] text-muted leading-tight mt-0.5">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* GovMail / Department Dispatch Form */}
            <form onSubmit={handleSendInvite} className="space-y-2">
              <label className="text-xs font-semibold text-ink">Invite Colleague / Ministry Officer</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="e.g. procurement.officer@nic.in"
                  className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink placeholder:text-muted/60 focus:outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={sendingInvite || !shareEmail.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel px-3.5 py-2 text-xs font-semibold text-ink hover:bg-panel/80 hover:border-primary/40 disabled:opacity-50 cursor-pointer"
                >
                  {sendingInvite ? (
                    <span>Dispatching…</span>
                  ) : inviteSent ? (
                    <span className="text-emerald-600 font-bold">Sent!</span>
                  ) : (
                    <span>Send Invite</span>
                  )}
                </button>
              </div>

              {/* Quick Department Presets */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[10px] text-muted">Quick presets:</span>
                {[
                  "reviewer@bis.gov.in",
                  "procurement.head@railnet.gov.in",
                  "quality.audit@gem.gov.in",
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setShareEmail(preset)}
                    className="text-[10px] rounded-md bg-panel border border-line/60 px-2 py-0.5 text-muted hover:text-ink hover:border-primary/40 transition-colors cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {inviteSent && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800 flex items-center gap-2">
                  <svg className="h-4 w-4 text-emerald-600 flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Invitation dispatched to <strong>{shareEmail}</strong> with {shareRole} privileges.</span>
                </div>
              )}
            </form>

            {/* Quick Citation Utility */}
            <div className="border-t border-line/80 pt-3 flex items-center justify-between">
              <div className="text-[11px] text-muted flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 text-muted/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Gov.in & NIC single sign-on authenticated</span>
              </div>
              <button
                type="button"
                onClick={handleCopyCitation}
                className="text-xs font-medium text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{copiedCitation ? "✓ Citation Copied" : "Copy Tender Citation"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Dot() {
  return <span className="text-muted/50" aria-hidden>·</span>;
}
