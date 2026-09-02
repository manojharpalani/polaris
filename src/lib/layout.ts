import dagre from "dagre";
import type { Edge, Node } from "reactflow";

const NODE_WIDTH = 240;
const NODE_HEIGHT = 110;

/**
 * Lays out nodes/edges with dagre and returns React Flow nodes carrying
 * absolute positions. Pure function — safe to call in a useMemo.
 */
export function layoutGraph(
  nodes: Node[],
  edges: Edge[],
  direction: "TB" | "LR" = "TB",
): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 70, ranksep: 110, marginx: 40, marginy: 40 });

  nodes.forEach((n) => g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));
  edges.forEach((e) => {
    // dagre needs both endpoints registered; skip dangling edges defensively
    if (g.node(e.source) && g.node(e.target)) {
      g.setEdge(e.source, e.target);
    }
  });

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    if (!pos) return n;
    return {
      ...n,
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
    };
  });
}

export const NODE_DIMENSIONS = { width: NODE_WIDTH, height: NODE_HEIGHT };

const BOUNDARY_PADDING = 60;

/**
 * Bounding box (in flow coordinates) around a subset of already-laid-out
 * nodes, padded out — used to draw the dashed "parent boundary" rectangle
 * when a level has been drilled into. Returns null if none of the given
 * node ids are present (nothing to draw a boundary around).
 */
export function boundingBox(
  nodes: Node[],
  nodeIds: string[],
): { x: number; y: number; width: number; height: number } | null {
  const included = nodes.filter((n) => nodeIds.includes(n.id));
  if (included.length === 0) return null;

  const minX = Math.min(...included.map((n) => n.position.x));
  const minY = Math.min(...included.map((n) => n.position.y));
  const maxX = Math.max(...included.map((n) => n.position.x + NODE_WIDTH));
  const maxY = Math.max(...included.map((n) => n.position.y + NODE_HEIGHT));

  return {
    x: minX - BOUNDARY_PADDING,
    y: minY - BOUNDARY_PADDING / 2,
    width: maxX - minX + BOUNDARY_PADDING * 2,
    height: maxY - minY + BOUNDARY_PADDING,
  };
}
