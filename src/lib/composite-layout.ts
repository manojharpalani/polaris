import dagre from "dagre";
import { MarkerType, type Edge, type Node } from "reactflow";
import type { C4Edge, C4Model, C4Node, C4NodeKind } from "@/lib/c4-schema";

/**
 * Lays out the ENTIRE model as one nested canvas: the Software System is a
 * boundary box containing Container boxes, and any container the user has
 * expanded becomes itself a boundary box containing its Components (and so
 * on down to Code/Class). Nothing is generated until the user asks for it —
 * expanding a container/component still costs an LLM call the first time —
 * but once generated, it stays nested in place rather than replacing the
 * whole screen, so the hierarchy is visible all at once, dashed-boundary
 * within dashed-boundary, exactly like the C4 model itself nests.
 *
 * The nesting + auto-layout is done with dagre's "compound graph" support
 * (parent/child clusters via setParent), which sizes each boundary box to
 * fit its children automatically. One real limitation: dagre's ranking
 * algorithm cannot rank an edge that terminates directly on a cluster node
 * (a box that itself has children) — it crashes. Every edge that needs to
 * touch a boundary box (e.g. a Person connecting to the System itself, or a
 * container-level relationship that happens to target an expanded
 * container) is therefore routed through a tiny invisible "anchor" leaf
 * node nested just inside that box for layout purposes only; the anchor is
 * discarded afterwards and the rendered React Flow edge still connects to
 * the real boundary box, which React Flow has no trouble drawing.
 */

export const LEAF_WIDTH = 240;
export const LEAF_HEIGHT = 110;
const GROUP_HEADER = 44;
const GROUP_PAD = 28;
const ANCHOR_PREFIX = "__anchor__";

const KIND_LABEL: Record<C4NodeKind, string> = {
  person: "Person",
  softwareSystem: "Software System",
  externalSystem: "External System",
  container: "Container",
  datastore: "Datastore",
  component: "Component",
  class: "Class",
};

type TreeEntry = {
  id: string;
  kind: C4NodeKind;
  node: C4Node;
  parentId: string | null;
  isGroup: boolean;
  expandable: boolean;
  hasGeneratedChildren: boolean;
  isExpanding: boolean;
};

