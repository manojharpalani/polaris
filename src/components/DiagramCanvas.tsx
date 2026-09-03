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
import { boundingBox, layoutGraph } from "@/lib/layout";
import C4NodeView from "./nodes/C4NodeView";
import BoundaryNode from "./nodes/BoundaryNode";

const nodeTypes = {
  person: C4NodeView,
  softwareSystem: C4NodeView,
  externalSystem: C4NodeView,
  container: C4NodeView,
  datastore: C4NodeView,
  component: C4NodeView,
  class: C4NodeView,
  boundary: BoundaryNode,
};

const BOUNDARY_ID = "__boundary__";

export type BoundaryInfo = {
  label: string;
  kindLabel: string;
  /** ids of the nodes that belong "inside" this boundary */
  memberIds: string[];
};

function graphSignature(graph: C4Graph, boundary?: BoundaryInfo | null) {
  return JSON.stringify({
    nodes: graph.nodes.map((n) => [n.id, n.kind, n.name, n.description, n.technology ?? ""]),
    edges: graph.edges.map((e) => [e.id, e.source, e.target, e.label, e.technology ?? ""]),
    boundary: boundary ? [boundary.label, boundary.kindLabel, boundary.memberIds.join(",")] : null,
  });
}

function toRfNodes(
  graph: C4Graph,
  expandableKind: C4NodeKind | null,
  expandingNodeId: string | null | undefined,
  onExpand: (id: string) => void,
): Node[] {
  return graph.nodes.map((n) => ({
    id: n.id,
    type: n.kind,
    position: { x: 0, y: 0 },
    data: {
      ...n,
      expandable: expandableKind !== null && n.kind === expandableKind,
      expandLoading: expandingNodeId === n.id,
      onExpand: () => onExpand(n.id),
    },
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
  boundary?: BoundaryInfo | null;
  selected: SelectedItem;
  onSelect: (item: SelectedItem) => void;
  onAddNode: (kind: C4NodeKind) => void;
  onAddEdge: (source: string, target: string) => void;
  expandableKind: C4NodeKind | null;
  expandingNodeId?: string | null;
  onExpand: (nodeId: string) => void;
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
  component: [{ kind: "component", label: "+ Component" }],
  code: [{ kind: "class", label: "+ Class" }],
};

export default function DiagramCanvas({
  level,
  graph,
  boundary,
  selected,
  onSelect,
  onAddNode,
  onAddEdge,
  expandableKind,
  expandingNodeId,
  onExpand,
  exportRef,
}: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node[]>([] as unknown as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([] as unknown as Edge[]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const rfInstance = useRef<ReactFlowInstance | null>(null);
  const prevSignature = useRef("");
  const pendingFitView = useRef(false);

  // Full relayout whenever the graph's content, or the drilled-into
  // boundary, actually changes (level switch, expand, add/remove/edit).
  useEffect(() => {
    const sig = graphSignature(graph, boundary);
    if (sig === prevSignature.current) return;
    prevSignature.current = sig;

    const rfNodes = toRfNodes(graph, expandableKind, expandingNodeId, onExpand);
    const rfEdges = toRfEdges(graph);
    let laidOut = layoutGraph(rfNodes, rfEdges);

    if (boundary) {
      const box = boundingBox(laidOut, boundary.memberIds);
      if (box) {
        laidOut = [
          {
            id: BOUNDARY_ID,
            type: "boundary",
            position: { x: box.x, y: box.y },
            style: { width: box.width, height: box.height },
            data: { label: boundary.label, kindLabel: boundary.kindLabel },
            draggable: false,
            selectable: false,
            connectable: false,
            zIndex: -1,
          },
          ...laidOut,
        ];
      }
    }

    setNodes(laidOut);
    setEdges(rfEdges);
    pendingFitView.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph, boundary]);

  // Selection + expand-loading highlight only — never touches position/layout.
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === BOUNDARY_ID
          ? n
          : {
              ...n,
              data: {
                ...n.data,
                selected: selected?.kind === "node" && selected.id === n.id,
                expandLoading: expandingNodeId === n.id,
              },
            },
      ),
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
  }, [selected, expandingNodeId]);

  // Zoom-to-fit right after a structural change actually lands in RF's state.
  useEffect(() => {
    if (!pendingFitView.current || !rfInstance.current) return;
    pendingFitView.current = false;
    const inst = rfInstance.current;
    requestAnimationFrame(() => {
      inst.fitView({ padding: 0.15, duration: 400 });
    });
  }, [nodes]);

  const doExport = useMemo(
    () => (format: "png" | "svg") => {
      const viewport = wrapperRef.current?.querySelector(
        ".react-flow__viewport",
      ) as HTMLElement | null;
      if (!viewport) return;
      const fn = format === "png" ? toPng : toSvg;
      fn(viewport, { backgroundColor: "#050810", pixelRatio: 2 }).then((dataUrl) => {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `polaris-${level}.${format}`;
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
    <div ref={wrapperRef} className="w-full h-full bg-[#050810]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onInit={(inst) => (rfInstance.current = inst)}
        onNodeClick={(_, node) => {
          if (node.id === BOUNDARY_ID) return;
          onSelect({ kind: "node", id: node.id });
        }}
        onEdgeClick={(_, edge) => onSelect({ kind: "edge", id: edge.id })}
        onPaneClick={() => onSelect(null)}
        deleteKeyCode={null}
        fitView
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        className="polaris-flow"
      >
        <Background color="#1e3a5c" gap={26} size={1.5} />
        <Controls showInteractive={false} />
        <Panel position="top-left" className="flex gap-2">
          {ADDABLE_KINDS[level].map((a) => (
            <button
              key={a.kind}
              onClick={() => onAddNode(a.kind)}
              className="hud-label px-2.5 py-1.5 rounded-md bg-slate-900/80 border border-cyan-400/25 text-cyan-300 hover:bg-slate-800/80 hover:border-cyan-400/40 backdrop-blur transition-colors"
            >
              {a.label}
            </button>
          ))}
        </Panel>
      </ReactFlow>
    </div>
  );
}
