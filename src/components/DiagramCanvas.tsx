"use client";

import { useEffect, useMemo, useRef } from "react";
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  Panel,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";
import { toPng, toSvg } from "html-to-image";
import type { C4Graph, C4NodeKind, DiagramLevel, SelectedItem } from "@/lib/c4-schema";
import { layoutGraph } from "@/lib/layout";
import C4NodeView from "./nodes/C4NodeView";

const nodeTypes = {
  person: C4NodeView,
  softwareSystem: C4NodeView,
  externalSystem: C4NodeView,
  container: C4NodeView,
  datastore: C4NodeView,
};

function graphSignature(graph: C4Graph) {
  return JSON.stringify({
    nodes: graph.nodes.map((n) => [n.id, n.kind, n.name, n.description, n.technology ?? ""]),
    edges: graph.edges.map((e) => [e.id, e.source, e.target, e.label, e.technology ?? ""]),
  });
}

function toRfNodes(graph: C4Graph): Node[] {
  return graph.nodes.map((n) => ({
    id: n.id,
    type: n.kind,
    position: { x: 0, y: 0 },
    data: { ...n },
  }));
}

function toRfEdges(graph: C4Graph): Edge[] {
  return graph.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.technology ? `${e.label} [${e.technology}]` : e.label,
    animated: false,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: "#64748b", strokeWidth: 1.5 },
    labelStyle: { fill: "#334155", fontSize: 11 },
    labelBgStyle: { fill: "#f8fafc", fillOpacity: 0.9 },
  }));
}

type Props = {
  level: DiagramLevel;
  graph: C4Graph;
  selected: SelectedItem;
  onSelect: (item: SelectedItem) => void;
  onAddNode: (kind: C4NodeKind) => void;
  onAddEdge: (source: string, target: string) => void;
  exportRef?: React.MutableRefObject<{ exportPng: () => void; exportSvg: () => void } | null>;
};

const ADDABLE_KINDS: Record<DiagramLevel, { kind: C4NodeKind; label: string }[]> = {
  context: [
    { kind: "person", label: "+ Person" },
    { kind: "externalSystem", label: "+ External System" },
  ],
  container: [
    { kind: "container", label: "+ Container" },
    { kind: "datastore", label: "+ Datastore" },
  ],
};

export default function DiagramCanvas({
  level,
  graph,
  selected,
  onSelect,
  onAddNode,
  onAddEdge,
  exportRef,
}: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node[]>([] as unknown as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([] as unknown as Edge[]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const rfInstance = useRef<ReactFlowInstance | null>(null);
  const prevSignature = useRef("");

  // Full relayout whenever the graph's content actually changes (add/remove/edit).
  useEffect(() => {
    const sig = graphSignature(graph);
    if (sig === prevSignature.current) return;
    prevSignature.current = sig;
    const laidOut = layoutGraph(toRfNodes(graph), toRfEdges(graph));
    setNodes(laidOut);
    setEdges(toRfEdges(graph));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph]);

  // Selection highlight only — never touches position/layout.
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, selected: selected?.kind === "node" && selected.id === n.id },
      })),
    );
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        style: {
          stroke: selected?.kind === "edge" && selected.id === e.id ? "#f59e0b" : "#64748b",
          strokeWidth: selected?.kind === "edge" && selected.id === e.id ? 2.5 : 1.5,
        },
      })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const doExport = useMemo(
    () => (format: "png" | "svg") => {
      const viewport = wrapperRef.current?.querySelector(
        ".react-flow__viewport",
      ) as HTMLElement | null;
      if (!viewport) return;
      const fn = format === "png" ? toPng : toSvg;
      fn(viewport, { backgroundColor: "#0f172a", pixelRatio: 2 }).then((dataUrl) => {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `north-star-${level}.${format}`;
        a.click();
      });
    },
    [level],
  );

  useEffect(() => {
    if (!exportRef) return;
    exportRef.current = {
      exportPng: () => doExport("png"),
      exportSvg: () => doExport("svg"),
    };
  }, [exportRef, doExport]);

  const onConnect = useMemo(
    () => (connection: Connection) => {
      if (connection.source && connection.target) {
        onAddEdge(connection.source, connection.target);
      }
    },
    [onAddEdge],
  );

  return (
    <div ref={wrapperRef} className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onInit={(inst) => (rfInstance.current = inst)}
        onNodeClick={(_, node) => onSelect({ kind: "node", id: node.id })}
        onEdgeClick={(_, edge) => onSelect({ kind: "edge", id: edge.id })}
        onPaneClick={() => onSelect(null)}
        deleteKeyCode={null}
        fitView
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#334155" gap={20} />
        <Controls showInteractive={false} />
        <Panel position="top-left" className="flex gap-2">
          {ADDABLE_KINDS[level].map((a) => (
            <button
              key={a.kind}
              onClick={() => onAddNode(a.kind)}
              className="text-xs px-2.5 py-1.5 rounded-md bg-white border border-slate-300 shadow-sm hover:bg-slate-50 text-slate-700"
            >
              {a.label}
            </button>
          ))}
        </Panel>
      </ReactFlow>
    </div>
  );
}
