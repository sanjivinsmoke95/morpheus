import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

type Tab={to:string;label:string};
const primary=(id:string):Tab[]=>[
 {to:`/analyses/${id}`,label:"Overview"},
 {to:`/analyses/${id}/requirements`,label:"Requirements"},
 {to:`/analyses/${id}/standards`,label:"Standards review"},
 {to:`/analyses/${id}/audit`,label:"Issues & gaps"},
 {to:`/analyses/${id}/reports`,label:"Final report"},
];
const advanced=(id:string):Tab[]=>[
 {to:`/analyses/${id}/recommendations`,label:"Match signals"},
 {to:`/analyses/${id}/regulatory`,label:"Certification & QCO"},
 {to:`/analyses/${id}/graph`,label:"Knowledge graph"},
 {to:`/analyses/${id}/copilot`,label:"Copilot & history"},
 {to:`/analyses/${id}/review`,label:"Decision log"},
];
export function AnalysisTabs({id}:{id:string}){
 const location=useLocation(); const adv=advanced(id); const active=adv.some(t=>location.pathname===t.to); const [open,setOpen]=useState(active);
 return <div className="mb-7">
   <div className="flex overflow-x-auto rounded-2xl border border-line bg-white p-1.5 shadow-sm">
    {primary(id).map(t=><NavLink key={t.to} to={t.to} end className={({isActive})=>`whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${isActive?"bg-primary text-white shadow-sm":"text-muted hover:bg-panel hover:text-ink"}`}>{t.label}</NavLink>)}
    <button onClick={()=>setOpen(v=>!v)} className={`ml-auto whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-extrabold ${active?"bg-saffron-soft text-saffron":"text-muted hover:bg-panel"}`}>Advanced {open?"⌃":"⌄"}</button>
   </div>
   {open&&<div className="mt-2 flex flex-wrap gap-2 rounded-2xl border border-line bg-panel p-2"><span className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest text-muted">Analyst tools</span>{adv.map(t=><NavLink key={t.to} to={t.to} end className={({isActive})=>`rounded-lg px-2.5 py-1 text-xs font-semibold ${isActive?"bg-white text-primary shadow-sm":"text-muted hover:text-ink"}`}>{t.label}</NavLink>)}</div>}
 </div>;
}
