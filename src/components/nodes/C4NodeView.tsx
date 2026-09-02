"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import type { C4NodeKind } from "@/lib/c4-schema";

export type C4NodeData = {
  kind: C4NodeKind;
  name: string;
  description: string;
  technology?: string;
  rationale?: string;
  selected?: boolean;
};

const KIND_STYLES: Record<
  C4NodeKind,
  { bg: string; border: string; text: string; badge: string; shape?: string }
> = {
  person: {
    bg: "bg-indigo-600",
    border: "border-indigo-400",
    text: "text-white",
    badge: "Person",
  },
  softwareSystem: {
    bg: "bg-slate-800",
    border: "border-slate-500",
    text: "text-white",
    badge: "Software System",
  },
  externalSystem: {
    bg: "bg-slate-500",
    border: "border-slate-400 border-dashed",
    text: "text-white",
    badge: "External System",
  },
  container: {
    bg: "bg-sky-700",
    border: "border-sky-400",
    text: "text-white",
    badge: "Container",
  },
  datastore: {
    bg: "bg-sky-800",
    border: "border-sky-500",
    text: "text-white",
    badge: "Datastore",
    shape: "rounded-b-[28px]",
  },
};

export default function C4NodeView({ data }: NodeProps<C4NodeData>) {
  const style = KIND_STYLES[data.kind];

  return (
    <div
      className={[
        "w-[240px] min-h-[110px] rounded-md border-2 shadow-md px-3 py-2 flex flex-col gap-1 cursor-pointer transition-transform",
        style.bg,
        style.border,
        style.text,
        style.shape ?? "",
        data.selected ? "ring-2 ring-amber-400 scale-[1.02]" : "",
      ].join(" ")}
    >
      <Handle type="target" position={Position.Top} className="!bg-white/60" />
      <Handle type="source" position={Position.Bottom} className="!bg-white/60" />

      <span className="text-[10px] uppercase tracking-wide opacity-70">
        {style.badge}
      </span>
      <span className="font-semibold leading-tight text-sm">{data.name}</span>
      {data.technology && (
        <span className="text-[11px] italic opacity-80">[{data.technology}]</span>
      )}
      <span className="text-[11px] opacity-90 line-clamp-3">{data.description}</span>
    </div>
  );
}
