import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactFlow, { Background, Controls, type Edge, type Node } from "reactflow";
import "reactflow/dist/style.css";
import { AnalysisHeader } from "@/components/AnalysisHeader";
import { Card, StatusChip, type Tone } from "@/components/ui";
import { SectionHeader } from "@/components/workspace";
import { useGraph, useVersionFindings, type GraphNode } from "@/lib/morpheus";

const DISC_TONE: Record<string, Tone> = {
  OK: "success", OUTDATED: "warning", SUPERSEDED: "danger", UNKNOWN: "neutral",
};
const STATUS_TONE: Record<string, Tone> = {
  ACTIVE: "success", OUTDATED: "warning", SUPERSEDED: "danger",
};

// Node fill by role/status — recommended standards lead; version state tints the rest.
function nodeColors(n: GraphNode): { bg: string; color: string; border: string } {
  if (n.recommended) return { bg: "#0b5d3b", color: "#ffffff", border: "#0b5d3b" };
  if (n.status === "SUPERSEDED") return { bg: "#fbeaea", color: "#8a1f1f", border: "#e7b7b7" };
  if (n.status === "OUTDATED") return { bg: "#fdf3e0", color: "#8a5a12", border: "#e9d3a6" };
  return { bg: "#fffdfc", color: "#1a1a17", border: "#eae4d8" };
}

