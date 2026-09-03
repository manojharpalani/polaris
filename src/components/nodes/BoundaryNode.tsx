"use client";

import type { NodeProps } from "reactflow";

export type BoundaryNodeData = {
  label: string;
  kindLabel: string;
};

/**
 * A non-interactive dashed rectangle drawn behind the current level's nodes,
 * representing the parent element's boundary (e.g. the Software System
 * boundary around a Container diagram). Sized via node.style width/height,
 * computed from the bounding box of the child nodes — see lib/layout.ts.
 */
export default function BoundaryNode({ data }: NodeProps<BoundaryNodeData>) {
  return (
    <div className="w-full h-full rounded-lg border-2 border-dashed border-cyan-400/30 bg-cyan-400/[0.03] relative">
      <span className="absolute -top-3 left-3 bg-[#080d1a] border border-cyan-400/20 rounded px-2 py-0.5 hud-label text-cyan-300/80">
        {data.kindLabel}: {data.label}
      </span>
    </div>
  );
}
