import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";

/* ── Card ──────────────────────────────────────────────────────────────── */
export function Card({
  children,
  className = "",
  as: As = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
}) {
  return (
    <As className={`rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${className}`}>
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
  primary: "bg-primary text-white hover:bg-primary-dark",
  secondary: "border border-line bg-surface text-ink hover:bg-panel",
  ghost: "text-primary hover:bg-primary-soft",
  danger: "border border-danger/30 bg-danger-soft text-danger hover:bg-danger/10",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${BTN[variant]} ${className}`}
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
  const icon = tone === "danger" ? "⛔" : tone === "warning" ? "⚠" : "•";
  return (
    <div className="flex items-start gap-3 border-b border-line px-4 py-3 last:border-b-0">
      <span className={`mt-0.5 flex-none text-sm ${BANNER[tone].text}`} aria-hidden>
        {icon}
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
