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
    <div className="w-full h-full rounded-lg border-2 border-dashed border-slate-400/70 bg-slate-400/[0.04] relative">
      <span className="absolute -top-3 left-3 bg-slate-50 px-2 text-[11px] font-medium text-slate-500 uppercase tracking-wide">
        {data.kindLabel}: {data.label}
      </span>
    </div>
  );
}
