"use client";

import { useState } from "react";
import type { C4Edge, C4Node, SelectedItem } from "@/lib/c4-schema";

type Props = {
  selected: SelectedItem;
  node?: C4Node;
  edge?: C4Edge;
  expandable?: boolean;
  onExpandNode?: () => void;
  onUpdateNode: (patch: Partial<C4Node>) => void;
  onDeleteNode: () => void;
  onUpdateEdge: (patch: Partial<C4Edge>) => void;
  onDeleteEdge: () => void;
  onClose: () => void;
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="hud-label text-cyan-400/70">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const inputCls = "hud-input";

// The parent must pass a `key` (e.g. `${selected.kind}:${selected.id}`) so this
// component remounts — and its local form state resets — whenever the
// selected node/edge changes, instead of syncing that via an effect.
export default function Inspector({
  selected,
  node,
  edge,
  expandable,
  onExpandNode,
  onUpdateNode,
  onDeleteNode,
  onUpdateEdge,
  onDeleteEdge,
  onClose,
}: Props) {
  const [local, setLocal] = useState<Partial<C4Node & C4Edge>>(() => node ?? edge ?? {});

  if (!selected) {
    return (
      <div className="p-4 text-sm text-slate-500">
        Click a node or relationship to inspect its rationale, or edit it here.
      </div>
    );
  }

  if (selected.kind === "node" && node) {
    return (
      <div className="p-4 flex flex-col gap-3 overflow-y-auto h-full">
        <div className="flex items-center justify-between">
          <span className="hud-label text-cyan-400/70">{node.kind}</span>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-sm">
            ✕
          </button>
        </div>

        <Field label="Name">
          <input
            className={inputCls}
            value={local.name ?? ""}
            onChange={(e) => setLocal((l) => ({ ...l, name: e.target.value }))}
            onBlur={() => onUpdateNode({ name: local.name })}
          />
        </Field>

        <Field label="Description">
          <textarea
            className={inputCls}
            rows={3}
            value={local.description ?? ""}
            onChange={(e) => setLocal((l) => ({ ...l, description: e.target.value }))}
            onBlur={() => onUpdateNode({ description: local.description })}
          />
        </Field>

        {node.kind !== "person" && (
          <Field label="Technology">
            <input
              className={inputCls}
              value={local.technology ?? ""}
              onChange={(e) => setLocal((l) => ({ ...l, technology: e.target.value }))}
              onBlur={() => onUpdateNode({ technology: local.technology })}
            />
          </Field>
        )}

        <Field label="Rationale (why this exists)">
          <textarea
            className={inputCls}
            rows={4}
            value={local.rationale ?? ""}
            onChange={(e) => setLocal((l) => ({ ...l, rationale: e.target.value }))}
            onBlur={() => onUpdateNode({ rationale: local.rationale })}
          />
        </Field>

        {node.relatedRequirements && node.relatedRequirements.length > 0 && (
          <Field label="Driven by requirement(s)">
            <ul className="text-sm text-slate-400 list-disc pl-4 space-y-1">
              {node.relatedRequirements.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </Field>
        )}

        {expandable && (
          <button
            onClick={onExpandNode}
            className="text-sm text-slate-950 font-medium bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 shadow-[0_0_16px_-4px_rgba(34,211,238,0.7)] rounded-md px-3 py-1.5 flex items-center justify-center gap-1.5 transition-all"
          >
            Expand into next level ⌄
          </button>
        )}

        <button
          onClick={onDeleteNode}
          className="mt-2 text-sm text-rose-300 hover:text-rose-200 border border-rose-500/30 hover:bg-rose-500/10 rounded-md px-3 py-1.5 transition-colors"
        >
          Delete node
        </button>
      </div>
    );
  }

  if (selected.kind === "edge" && edge) {
    return (
      <div className="p-4 flex flex-col gap-3 overflow-y-auto h-full">
        <div className="flex items-center justify-between">
          <span className="hud-label text-cyan-400/70">Relationship</span>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-sm">
            ✕
          </button>
        </div>

        <Field label="Label">
          <input
            className={inputCls}
            value={local.label ?? ""}
            onChange={(e) => setLocal((l) => ({ ...l, label: e.target.value }))}
            onBlur={() => onUpdateEdge({ label: local.label })}
          />
        </Field>

        <Field label="Technology / protocol">
          <input
            className={inputCls}
            value={local.technology ?? ""}
            onChange={(e) => setLocal((l) => ({ ...l, technology: e.target.value }))}
            onBlur={() => onUpdateEdge({ technology: local.technology })}
          />
        </Field>

        <Field label="Rationale">
          <textarea
            className={inputCls}
            rows={4}
            value={local.rationale ?? ""}
            onChange={(e) => setLocal((l) => ({ ...l, rationale: e.target.value }))}
            onBlur={() => onUpdateEdge({ rationale: local.rationale })}
          />
        </Field>

        <button
          onClick={onDeleteEdge}
          className="mt-2 text-sm text-rose-300 hover:text-rose-200 border border-rose-500/30 hover:bg-rose-500/10 rounded-md px-3 py-1.5 transition-colors"
        >
          Delete relationship
        </button>
      </div>
    );
  }

  return null;
}
