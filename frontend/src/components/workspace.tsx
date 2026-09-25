import type { ReactNode } from "react";
import type { Recommendation } from "@/lib/morpheus";

/* ── SectionHeader — small uppercase eyebrow + confident title ──────────────
   Level-3 heading treatment used across the redesigned workspaces. */
export function SectionHeader({
  eyebrow,
  title,
  right,
  className = "",
}: {
  eyebrow?: string;
  title: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-3 flex flex-wrap items-end justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        {eyebrow && (
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{eyebrow}</div>
        )}
        <h2 className="font-display text-lg font-semibold tracking-tight text-ink">{title}</h2>
      </div>
      {right}
    </div>
  );
}

/* ── Evidence strength — one consistent vocabulary for evidence quality ─────
   The wording follows MORPHEUS's grounding principle: it never claims more than
   the retrieved evidence supports. */
export type Strength = "SUPPORTED" | "REVIEW" | "INSUFFICIENT";

const STRENGTH_META: Record<Strength, { label: string; dot: string; cls: string; hint: string }> = {
  SUPPORTED: {
    label: "Evidence-backed",
    dot: "bg-success",
    cls: "bg-success-soft text-success ring-1 ring-success/25",
    hint: "Direct source evidence supports this match.",
  },
  REVIEW: {
    label: "Review required",
    dot: "bg-warning",
    cls: "bg-warning-soft text-warning ring-1 ring-warning/25",
    hint: "Evidence is indirect or incomplete — a reviewer should confirm.",
  },
  INSUFFICIENT: {
    label: "Insufficient evidence",
    dot: "bg-muted",
    cls: "bg-panel text-muted ring-1 ring-line",
    hint: "No supporting source text was retrieved for this conclusion.",
  },
};

/** Derive evidence strength from real recommendation data — never a fabricated
 *  confidence value. SUPPORTED needs actual evidence text plus a strong signal;
 *  REVIEW is a partial/indirect match; INSUFFICIENT means nothing was retrieved. */
export function strengthOf(rec: Pick<Recommendation, "evidence" | "relevance" | "why">): Strength {
  const hasEvidence = (rec.evidence?.length ?? 0) > 0;
  const strongWhy = (rec.why?.length ?? 0) >= 2;
  if (!hasEvidence) return "INSUFFICIENT";
  if (rec.relevance === "HIGH" || strongWhy) return "SUPPORTED";
  return "REVIEW";
}

export function EvidenceStrength({ level, showLabel = true }: { level: Strength; showLabel?: boolean }) {
  const m = STRENGTH_META[level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${m.cls}`}
      title={m.hint}
    >
      <span className={`h-2 w-2 rounded-full ${m.dot}`} aria-hidden />
      {showLabel && m.label}
    </span>
  );
}

/* ── ConfidenceIndicator — HIGH / MEDIUM / LOW, dot + label ─────────────────*/
export function ConfidenceIndicator({ level }: { level: string }) {
  const l = (level || "").toUpperCase();
  const dot = l === "HIGH" ? "bg-success" : l === "MEDIUM" ? "bg-warning" : "bg-muted";
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted">
      <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden />
      {l ? `${l.charAt(0)}${l.slice(1).toLowerCase()} confidence` : "—"}
    </span>
  );
}

/* ── WorkflowStepper — DRAFT → UNDER_REVIEW → FINALIZED → ISSUED ────────────
   Reflects the real Analysis.workflow_status. When onSelect is provided the
   reachable steps become buttons (reviewer moving the tender through its
   lifecycle); otherwise it renders as a read-only progress indicator. */
export const WORKFLOW_STEPS = ["DRAFT", "UNDER_REVIEW", "FINALIZED", "ISSUED"] as const;
export type WorkflowStatus = (typeof WORKFLOW_STEPS)[number];
const WF_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  UNDER_REVIEW: "Under review",
  FINALIZED: "Finalized",
  ISSUED: "Tender issued",
};

export function WorkflowStepper({
  status,
  onSelect,
  pending = false,
}: {
  status: string;
  onSelect?: (status: WorkflowStatus) => void;
  pending?: boolean;
}) {
  const currentIdx = Math.max(0, WORKFLOW_STEPS.indexOf((status as WorkflowStatus) ?? "DRAFT"));
  return (
    <ol className="flex flex-wrap items-center gap-1" aria-label="Review workflow status">
      {WORKFLOW_STEPS.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        const isNext = onSelect && i === currentIdx + 1;
        const clickable = onSelect && (isNext || done);
        const Tag = clickable ? "button" : "div";
        return (
          <li key={step} className="flex items-center gap-1">
            <Tag
              {...(clickable
                ? { type: "button" as const, onClick: () => onSelect!(step), disabled: pending }
                : {})}
              aria-current={active ? "step" : undefined}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? "bg-primary text-white"
                  : done
                    ? "bg-primary-soft text-primary"
                    : "bg-panel text-muted"
              } ${clickable ? "cursor-pointer hover:brightness-105 disabled:opacity-60" : ""}`}
            >
              <span
                className={`grid h-4 w-4 place-items-center rounded-full text-[10px] ${
                  done ? "bg-primary text-white" : active ? "bg-white/25 text-white" : "bg-line text-muted"
                }`}
                aria-hidden
              >
                {done ? "✓" : i + 1}
              </span>
              {WF_LABEL[step]}
            </Tag>
            {i < WORKFLOW_STEPS.length - 1 && (
              <span className={`h-px w-4 ${i < currentIdx ? "bg-primary/40" : "bg-line"}`} aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}