function buildTree(
  model: C4Model,
  expandedIds: Set<string>,
  expandingId: string | null,
): { entries: Map<string, TreeEntry>; childrenOf: Map<string, string[]> } {
  const entries = new Map<string, TreeEntry>();
  const childrenOf = new Map<string, string[]>();

  function addEntry(e: TreeEntry) {
    if (entries.has(e.id)) return; // dedupe reused ids (e.g. an actor shown at multiple levels) — first definition wins
    entries.set(e.id, e);
    if (e.parentId) {
      const arr = childrenOf.get(e.parentId) ?? [];
      arr.push(e.id);
      childrenOf.set(e.parentId, arr);
    }
  }

  const systemNode = model.context.nodes.find((n) => n.kind === "softwareSystem");
  const persons = model.context.nodes.filter((n) => n.kind === "person");
  const externals = model.context.nodes.filter((n) => n.kind === "externalSystem");

  if (systemNode) {
    addEntry({
      id: systemNode.id,
      kind: "softwareSystem",
      node: systemNode,
      parentId: null,
      isGroup: true,
      expandable: false,
      hasGeneratedChildren: true,
      isExpanding: false,
    });
  }
  const systemId = systemNode?.id ?? null;

  persons.forEach((p) =>
    addEntry({
      id: p.id,
      kind: "person",
      node: p,
      parentId: null,
      isGroup: false,
      expandable: false,
      hasGeneratedChildren: false,
      isExpanding: false,
    }),
  );
  externals.forEach((x) =>
    addEntry({
      id: x.id,
      kind: "externalSystem",
      node: x,
      parentId: null,
      isGroup: false,
      expandable: false,
      hasGeneratedChildren: false,
      isExpanding: false,
    }),
  );

  const containerNodes = model.containers.nodes.filter(
    (n) => n.kind === "container" || n.kind === "datastore",
  );
  containerNodes.forEach((c) => {
    const hasGenerated = c.kind === "container" && !!model.componentsByContainer[c.id];
    const isGroup = hasGenerated && expandedIds.has(c.id);
    addEntry({
      id: c.id,
      kind: c.kind,
      node: c,
      parentId: systemId,
      isGroup,
      expandable: c.kind === "container",
      hasGeneratedChildren: hasGenerated,
      isExpanding: expandingId === c.id,
    });
  });

  containerNodes
    .filter(
      (c) => c.kind === "container" && expandedIds.has(c.id) && model.componentsByContainer[c.id],
    )
    .forEach((c) => {
      const components = model.componentsByContainer[c.id].nodes.filter(
        (n) => n.kind === "component",
      );
      components.forEach((comp) => {
        const hasGenerated = !!model.codeByComponent[comp.id];
        const isGroup = hasGenerated && expandedIds.has(comp.id);
        addEntry({
          id: comp.id,
          kind: "component",
          node: comp,
          parentId: c.id,
          isGroup,
          expandable: true,
          hasGeneratedChildren: hasGenerated,
          isExpanding: expandingId === comp.id,
        });
      });
    });

  const expandedComponents = Array.from(entries.values()).filter(
    (e) => e.kind === "component" && e.isGroup,
  );
  expandedComponents.forEach((comp) => {
    const codeGraph = model.codeByComponent[comp.id];
    if (!codeGraph) return;
    codeGraph.nodes
      .filter((n) => n.kind === "class")
      .forEach((cls) =>
        addEntry({
          id: cls.id,
          kind: "class",
          node: cls,
          parentId: comp.id,
          isGroup: false,
          expandable: false,
          hasGeneratedChildren: false,
          isExpanding: false,
        }),
      );
  });

  return { entries, childrenOf };
}

function collectEdges(model: C4Model, entries: Map<string, TreeEntry>): C4Edge[] {
  const all: C4Edge[] = [...model.context.edges, ...model.containers.edges];
  for (const e of entries.values()) {
    if (e.kind === "container" && e.isGroup) {
      const g = model.componentsByContainer[e.id];
      if (g) all.push(...g.edges);
    }
    if (e.kind === "component" && e.isGroup) {
      const g = model.codeByComponent[e.id];
      if (g) all.push(...g.edges);
    }
  }
  // Only keep edges whose endpoints are both currently rendered. A
  // container/component that's still collapsed never contributes its
  // internal edges above (see the loop), so there's nothing dangling to
  // clean up here beyond basic defensiveness against a malformed model.
  return all.filter((e) => e.source !== e.target && entries.has(e.source) && entries.has(e.target));
}

export type CompositeLayout = { nodes: Node[]; edges: Edge[] };

