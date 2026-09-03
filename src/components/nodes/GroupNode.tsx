"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import type { C4NodeKind } from "@/lib/c4-schema";

export type GroupNodeData = {
  kind: C4NodeKind;
  name: string;
  description: string;
  technology?: string;
  kindLabel: string;
  /** false only for the outermost Software System box — it's always expanded. */
  collapsible: boolean;
  /** true while this group's first real children are still being generated
   * (an in-flight expand-component/expand-class fetch) — suppresses the
   * collapse/add affordances so the user can't act on it mid-fetch. */
  loading?: boolean;
  selected?: boolean;
  onToggleCollapse?: () => void;
  onAddChild?: (kind: C4NodeKind) => void;
  addableKinds?: { kind: C4NodeKind; label: string }[];
};

/**
 * The nested boundary box for anything the user has drilled into — the
 * Software System itself, or any Container/Component that's been expanded.
 * Unlike the old one-off BoundaryNode, this is a real, selectable, editable
 * node (its id is the underlying C4Node's id), and it literally contains
 * its children via React Flow's parentNode/extent nesting — see
 * lib/composite-layout.ts for how position/size are computed.
 */
export default function GroupNode({ data }: NodeProps<GroupNodeData>) {
  return (
    <div
      className={[
        "w-full h-full rounded-lg border-2 border-dashed bg-cyan-400/[0.03] relative transition-colors",
        data.selected ? "border-cyan-300/70" : "border-cyan-400/30",
      ].join(" ")}
    >
      <Handle type="target" position={Position.Top} className="!bg-white/60" />
      <Handle type="source" position={Position.Bottom} className="!bg-white/60" />

      <div className="nodrag nopan absolute top-0 left-0 right-0 h-11 flex items-center justify-between gap-2 px-3 rounded-t-[6px] bg-[#0a1120]/90 border-b border-cyan-400/20">
        <div className="min-w-0 flex items-baseline gap-2">
          <span className="hud-label text-cyan-400/70 shrink-0">{data.kindLabel}</span>
          <span className="text-sm font-semibold text-white truncate">{data.name}</span>
          {data.technology && (
            <span className="text-[11px] italic text-slate-400 truncate hidden sm:inline">
              [{data.technology}]
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {data.loading && (
            <span className="hud-label flex items-center gap-1.5 text-cyan-300/80">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse" />
              Generating…
            </span>
          )}
          {data.addableKinds?.map((a) => (
            <button
              key={a.kind}
              type="button"
              title={a.label}
              onClick={(e) => {
                e.stopPropagation();
                data.onAddChild?.(a.kind);
              }}
              className="w-6 h-6 rounded-full bg-black/25 hover:bg-black/40 flex items-center justify-center text-cyan-300 text-sm leading-none"
            >
              +
            </button>
          ))}
          {data.collapsible && (
            <button
              type="button"
              title="Collapse"
              onClick={(e) => {
                e.stopPropagation();
                data.onToggleCollapse?.();
              }}
              className="w-6 h-6 rounded-full bg-black/25 hover:bg-black/40 flex items-center justify-center text-white text-xs leading-none"
            >
              ⌃
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
