import { useEffect, useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";

/* ── Card ──────────────────────────────────────────────────────────────── */
export function Card({
  children,
  className = "",
  as: As = "div",
  hover = true,
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
  hover?: boolean;
}) {
  return (
    <As
      className={`rounded-2xl border border-line bg-surface shadow-[0_1px_3px_rgba(16,24,40,0.06),0_1px_2px_rgba(16,24,40,0.03)] transition-all duration-200 ease-out ${
        hover
          ? "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_12px_28px_-6px_rgba(11,93,59,0.12),0_4px_8px_-2px_rgba(0,0,0,0.04)]"
          : ""
      } ${className}`}
    >
      {children}
    </As>
  );
}

/* ── PageHeader ────────────────────────────────────────────────────────── */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ── Button ────────────────────────────────────────────────────────────── */
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
const BTN: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary-dark shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-xs",
  secondary: "border border-line bg-surface text-ink hover:bg-panel hover:border-primary/40 hover:-translate-y-0.5 active:translate-y-0",
  ghost: "text-primary hover:bg-primary-soft hover:-translate-y-0.5 active:translate-y-0",
  danger: "border border-danger/30 bg-danger-soft text-danger hover:bg-danger/10 hover:-translate-y-0.5 active:translate-y-0",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none disabled:shadow-none ${BTN[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  to,
  variant = "primary",
  className = "",
  children,
}: {
  to: string;
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${BTN[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}

/* ── Status semantics ──────────────────────────────────────────────────── */
export type Tone = "success" | "warning" | "danger" | "info" | "neutral";

const TONE_CHIP: Record<Tone, string> = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-primary-soft text-primary",
  neutral: "bg-panel text-muted",
};

export function StatusChip({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE_CHIP[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/* ── StatusBanner — the verdict hero ───────────────────────────────────── */
const BANNER: Record<Tone, { bar: string; bg: string; text: string }> = {
  success: { bar: "bg-success", bg: "bg-success-soft", text: "text-success" },
  warning: { bar: "bg-warning", bg: "bg-warning-soft", text: "text-warning" },
  danger: { bar: "bg-danger", bg: "bg-danger-soft", text: "text-danger" },
  info: { bar: "bg-primary", bg: "bg-primary-soft", text: "text-primary" },
  neutral: { bar: "bg-muted", bg: "bg-panel", text: "text-muted" },
};

export function StatusBanner({
  tone,
  title,
  detail,
  right,
}: {
  tone: Tone;
  title: ReactNode;
  detail?: ReactNode;
  right?: ReactNode;
}) {
  const c = BANNER[tone];
  return (
    <div className={`flex items-stretch overflow-hidden rounded-xl border border-line ${c.bg}`}>
      <div className={`w-1.5 flex-none ${c.bar}`} aria-hidden />
      <div className="flex flex-1 flex-wrap items-center justify-between gap-4 p-5">
        <div className="min-w-0">
          <div className={`text-xl font-bold tracking-tight ${c.text}`}>{title}</div>
          {detail && <div className="mt-0.5 text-sm text-muted">{detail}</div>}
        </div>
        {right && <div className="flex flex-none items-center gap-2">{right}</div>}
      </div>
    </div>
  );
}

/* ── Meter — compliance progress ───────────────────────────────────────── */
export function Meter({
  value,
  total,
  label,
  tone = "info",
}: {
  value: number;
  total: number;
  label?: string;
  tone?: Tone;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const bar = BANNER[tone].bar;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm text-muted">{label ?? "Coverage"}</span>
        <span className="text-sm font-semibold tabular-nums text-ink">
          {value} / {total} · {pct}%
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-panel">
        <div className={`h-full rounded-full ${bar} transition-[width]`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ── Stat tile ─────────────────────────────────────────────────────────── */
export function Stat({
  value,
  label,
  tone = "neutral",
}: {
  value: ReactNode;
  label: string;
  tone?: Tone;
}) {
  const text =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "danger"
          ? "text-danger"
          : tone === "info"
            ? "text-primary"
            : "text-ink";
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className={`text-2xl font-semibold tabular-nums ${text}`}>{value}</div>
      <div className="mt-0.5 text-xs text-muted">{label}</div>
    </div>
  );
}

/* ── GovIcon — Unified Crisp Vector Icon System ───────────────────────── */
export type GovIconName =
  | "doc"
  | "book"
  | "standard"
  | "requirement"
  | "gap"
  | "warning"
  | "conflict"
  | "danger"
  | "outdated"
  | "clock"
  | "check"
  | "verified"
  | "bulb"
  | "ai"
  | "shield"
  | "sparkle"
  | "clipboard"
  | "print"
  | "note"
  | "package"
  | "close"
  | "info";

export function GovIcon({
  name,
  className = "h-4 w-4",
}: {
  name: GovIconName | string;
  className?: string;
}) {
  switch (name) {
    case "doc":
    case "requirement":
    case "📄":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
      );
    case "book":
    case "standard":
    case "📗":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          <line x1="8" y1="6" x2="16" y2="6" strokeWidth="1.5" />
          <line x1="8" y1="10" x2="14" y2="10" strokeWidth="1.5" />
        </svg>
      );
    case "gap":
    case "warning":
    case "⚠":
    case "⚠️":
    case "△":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <circle cx="12" cy="17" r="1" fill="currentColor" />
        </svg>
      );
    case "conflict":
    case "danger":
    case "⛔":
    case "!":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <circle cx="12" cy="16" r="1" fill="currentColor" />
        </svg>
      );
    case "outdated":
    case "clock":
    case "◷":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case "check":
    case "verified":
    case "✓":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    case "bulb":
    case "ai":
    case "💡":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M9 18h6" />
          <path d="M10 22h4" />
          <path d="M12 2a7 7 0 0 0-7 7c0 2.5 1.3 4.7 3.3 6h7.4c2-1.3 3.3-3.5 3.3-6a7 7 0 0 0-7-7z" />
        </svg>
      );
    case "clipboard":
    case "📋":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          <path d="M9 12h6" />
          <path d="M9 16h6" />
        </svg>
      );
    case "print":
    case "printer":
    case "🖨":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <polyline points="6 9 6 2 18 2 18 9" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <rect x="6" y="14" width="12" height="8" />
        </svg>
      );
    case "note":
    case "edit":
    case "📝":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      );
    case "package":
    case "box":
    case "📦":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      );
    case "close":
    case "✕":
    case "x":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      );
    case "info":
    case "ⓘ":
    case "◎":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      );
    case "shield":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
  }
}