export function layoutComposite(
  model: C4Model,
  expandedIds: Set<string>,
  expandingId: string | null,
  onToggleExpand: (id: string) => void,
  onAddChild: (kind: C4NodeKind, parentGroupId?: string) => void,
): CompositeLayout {
  const { entries, childrenOf } = buildTree(model, expandedIds, expandingId);
  const edges = collectEdges(model, entries);

  const g = new dagre.graphlib.Graph({ compound: true });
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 90, marginx: 30, marginy: 30 });

  for (const entry of entries.values()) {
    if (entry.isGroup) {
      // No explicit width/height — dagre fits the cluster to its children.
      g.setNode(entry.id, {});
      const anchorId = ANCHOR_PREFIX + entry.id;
      g.setNode(anchorId, { width: 1, height: 1 });
      g.setParent(anchorId, entry.id);
    } else {
      g.setNode(entry.id, { width: LEAF_WIDTH, height: LEAF_HEIGHT });
    }
    if (entry.parentId) g.setParent(entry.id, entry.parentId);
  }

  for (const e of edges) {
    const src = entries.get(e.source);
    const tgt = entries.get(e.target);
    if (!src || !tgt) continue;
    const srcId = src.isGroup ? ANCHOR_PREFIX + src.id : src.id;
    const tgtId = tgt.isGroup ? ANCHOR_PREFIX + tgt.id : tgt.id;
    if (srcId === tgtId) continue;
    g.setEdge(srcId, tgtId);
  }

  dagre.layout(g);

  // Pass 1: absolute (dagre-space) top-left + rendered size for every
  // entry, inflating group boxes with room for their header + padding.
  const abs = new Map<string, { left: number; top: number; width: number; height: number }>();
  for (const entry of entries.values()) {
    const pos = g.node(entry.id);
    if (!pos) continue;
    if (entry.isGroup) {
      const rawLeft = pos.x - pos.width / 2;
      const rawTop = pos.y - pos.height / 2;
      abs.set(entry.id, {
        left: rawLeft - GROUP_PAD,
        top: rawTop - GROUP_HEADER,
        width: pos.width + GROUP_PAD * 2,
        height: pos.height + GROUP_HEADER + GROUP_PAD,
      });
    } else {
      abs.set(entry.id, {
        left: pos.x - LEAF_WIDTH / 2,
        top: pos.y - LEAF_HEIGHT / 2,
        width: LEAF_WIDTH,
        height: LEAF_HEIGHT,
      });
    }
  }

  // Pass 2: emit React Flow nodes, parents before children (required for
  // parentNode/extent nesting to resolve), converting each child's absolute
  // position to be relative to its parent's box as RF expects.
  const rfNodes: Node[] = [];
  function emit(id: string) {
    const entry = entries.get(id);
    const box = abs.get(id);
    if (!entry || !box) return;
    const parentBox = entry.parentId ? abs.get(entry.parentId) : undefined;
    const position = parentBox
      ? { x: box.left - parentBox.left, y: box.top - parentBox.top }
      : { x: box.left, y: box.top };

    const addableKinds: { kind: C4NodeKind; label: string }[] =
      entry.kind === "container"
        ? [{ kind: "component", label: "+ Component" }]
        : entry.kind === "component"
          ? [{ kind: "class", label: "+ Class" }]
          : [];

    rfNodes.push({
      id,
      type: entry.isGroup ? "group" : entry.kind,
      position,
      ...(entry.parentId ? { parentNode: entry.parentId, extent: "parent" as const } : {}),
      draggable: !entry.isGroup,
      style: entry.isGroup ? { width: box.width, height: box.height } : undefined,
      data: entry.isGroup
        ? {
            ...entry.node,
            kindLabel: KIND_LABEL[entry.kind],
            collapsible: entry.kind !== "softwareSystem",
            onToggleCollapse: () => onToggleExpand(id),
            onAddChild: (kind: C4NodeKind) => onAddChild(kind, id),
            addableKinds,
          }
        : {
            ...entry.node,
            expandable: entry.expandable,
            expandLoading: entry.isExpanding,
            onExpand: () => onToggleExpand(id),
          },
    });

    for (const childId of childrenOf.get(id) ?? []) emit(childId);
  }
  for (const entry of entries.values()) {
    if (entry.parentId === null) emit(entry.id);
  }

  const rfEdges: Edge[] = edges.map((e) => ({
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

  return { nodes: rfNodes, edges: rfEdges };
}

/** Cheap equality check so DiagramCanvas only relayouts when the model or
 * the set of expanded groups actually changed — not on every selection. */
export function compositeSignature(model: C4Model, expandedIds: Set<string>): string {
  return JSON.stringify({
    context: model.context,
    containers: model.containers,
    componentsByContainer: model.componentsByContainer,
    codeByComponent: model.codeByComponent,
    expanded: Array.from(expandedIds).sort(),
  });
}