export function KnowledgeGraphPage() {
  const { id = "" } = useParams();
  const { data: graph, isLoading } = useGraph(id);
  const { data: versions } = useVersionFindings(id);
  const [selected, setSelected] = useState<string | null>(null);

  const nodeById = useMemo(() => new Map((graph?.nodes ?? []).map((n) => [n.id, n])), [graph]);

  // Neighbour set of the selected node (either endpoint of a shared edge).
  const neighbours = useMemo(() => {
    if (!selected || !graph) return null;
    const set = new Set<string>([selected]);
    for (const e of graph.edges) {
      if (e.from === selected) set.add(e.to);
      if (e.to === selected) set.add(e.from);
    }
    return set;
  }, [selected, graph]);

  const { nodes, edges } = useMemo(() => {
    if (!graph) return { nodes: [] as Node[], edges: [] as Edge[] };
    const recs = graph.nodes.filter((n) => n.recommended);
    const others = graph.nodes.filter((n) => !n.recommended);
    const pos = new Map<string, { x: number; y: number }>();
    recs.forEach((n, i) => pos.set(n.id, { x: 120, y: 60 + i * 90 }));
    others.forEach((n, i) => pos.set(n.id, { x: 480, y: 40 + i * 70 }));

    const nodes: Node[] = graph.nodes.map((n) => {
      const c = nodeColors(n);
      const dim = neighbours ? !neighbours.has(n.id) : false;
      const isSel = selected === n.id;
      return {
        id: n.id,
        position: pos.get(n.id) ?? { x: 0, y: 0 },
        data: { label: n.is_number },
        style: {
          background: c.bg, color: c.color,
          border: `${isSel ? 2 : 1}px solid ${isSel ? "#c99a2e" : c.border}`,
          borderRadius: 10, fontSize: 11, fontWeight: 600, width: 150, padding: 6,
          opacity: dim ? 0.28 : 1, transition: "opacity 150ms",
          boxShadow: isSel ? "0 0 0 3px rgba(201,154,46,0.25)" : "none",
        },
      };
    });

    const edges: Edge[] = graph.edges.map((e) => {
      const touches = selected && (e.from === selected || e.to === selected);
      const dim = selected && !touches;
      return {
        id: e.id, source: e.from, target: e.to,
        label: e.relationship_type.replace(/_/g, " ").toLowerCase(),
        labelStyle: { fill: "#6b6a63", fontSize: 9, opacity: dim ? 0.3 : 1 },
        style: { stroke: touches ? "#c99a2e" : "#cfd6cf", strokeWidth: touches ? 2 : 1, opacity: dim ? 0.25 : 1 },
        animated: !!touches,
      };
    });
    return { nodes, edges };
  }, [graph, selected, neighbours]);

  const selNode = selected ? nodeById.get(selected) : undefined;
  const selEdges = useMemo(
    () => (graph?.edges ?? []).filter((e) => e.from === selected || e.to === selected),
    [graph, selected],
  );

  return (
    <div>
      <AnalysisHeader id={id} section="How standards connect" />

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
        <span className="flex items-center gap-1.5"><Dot c="#0b5d3b" /> Recommended</span>
        <span className="flex items-center gap-1.5"><Dot c="#e9d3a6" /> Outdated</span>
        <span className="flex items-center gap-1.5"><Dot c="#e7b7b7" /> Superseded</span>
        <span className="flex items-center gap-1.5"><Dot c="#eae4d8" /> Related</span>
        <span className="ml-auto">Select a standard to highlight its connections.</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="h-[480px] overflow-hidden">
          {isLoading ? (
            <div className="grid h-full place-items-center text-sm text-muted">Loading graph…</div>
          ) : !graph?.nodes.length ? (
            <div className="grid h-full place-items-center text-sm text-muted">No graph for this analysis.</div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              fitView
              onNodeClick={(_, n) => setSelected((cur) => (cur === n.id ? null : n.id))}
              onPaneClick={() => setSelected(null)}
              proOptions={{ hideAttribution: true }}
            >
              <Background color="#e6e1d6" gap={16} />
              <Controls showInteractive={false} />
            </ReactFlow>
          )}
        </Card>

        <div className="space-y-4">
          {selNode ? (
            <Card className="p-4 text-sm">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-tech text-sm font-semibold text-primary">{selNode.is_number}</span>
                <button onClick={() => setSelected(null)} className="text-xs text-muted hover:text-ink" aria-label="Clear selection">✕</button>
              </div>
              <div className="text-ink">{selNode.title}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {selNode.recommended && <StatusChip tone="success">Recommended</StatusChip>}
                <StatusChip tone={STATUS_TONE[selNode.status] ?? "neutral"}>{selNode.status}</StatusChip>
                {selNode.sector && <span className="text-[11px] capitalize text-muted">{selNode.sector}</span>}
              </div>

              <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted/70">
                Connections ({selEdges.length})
              </div>
              {selEdges.length === 0 ? (
                <p className="mt-1 text-xs text-muted">No mapped relationships.</p>
              ) : (
                <ul className="mt-1 space-y-1.5">
                  {selEdges.map((e) => {
                    const otherId = e.from === selected ? e.to : e.from;
                    const other = nodeById.get(otherId);
                    return (
                      <li key={e.id} className="rounded-lg border border-line px-2.5 py-1.5 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted">{e.from === selected ? "→" : "←"}</span>
                          <span className="font-tech font-medium text-ink">{other?.is_number ?? otherId}</span>
                          <StatusChip tone="info">{e.relationship_type.replace(/_/g, " ")}</StatusChip>
                        </div>
                        {other?.title && <div className="mt-0.5 truncate text-muted">{other.title}</div>}
                      </li>
                    );
                  })}
                </ul>
              )}

              <Link to={`/standards/${selNode.id}`} className="mt-3 inline-block text-xs font-medium text-primary hover:underline">
                Open standard detail →
              </Link>
            </Card>
          ) : (
            <Card className="p-4 text-sm text-muted">
              <SectionHeader eyebrow="Graph" title="Standard connections" />
              Click any node to see how it relates to the other standards in this analysis.
            </Card>
          )}

          <Card className="p-4">
            <SectionHeader eyebrow="Versions" title="Version intelligence" />
            {!versions?.length ? (
              <p className="text-xs text-muted">No referenced standards to check.</p>
            ) : (
              <div className="space-y-2">
                {versions.map((v, i) => (
                  <div key={i} className="rounded-lg border border-line px-2.5 py-1.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-tech font-medium text-ink">{v.is_number ?? v.referenced_text}</span>
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

function Dot({ c }: { c: string }) {
  return <span className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-line" style={{ background: c }} aria-hidden />;
}