/* ── ActionItem — one row in the Action Required list ──────────────────── */
export function ActionItem({
  tone,
  title,
  detail,
}: {
  tone: Tone;
  title: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-line px-4 py-3 last:border-b-0">
      <span className={`mt-0.5 flex-none ${BANNER[tone].text}`} aria-hidden>
        {tone === "danger" ? (
          <GovIcon name="conflict" className="h-4 w-4" />
        ) : tone === "warning" ? (
          <GovIcon name="warning" className="h-4 w-4" />
        ) : (
          <GovIcon name="check" className="h-4 w-4" />
        )}
      </span>
      <div className="min-w-0">
        <div className="text-sm font-medium text-ink">{title}</div>
        {detail && <div className="mt-0.5 text-sm text-muted">{detail}</div>}
      </div>
    </div>
  );
}

/* ── EmptyState ────────────────────────────────────────────────────────── */
export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-10 text-center text-sm text-muted">
      {children}
    </div>
  );
}

/* ── Skeleton ──────────────────────────────────────────────────────────── */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-panel ${className}`} />;
}

/* ── StatTile — KPI card with optional trend ───────────────────────────── */
export function StatTile({
  value,
  label,
  hint,
  trend,
  tone = "neutral",
}: {
  value: ReactNode;
  label: string;
  hint?: string;
  trend?: { dir: "up" | "down" | "flat"; text: string };
  tone?: Tone;
}) {
  const accent =
    tone === "success" ? "text-success" : tone === "warning" ? "text-warning"
      : tone === "danger" ? "text-danger" : tone === "info" ? "text-primary" : "text-ink";
  const glow =
    tone === "success" ? "rgba(22,163,74,0.26)" : tone === "warning" ? "rgba(245,158,11,0.28)"
      : tone === "danger" ? "rgba(220,38,38,0.26)" : "rgba(11,93,59,0.24)";
  const accentBar =
    tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning"
      : tone === "danger" ? "bg-danger" : "bg-primary";
  const tArrow = trend?.dir === "up" ? "↑" : trend?.dir === "down" ? "↓" : "→";
  const tColor = trend?.dir === "up" ? "text-success" : trend?.dir === "down" ? "text-danger" : "text-muted";
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-line bg-surface p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_-12px_var(--glow),0_0_0_1.5px_var(--glow)]"
      style={{ "--glow": glow } as CSSProperties}
    >
      <div className={`absolute left-0 top-0 h-1 w-0 ${accentBar} transition-all duration-300 group-hover:w-full`} />
      <div className="relative">
        <div className="flex items-baseline justify-between gap-2">
          <div className={`text-3xl font-semibold tabular-nums ${accent}`}>{value}</div>
          {trend && <span className={`text-xs font-medium ${tColor}`}>{tArrow} {trend.text}</span>}
        </div>
        <div className="mt-1 flex items-center gap-1 text-xs font-medium text-muted">
          {label}
          {hint && <Tooltip text={hint} />}
        </div>
      </div>
    </div>
  );
}

/* ── Tooltip — plain-English help on hover (accessibility: focusable) ──── */
export function Tooltip({ text, label = "?" }: { text: string; label?: string }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={text}
        className="grid h-4 w-4 place-items-center rounded-full border border-line bg-panel text-[10px] font-bold text-muted hover:border-primary hover:text-primary focus-visible:border-primary"
      >
        {label}
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 w-52 -translate-x-1/2 rounded-lg bg-ink px-2.5 py-1.5 text-[11px] font-normal leading-snug text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

/* ── SeverityPill ──────────────────────────────────────────────────────── */
export type Severity = "critical" | "high" | "medium" | "low";
const SEV: Record<Severity, { cls: string; label: string }> = {
  critical: { cls: "bg-danger-soft text-danger ring-1 ring-danger/30", label: "Critical" },
  high: { cls: "bg-warning-soft text-warning ring-1 ring-warning/30", label: "High" },
  medium: { cls: "bg-primary-soft text-primary ring-1 ring-primary/20", label: "Medium" },
  low: { cls: "bg-panel text-muted", label: "Low" },
};
export function SeverityPill({ level, children }: { level: Severity; children?: ReactNode }) {
  const s = SEV[level];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.cls}`}>
      {children ?? s.label}
    </span>
  );
}

