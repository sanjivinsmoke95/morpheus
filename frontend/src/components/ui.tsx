import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";

export function Card({ children, className = "", as: As = "div" }: { children: ReactNode; className?: string; as?: "div"|"section"|"article" }) {
  return <As className={`rounded-2xl border border-line/80 bg-surface shadow-[0_8px_30px_rgba(73,55,27,0.05)] ${className}`}>{children}</As>;
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
    <div className="min-w-0">
      <h1 className="font-display text-3xl tracking-tight text-ink sm:text-4xl">{title}</h1>
      {subtitle && <p className="mt-1.5 max-w-2xl text-sm text-muted">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>;
}

type ButtonVariant = "primary"|"secondary"|"ghost"|"danger";
const BTN: Record<ButtonVariant,string> = {
  primary:"bg-primary text-white shadow-sm hover:bg-primary-dark hover:-translate-y-px",
  secondary:"border border-line bg-white text-ink hover:bg-panel",
  ghost:"text-primary hover:bg-primary-soft",
  danger:"border border-danger/25 bg-danger-soft text-danger hover:bg-danger/10"
};
export function Button({ variant="primary", className="", children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & {variant?:ButtonVariant}) {
  return <button className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${BTN[variant]} ${className}`} {...rest}>{children}</button>;
}
export function LinkButton({to,variant="primary",className="",children}:{to:string;variant?:ButtonVariant;className?:string;children:ReactNode}) {
  return <Link to={to} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${BTN[variant]} ${className}`}>{children}</Link>;
}

export type Tone="success"|"warning"|"danger"|"info"|"neutral";
const TONE:Record<Tone,string>={success:"bg-success-soft text-success",warning:"bg-warning-soft text-warning",danger:"bg-danger-soft text-danger",info:"bg-primary-soft text-primary",neutral:"bg-panel text-muted"};
export function StatusChip({tone="neutral",children,className=""}:{tone?:Tone;children:ReactNode;className?:string}) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-wide ${TONE[tone]} ${className}`}><span className="h-1.5 w-1.5 rounded-full bg-current opacity-70"/>{children}</span>;
}
const BANNER:Record<Tone,{bar:string;bg:string;text:string}>={
  success:{bar:"bg-success",bg:"bg-success-soft",text:"text-success"},
  warning:{bar:"bg-warning",bg:"bg-warning-soft",text:"text-warning"},
  danger:{bar:"bg-danger",bg:"bg-danger-soft",text:"text-danger"},
  info:{bar:"bg-primary",bg:"bg-primary-soft",text:"text-primary"},
  neutral:{bar:"bg-muted",bg:"bg-panel",text:"text-muted"}
};
export function StatusBanner({tone,title,detail,right}:{tone:Tone;title:ReactNode;detail?:ReactNode;right?:ReactNode}) {
  const c=BANNER[tone];
  return <div className={`flex overflow-hidden rounded-2xl border border-line/80 ${c.bg}`}><div className={`w-1.5 ${c.bar}`}/><div className="flex flex-1 flex-wrap items-center justify-between gap-4 p-5 sm:p-6"><div><div className={`text-xl font-extrabold ${c.text}`}>{title}</div>{detail&&<div className="mt-1 text-sm text-muted">{detail}</div>}</div>{right}</div></div>;
}
export function Meter({value,total,label,tone="info"}:{value:number;total:number;label?:string;tone?:Tone}) {
  const pct=total>0?Math.round(value/total*100):0;
  return <div><div className="mb-2 flex justify-between text-sm"><span className="font-semibold text-muted">{label??"Coverage"}</span><span className="font-extrabold">{pct}%</span></div><div className="h-2.5 overflow-hidden rounded-full bg-panel"><div className={`h-full rounded-full transition-[width] ${BANNER[tone].bar}`} style={{width:`${pct}%`}}/></div><div className="mt-1 text-[11px] text-muted">{value} of {total} requirements</div></div>;
}
export function Stat({value,label,tone="neutral"}:{value:ReactNode;label:string;tone?:Tone}) {
  const text=tone==="success"?"text-success":tone==="warning"?"text-warning":tone==="danger"?"text-danger":tone==="info"?"text-primary":"text-ink";
  return <div className="rounded-2xl border border-line/80 bg-white p-4"><div className={`text-2xl font-extrabold tabular-nums ${text}`}>{value}</div><div className="mt-1 text-xs font-semibold text-muted">{label}</div></div>;
}
export function ActionItem({tone,title,detail}:{tone:Tone;title:ReactNode;detail?:ReactNode}) {
  const icon=tone==="danger"?"!":tone==="warning"?"△":"✓";
  return <div className="flex items-start gap-3 border-b border-line/70 px-4 py-4 last:border-b-0"><span className={`mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-full text-xs font-extrabold ${TONE[tone]}`}>{icon}</span><div><div className="text-sm font-bold">{title}</div>{detail&&<div className="mt-0.5 text-xs text-muted">{detail}</div>}</div></div>;
}
export function EmptyState({children}:{children:ReactNode}) { return <div className="rounded-2xl border border-dashed border-line bg-white px-6 py-12 text-center text-sm text-muted">{children}</div>; }
export function Skeleton({className=""}:{className?:string}) { return <div className={`animate-pulse rounded-xl bg-panel ${className}`}/>; }
