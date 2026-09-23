import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactFlow, { Background, Controls, type Edge, type Node } from "reactflow";
import "reactflow/dist/style.css";
import { AnalysisTabs } from "@/components/AnalysisTabs";
import { Card, PageHeader, StatusChip, type Tone } from "@/components/ui";
import { useEdgeDetail, useGraph, useVersionFindings } from "@/lib/morpheus";

const DISC_TONE: Record<string, Tone> = {
  OK: "success", OUTDATED: "warning", SUPERSEDED: "danger", UNKNOWN: "neutral",
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
        background: n.recommended ? "#0b4f9e" : "#ffffff",
        color: n.recommended ? "#ffffff" : "#1a2231",
        border: "1px solid #d8dee9", borderRadius: 8,
        fontSize: 11, fontWeight: 600, width: 150, padding: 4,
      },
    }));
    const edges: Edge[] = graph.edges.map((e) => ({
      id: e.id, source: e.from, target: e.to, label: e.relationship_type.replace(/_/g, " ").toLowerCase(),
      labelStyle: { fill: "#5b6473", fontSize: 9 }, style: { stroke: "#9aa3b8" }, animated: false,
    }));
    return { nodes, edges };
  }, [graph]);

  return (
    <div>
      <PageHeader
        title="Knowledge graph"
        subtitle="Recommended standards (blue) and their typed relationships. Click a node for details, an edge for evidence."
      />
      <AnalysisTabs id={id} />

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Card className="h-[460px] overflow-hidden">
          {isLoading ? (
            <div className="grid h-full place-items-center text-sm text-muted">Loading graph…</div>
          ) : !graph?.nodes.length ? (
            <div className="grid h-full place-items-center text-sm text-muted">No graph for this analysis.</div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              fitView
              onNodeClick={(_, n) => navigate(`/standards/${n.id}`)}
              onEdgeClick={(_, e) => edgeDetail.mutate(e.id, { onSuccess: (d) => setPanel(d) })}
              proOptions={{ hideAttribution: true }}
            >
              <Background color="#d8dee9" gap={16} />
              <Controls showInteractive={false} />
            </ReactFlow>
          )}
        </Card>

        <div className="space-y-4">
          {panel && (
            <Card className="p-3 text-sm">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium text-ink">Relationship</span>
                <button onClick={() => setPanel(null)} className="text-xs text-muted">✕</button>
              </div>
              <StatusChip tone="info">{panel.relationship_type?.replace(/_/g, " ")}</StatusChip>
              <div className="mt-1 text-ink">
                {panel.from?.is_number} → {panel.to?.is_number}
              </div>
              <div className="mt-1 text-xs text-muted">{panel.note}</div>
              {panel.evidence && (
                <div className="mt-2 rounded border border-line px-2 py-1 text-[11px] text-muted">
                  <span className="mr-1 rounded bg-panel px-1 py-0.5 text-[9px] uppercase">evidence</span>
                  {panel.evidence.text}
                </div>
              )}
              <div className="mt-1 text-[10px] text-muted">
                source {panel.source_name} · {panel.data_origin}
              </div>
            </Card>
          )}

          <Card className="p-3">
            <div className="mb-2 text-sm font-medium text-ink">Version intelligence</div>
            {!versions?.length ? (
              <p className="text-xs text-muted">No referenced standards to check.</p>
            ) : (
              <div className="space-y-2">
                {versions.map((v, i) => (
                  <div key={i} className="rounded border border-line px-2 py-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-ink">{v.is_number ?? v.referenced_text}</span>
                      <StatusChip tone={DISC_TONE[v.discrepancy_type] ?? "neutral"}>{v.discrepancy_type}</StatusChip>
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted">{v.note}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
