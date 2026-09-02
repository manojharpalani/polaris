"use client";

import { useMemo, useRef, useState } from "react";
import type {
  C4Edge,
  C4Model,
  C4Node,
  C4NodeKind,
  DiagramLevel,
  RequirementInput,
  SelectedItem,
} from "@/lib/c4-schema";
import { newId } from "@/lib/id";
import RequirementsForm from "@/components/RequirementsForm";
import DiagramCanvas from "@/components/DiagramCanvas";
import Inspector from "@/components/Inspector";

const DEFAULT_NODE_DESCRIPTIONS: Record<C4NodeKind, string> = {
  person: "Describe who this is and what they need from the system.",
  softwareSystem: "Describe this system.",
  externalSystem: "Describe this external system and what it's used for.",
  container: "Describe what this container does.",
  datastore: "Describe what this stores.",
};

export default function Home() {
  const [lastInput, setLastInput] = useState<RequirementInput | undefined>();
  const [model, setModel] = useState<C4Model | null>(null);
  const [level, setLevel] = useState<DiagramLevel>("context");
  const [selected, setSelected] = useState<SelectedItem>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingRequirements, setEditingRequirements] = useState(false);
  const exportRef = useRef<{ exportPng: () => void; exportSvg: () => void } | null>(null);

  async function generate(input: RequirementInput) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Generation failed");
      }
      setModel(json as C4Model);
      setLastInput(input);
      setLevel("context");
      setSelected(null);
      setEditingRequirements(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const currentGraph = useMemo(() => {
    if (!model) return null;
    return level === "context" ? model.context : model.containers;
  }, [model, level]);

  function mutateGraph(mutator: (nodes: C4Node[], edges: C4Edge[]) => { nodes: C4Node[]; edges: C4Edge[] }) {
    setModel((prev) => {
      if (!prev) return prev;
      const graph = level === "context" ? prev.context : prev.containers;
      const result = mutator(graph.nodes, graph.edges);
      return {
        ...prev,
        [level === "context" ? "context" : "containers"]: result,
      };
    });
  }

  function updateNode(id: string, patch: Partial<C4Node>) {
    mutateGraph((nodes, edges) => ({
      nodes: nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
      edges,
    }));
  }

  function deleteNode(id: string) {
    mutateGraph((nodes, edges) => ({
      nodes: nodes.filter((n) => n.id !== id),
      edges: edges.filter((e) => e.source !== id && e.target !== id),
    }));
    setSelected(null);
  }

  function addNode(kind: C4NodeKind) {
    const id = newId(kind);
    mutateGraph((nodes, edges) => ({
      nodes: [
        ...nodes,
        {
          id,
          kind,
          name: "New " + kind.replace(/([A-Z])/g, " $1"),
          description: DEFAULT_NODE_DESCRIPTIONS[kind],
        },
      ],
      edges,
    }));
    setSelected({ kind: "node", id });
  }

  function updateEdge(id: string, patch: Partial<C4Edge>) {
    mutateGraph((nodes, edges) => ({
      nodes,
      edges: edges.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  }

  function deleteEdge(id: string) {
    mutateGraph((nodes, edges) => ({
      nodes,
      edges: edges.filter((e) => e.id !== id),
    }));
    setSelected(null);
  }

  function addEdge(source: string, target: string) {
    const id = newId(`${source}-${target}`);
    mutateGraph((nodes, edges) => ({
      nodes,
      edges: [...edges, { id, source, target, label: "communicates with" }],
    }));
    setSelected({ kind: "edge", id });
  }

  if (!model || editingRequirements) {
    return (
      <div className="min-h-screen bg-slate-50">
        <RequirementsForm
          onSubmit={generate}
          submitting={submitting}
          error={error}
          initial={lastInput}
        />
      </div>
    );
  }

  const selectedNode =
    selected?.kind === "node" ? currentGraph?.nodes.find((n) => n.id === selected.id) : undefined;
  const selectedEdge =
    selected?.kind === "edge" ? currentGraph?.edges.find((e) => e.id === selected.id) : undefined;

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-100">
      <header className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-4 min-w-0">
          <span className="font-semibold text-slate-900 shrink-0">Polaris</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-600 text-sm truncate">{model.systemName}</span>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 rounded-md p-1">
          <button
            onClick={() => {
              setLevel("context");
              setSelected(null);
            }}
            className={`text-sm px-3 py-1 rounded ${
              level === "context" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"
            }`}
          >
            Context
          </button>
          <button
            onClick={() => {
              setLevel("container");
              setSelected(null);
            }}
            className={`text-sm px-3 py-1 rounded ${
              level === "container" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"
            }`}
          >
            Container
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditingRequirements(true)}
            className="text-sm px-3 py-1.5 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50"
          >
            Edit requirements
          </button>
          <button
            onClick={() => exportRef.current?.exportPng()}
            className="text-sm px-3 py-1.5 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50"
          >
            Export PNG
          </button>
          <button
            onClick={() => exportRef.current?.exportSvg()}
            className="text-sm px-3 py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800"
          >
            Export SVG
          </button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 min-w-0">
          {currentGraph && (
            <DiagramCanvas
              level={level}
              graph={currentGraph}
              selected={selected}
              onSelect={setSelected}
              onAddNode={addNode}
              onAddEdge={addEdge}
              exportRef={exportRef}
            />
          )}
        </div>
        <aside className="w-[340px] shrink-0 border-l border-slate-200 bg-white overflow-y-auto">
          <Inspector
            key={selected ? `${selected.kind}:${selected.id}` : "none"}
            selected={selected}
            node={selectedNode}
            edge={selectedEdge}
            onUpdateNode={(patch) => selected?.kind === "node" && updateNode(selected.id, patch)}
            onDeleteNode={() => selected?.kind === "node" && deleteNode(selected.id)}
            onUpdateEdge={(patch) => selected?.kind === "edge" && updateEdge(selected.id, patch)}
            onDeleteEdge={() => selected?.kind === "edge" && deleteEdge(selected.id)}
            onClose={() => setSelected(null)}
          />
        </aside>
      </div>
    </div>
  );
}
