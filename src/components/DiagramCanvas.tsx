"use client";

import { useEffect, useMemo, useRef } from "react";
import ReactFlow, {
  Background,
  Controls,
  Panel,
  getNodesBounds,
  getViewportForBounds,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";
import { toPng, toSvg } from "html-to-image";
import type { C4Model, C4NodeKind, SelectedItem } from "@/lib/c4-schema";
import { compositeSignature, layoutComposite } from "@/lib/composite-layout";
import { slugify } from "@/lib/id";
import C4NodeView from "./nodes/C4NodeView";
import GroupNode from "./nodes/GroupNode";

const nodeTypes = {
  person: C4NodeView,
  softwareSystem: C4NodeView,
  externalSystem: C4NodeView,
  container: C4NodeView,
  datastore: C4NodeView,
  component: C4NodeView,
  class: C4NodeView,
  group: GroupNode,
};

const ROOT_ADDABLE: { kind: C4NodeKind; label: string }[] = [
  { kind: "person", label: "+ Person" },
  { kind: "externalSystem", label: "+ External System" },
  { kind: "container", label: "+ Container" },
  { kind: "datastore", label: "+ Datastore" },
];

type Props = {
  model: C4Model;
  expandedIds: Set<string>;
  expandingNodeId?: string | null;
  selected: SelectedItem;
  onSelect: (item: SelectedItem) => void;
  onToggleExpand: (id: string) => void;
  onAddChild: (kind: C4NodeKind, parentGroupId?: string) => void;
  onAddEdge: (source: string, target: string) => void;
  exportRef?: React.MutableRefObject<{ exportPng: () => void; exportSvg: () => void } | null>;
};

export default function DiagramCanvas({
  model,
  expandedIds,
  expandingNodeId,
  selected,
  onSelect,
  onToggleExpand,
  onAddChild,
  onAddEdge,
  exportRef,
}: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node[]>([] as unknown as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([] as unknown as Edge[]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const rfInstance = useRef<ReactFlowInstance | null>(null);
  const prevSignature = useRef("");
  const pendingFitView = useRef(false);

  // Full relayout whenever the model's content, or the set of
  // expanded/collapsed groups, actually changes.
  useEffect(() => {
    const sig = compositeSignature(model, expandedIds);
    if (sig === prevSignature.current) return;
    prevSignature.current = sig;

    const { nodes: rfNodes, edges: rfEdges } = layoutComposite(
      model,
      expandedIds,
      expandingNodeId ?? null,
      onToggleExpand,
      onAddChild,
    );
    setNodes(rfNodes);
    setEdges(rfEdges);
    pendingFitView.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, expandedIds]);

  // Selection + expand-loading highlight only — never touches position/layout.
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: {
          ...n.data,
          selected: selected?.kind === "node" && selected.id === n.id,
          expandLoading: expandingNodeId === n.id,
        },
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
      const viewportEl = wrapperRef.current?.querySelector(
        ".react-flow__viewport",
      ) as HTMLElement | null;
      const inst = rfInstance.current;
      if (!viewportEl || !inst) return;

      // The viewport element's own DOM box is whatever the current pan/zoom
      // happens to leave it at — capturing that directly produces a
      // mis-sized background fill. Instead, size the export to the real
      // bounding box of the nodes and force the capture into exactly that
      // frame, so the background fills it edge-to-edge regardless of the
      // on-screen pan/zoom. This is the pattern React Flow's own docs
      // recommend for image export.
      const nodesBounds = getNodesBounds(inst.getNodes());
      const padding = 40;
      const width = Math.max(1, Math.round(nodesBounds.width + padding * 2));
      const height = Math.max(1, Math.round(nodesBounds.height + padding * 2));
      const vp = getViewportForBounds(nodesBounds, width, height, 0.05, 2, padding);

      const fn = format === "png" ? toPng : toSvg;
      fn(viewportEl, {
        backgroundColor: "#050810",
        width,
        height,
        pixelRatio: 2,
        style: {
          width: `${width}px`,
          height: `${height}px`,
          transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`,
        },
      }).then((dataUrl) => {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `${slugify(model.systemName) || "polaris"}.${format}`;
        a.click();
      });
    },
    [model.systemName],
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
    <div ref={wrapperRef} className="w-full h-full bg-[#050810]/95">
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
        minZoom={0.05}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        className="polaris-flow"
      >
        <Background color="#1e3a5c" gap={26} size={1.5} />
        <Controls showInteractive={false} />
        <Panel position="top-left" className="flex gap-2">
          {ROOT_ADDABLE.map((a) => (
            <button
              key={a.kind}
              onClick={() => onAddChild(a.kind)}
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
