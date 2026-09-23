import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Card, EmptyState, LinkButton, Skeleton, StatusChip } from "@/components/ui";
import { useAnalyses, useReadiness, type Analysis } from "@/lib/morpheus";
import { verdictFromReadiness } from "@/lib/verdict";

export function DashboardPage() {
  const { user } = useAuth();
  const { data: analyses, isLoading } = useAnalyses();
  const recent = (analyses ?? []).slice(0, 6);
  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-[28px] border border-line bg-surface shadow-[0_18px_50px_rgba(73,55,27,0.08)]">
        <div className="absolute inset-y-0 right-0 hidden w-2/5 bg-[radial-gradient(circle_at_70%_35%,rgba(233,120,36,.18),transparent_52%),radial-gradient(circle_at_90%_90%,rgba(11,93,59,.14),transparent_48%)] lg:block" />
        <div className="relative grid gap-8 p-7 sm:p-9 lg:grid-cols-[1.2fr_.8fr] lg:p-11">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary-soft px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Standards intelligence platform</div>
            <h1 className="max-w-2xl font-display text-4xl leading-[1.02] tracking-tight sm:text-5xl lg:text-6xl">Smarter procurement.<br /><span className="text-primary">Stronger standards.</span></h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted">Audit procurement specifications against the Indian Standards ecosystem. Extract requirements, trace applicable standards, detect gaps and conflicts, and produce evidence-backed review reports.</p>
            <div className="mt-7 flex flex-wrap gap-3"><LinkButton to="/analyses/new">＋ Check a tender</LinkButton><LinkButton to="/history" variant="secondary">View my tenders →</LinkButton></div>
            <div className="mt-7 flex flex-wrap gap-6 text-xs font-semibold text-muted"><span><b className="text-primary">01</b> Understand</span><span><b className="text-primary">02</b> Relate</span><span><b className="text-saffron">03</b> Validate</span><span><b className="text-primary">04</b> Explain</span></div>
          </div>
          <div className="relative flex items-center justify-center">
            <div className="w-full max-w-sm rounded-3xl border border-line bg-white/90 p-5 shadow-xl backdrop-blur">
              <div className="flex items-center justify-between border-b border-line pb-4"><div><div className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Procurement review</div><div className="mt-1 text-lg font-extrabold">Ready for analysis</div></div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-success-soft text-xl text-success">✓</span></div>
              <div className="mt-5 space-y-3">{["Requirements extracted","Applicable standards mapped","Evidence checked","Gaps & conflicts reviewed"].map((x,i)=><div key={x} className="flex items-center gap-3 rounded-xl bg-panel/70 p-3"><span className="grid h-7 w-7 place-items-center rounded-lg bg-white text-xs font-extrabold text-primary">{i+1}</span><span className="text-sm font-semibold">{x}</span><span className="ml-auto text-success">✓</span></div>)}</div>
              <div className="mt-5 flex items-center justify-between rounded-xl border border-saffron/20 bg-saffron-soft px-3 py-2.5"><span className="text-xs font-bold text-saffron">Evidence-backed findings</span><span className="text-xs text-muted">Officer review</span></div>
            </div>
          </div>
        </div>
      </section>
      <section className="grid gap-3 sm:grid-cols-3"><Metric label="Tenders in workspace" value={analyses?.length ?? "—"} detail="All uploaded analyses" /><Metric label="Completed reviews" value={recent.filter(a => a.status === "READY").length} detail="Ready for officer review" /><Metric label="Workflow" value="4 stages" detail="Extract · Map · Validate · Report" /></section>
      <section><div className="mb-3 flex items-end justify-between"><div><h2 className="font-display text-2xl">Recent analyses</h2><p className="text-xs text-muted">Continue a procurement review or open a completed finding.</p></div><Link to="/history" className="text-xs font-extrabold text-primary hover:underline">View all →</Link></div>
        {isLoading ? <div className="space-y-2"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div> : recent.length === 0 ? <EmptyState>No analyses yet. Start by uploading a tender specification.</EmptyState> : <Card className="overflow-hidden">{recent.map(a => <AnalysisRow key={a.id} analysis={a} />)}</Card>}
      </section>
      <section className="grid gap-4 lg:grid-cols-3"><Feature icon="⌕" title="Understand" text="Turn tender documents into a structured requirement matrix with source references." /><Feature icon="◎" title="Trace" text="Connect requirements to applicable, testing, safety, material and related standards." /><Feature icon="✓" title="Validate" text="Surface specification gaps, conflicts, version findings and evidence for review." /></section>
    </div>
  );
}
function Metric({label,value,detail}:{label:string;value:ReactNode;detail:string}) { return <Card className="p-5"><div className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-muted">{label}</div><div className="mt-2 text-3xl font-extrabold tracking-tight text-primary">{value}</div><div className="mt-1 text-xs text-muted">{detail}</div></Card>; }
function Feature({icon,title,text}:{icon:string;title:string;text:string}) { return <Card className="p-5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-lg text-primary">{icon}</span><h3 className="mt-4 text-sm font-extrabold">{title}</h3><p className="mt-1 text-xs leading-5 text-muted">{text}</p></Card>; }
function AnalysisRow({analysis}:{analysis:Analysis}) { const ready=analysis.status==="READY"; const to=ready?"/analyses/"+analysis.id:"/analyses/"+analysis.id+"/processing"; return <Link to={to} className="group flex items-center gap-4 border-b border-line/70 px-5 py-4 last:border-0 hover:bg-panel/60"><span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-panel text-primary">▤</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-extrabold">{analysis.title}</span><span className="mt-0.5 block text-xs text-muted">{analysis.sector||"Auto-detected"} · {new Date(analysis.created_at).toLocaleDateString()}</span></span>{ready?<VerdictChip id={analysis.id}/>:<StatusChip tone="info">Processing</StatusChip>}<span className="text-muted transition-transform group-hover:translate-x-1">→</span></Link>; }
function VerdictChip({id}:{id:string}) { const {data,isLoading}=useReadiness(id); if(isLoading)return <StatusChip>…</StatusChip>; const v=verdictFromReadiness(data); const label=v.kind==="READY"?"Ready":v.kind==="ATTENTION"?"Review":"Action needed"; return <StatusChip tone={v.tone}>{label}</StatusChip>; }