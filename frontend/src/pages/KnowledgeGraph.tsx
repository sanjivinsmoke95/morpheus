import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactFlow, { Background, Controls, type Edge, type Node } from "reactflow";
import "reactflow/dist/style.css";
import { useEdgeDetail, useGraph, useVersionFindings } from "@/lib/morpheus";

const DISC_COLOR: Record<string, string> = {
  OK: "text-emerald-400", OUTDATED: "text-amber-400", SUPERSEDED: "text-red-400", UNKNOWN: "text-zinc-400",
};

export function KnowledgeGraphPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data: graph, isLoading } = useGraph(id);
  const { data: versions } = useVersionFindings(id);
  const edgeDetail = useEdgeDetail();
  const [panel, setPanel] = useState<any>(null);

  const { nodes, edges } = useMemo(() => {
    if (!graph) return { nodes: [] as Node[], edges: [] as Edge[] };
    const recs = graph.nodes.filter((n) => n.recommended);
    const others = graph.nodes.filter((n) => !n.recommended);
    const pos = new Map<string, { x: number; y: number }>();
    recs.forEach((n, i) => pos.set(n.id, { x: 120, y: 60 + i * 90 }));
    others.forEach((n, i) => pos.set(n.id, { x: 460, y: 40 + i * 70 }));
    const nodes: Node[] = graph.nodes.map((n) => ({
      id: n.id,
      position: pos.get(n.id) ?? { x: 0, y: 0 },
      data: { label: `${n.is_number}` },
      style: {
        background: n.recommended ? "#065f46" : "#1f2937",
        color: "#e5e7eb", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8,
        fontSize: 11, width: 150, padding: 4,
      },
    }));
    const edges: Edge[] = graph.edges.map((e) => ({
      id: e.id, source: e.from, target: e.to, label: e.relationship_type.replace(/_/g, " ").toLowerCase(),
      labelStyle: { fill: "#a1a1aa", fontSize: 9 }, style: { stroke: "#4b5563" }, animated: false,
    }));
    return { nodes, edges };
  }, [graph]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-xl font-semibold">Knowledge graph</h1>
      <p className="mt-0.5 text-sm text-zinc-400">
        Recommended standards (green) and their typed relationships. Click a node for details, an edge for evidence.
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="h-[460px] rounded-xl border border-white/10 bg-black/20">
          {isLoading ? (
            <div className="grid h-full place-items-center text-sm text-zinc-500">Loading graph…</div>
          ) : !graph?.nodes.length ? (
            <div className="grid h-full place-items-center text-sm text-zinc-500">No graph for this analysis.</div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              fitView
              onNodeClick={(_, n) => navigate(`/standards/${n.id}`)}
              onEdgeClick={(_, e) => edgeDetail.mutate(e.id, { onSuccess: (d) => setPanel(d) })}
              proOptions={{ hideAttribution: true }}
            >
              <Background color="#374151" gap={16} />
              <Controls showInteractive={false} />
            </ReactFlow>
          )}
        </div>

        <div className="space-y-4">
          {panel && (
            <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium">Relationship</span>
                <button onClick={() => setPanel(null)} className="text-xs text-zinc-500">✕</button>
              </div>
              <div className="text-[11px] uppercase text-emerald-300">{panel.relationship_type?.replace(/_/g, " ")}</div>
              <div className="mt-1 text-zinc-300">
                {panel.from?.is_number} → {panel.to?.is_number}
              </div>
              <div className="mt-1 text-xs text-zinc-500">{panel.note}</div>
              {panel.evidence && (
                <div className="mt-2 rounded border border-white/10 px-2 py-1 text-[11px] text-zinc-400">
                  <span className="mr-1 rounded bg-white/5 px-1 py-0.5 text-[9px] uppercase">evidence</span>
                  {panel.evidence.text}
                </div>
              )}
              <div className="mt-1 text-[10px] text-zinc-600">
                source {panel.source_name} · {panel.data_origin}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="mb-2 text-sm font-medium">Version intelligence</div>
            {!versions?.length ? (
              <p className="text-xs text-zinc-500">No referenced standards to check.</p>
            ) : (
              <div className="space-y-2">
                {versions.map((v, i) => (
                  <div key={i} className="rounded border border-white/10 px-2 py-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono">{v.is_number ?? v.referenced_text}</span>
                      <span className={DISC_COLOR[v.discrepancy_type]}>{v.discrepancy_type}</span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-zinc-500">{v.note}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