/* ── MatchBar — labelled relevance bar with score badge ────────────────── */
export function MatchBar({ score, label }: { score: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(score * 100)));
  const tone = pct >= 70 ? "bg-success" : pct >= 45 ? "bg-warning" : "bg-muted";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-panel">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-14 text-right text-xs font-semibold tabular-nums text-ink">
        {pct}%{label ? "" : ""}
      </span>
      {label && <span className="text-[11px] text-muted">{label}</span>}
    </div>
  );
}

/* ── FilterChip — toggleable pill ──────────────────────────────────────── */
export function FilterChip({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-primary text-white"
          : "border border-line bg-surface text-muted hover:border-primary hover:text-primary"
      }`}
    >
      {children}
      {count != null && (
        <span className={`rounded-full px-1.5 text-[10px] tabular-nums ${active ? "bg-white/20" : "bg-panel"}`}>
          {count}
        </span>
      )}
    </button>
  );
}

/* ── SectionAccordion — collapsible (appendix, advanced detail) ────────── */
export function SectionAccordion({
  title,
  defaultOpen = false,
  children,
  right,
}: {
  title: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  right?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-panel"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
          <span className={`text-muted transition-transform ${open ? "rotate-90" : ""}`}>›</span>
          {title}
        </span>
        {right}
      </button>
      {open && <div className="border-t border-line">{children}</div>}
    </div>
  );
}

/* ── DetailDrawer — right-side slide-over ──────────────────────────────── */
export function DetailDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink/30" onClick={onClose} aria-hidden />
      <div className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-surface shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <div className="truncate text-base font-semibold text-ink">{title}</div>
            {subtitle && <div className="mt-0.5 text-xs text-muted">{subtitle}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 flex-none place-items-center rounded-lg text-muted hover:bg-panel hover:text-ink"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

/* ── Donut — CSS/SVG ring chart with a center label ────────────────────── */
export function Donut({
  segments,
  centerValue,
  centerLabel,
  size = 150,
}: {
  segments: { label: string; value: number; color: string }[];
  centerValue: ReactNode;
  centerLabel?: string;
  size?: number;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = 42;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img">
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-panel)" strokeWidth="14" />
      {segments.map((s, i) => {
        const frac = s.value / total;
        const dash = frac * circ;
        const el = (
          <circle key={i} cx="50" cy="50" r={r} fill="none" stroke={s.color} strokeWidth="14"
            strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-offset}
            transform="rotate(-90 50 50)" />
        );
        offset += dash;
        return el;
      })}
      <text x="50" y="47" textAnchor="middle" className="fill-ink" style={{ fontSize: 15, fontWeight: 700 }}>
        {centerValue}
      </text>
      {centerLabel && (
        <text x="50" y="60" textAnchor="middle" className="fill-muted" style={{ fontSize: 7 }}>{centerLabel}</text>
      )}
    </svg>
  );
}

/* ── Tabs — in-panel tab switcher ──────────────────────────────────────── */
export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex gap-1 border-b border-line">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            active === t.key
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
