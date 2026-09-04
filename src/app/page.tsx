"use client";

import { useEffect, useRef, useState } from "react";
import type {
  C4Edge,
  C4Graph,
  C4Model,
  C4Node,
  C4NodeKind,
  RequirementInput,
  SelectedItem,
} from "@/lib/c4-schema";
import { newId, slugify } from "@/lib/id";
import Landing from "@/components/Landing";
import RequirementsForm from "@/components/RequirementsForm";
import DiagramCanvas from "@/components/DiagramCanvas";
import Inspector from "@/components/Inspector";
import SpaceBackdrop from "@/components/SpaceBackdrop";
import { modelToStructurizrDsl } from "@/lib/structurizr";

const DEFAULT_NODE_DESCRIPTIONS: Record<C4NodeKind, string> = {
  person: "Describe who this is and what they need from the system.",
  softwareSystem: "Describe this system.",
  externalSystem: "Describe this external system and what it's used for.",
  container: "Describe what this container does.",
  datastore: "Describe what this stores.",
  component: "Describe what this component is responsible for.",
  class: "Describe this class's responsibility.",
};

// A node of these kinds can be drilled into one level further (a Container
// into its Components, a Component into its Code/Classes). Everything else
// — Person, External System, Software System (already always expanded),
// Datastore, Class — is a leaf.
const EXPANDABLE_KINDS: C4NodeKind[] = ["container", "component"];

const EMPTY_GRAPH: C4Graph = { nodes: [], edges: [] };

function findContainerNode(model: C4Model, containerId: string): C4Node | undefined {
  return model.containers.nodes.find((n) => n.id === containerId);
}

function findComponentNode(model: C4Model, componentId: string): C4Node | undefined {
  for (const graph of Object.values(model.componentsByContainer)) {
    const found = graph.nodes.find((n) => n.id === componentId);
    if (found) return found;
  }
  return undefined;
}

function findNodeGlobally(model: C4Model, id: string): C4Node | undefined {
  return (
    model.context.nodes.find((n) => n.id === id) ??
    model.containers.nodes.find((n) => n.id === id) ??
    Object.values(model.componentsByContainer)
      .flatMap((g) => g.nodes)
      .find((n) => n.id === id) ??
    Object.values(model.codeByComponent)
      .flatMap((g) => g.nodes)
      .find((n) => n.id === id)
  );
}

function findEdgeGlobally(model: C4Model, id: string): C4Edge | undefined {
  return (
    model.context.edges.find((e) => e.id === id) ??
    model.containers.edges.find((e) => e.id === id) ??
    Object.values(model.componentsByContainer)
      .flatMap((g) => g.edges)
      .find((e) => e.id === id) ??
    Object.values(model.codeByComponent)
      .flatMap((g) => g.edges)
      .find((e) => e.id === id)
  );
}

// ---- Addressing one of the model's several node/edge graphs uniformly ----

type GraphRef =
  | { kind: "context" }
  | { kind: "containers" }
  | { kind: "component"; containerId: string }
  | { kind: "code"; componentId: string };

function getGraph(model: C4Model, ref: GraphRef): C4Graph {
  switch (ref.kind) {
    case "context":
      return model.context;
    case "containers":
      return model.containers;
    case "component":
      return model.componentsByContainer[ref.containerId] ?? EMPTY_GRAPH;
    case "code":
      return model.codeByComponent[ref.componentId] ?? EMPTY_GRAPH;
  }
}

function setGraph(model: C4Model, ref: GraphRef, graph: C4Graph): C4Model {
  switch (ref.kind) {
    case "context":
      return { ...model, context: graph };
    case "containers":
      return { ...model, containers: graph };
    case "component":
      return {
        ...model,
        componentsByContainer: { ...model.componentsByContainer, [ref.containerId]: graph },
      };
    case "code":
      return { ...model, codeByComponent: { ...model.codeByComponent, [ref.componentId]: graph } };
  }
}

function allGraphRefs(model: C4Model): GraphRef[] {
  return [
    { kind: "context" },
    { kind: "containers" },
    ...Object.keys(model.componentsByContainer).map(
      (containerId): GraphRef => ({ kind: "component", containerId }),
    ),
    ...Object.keys(model.codeByComponent).map(
      (componentId): GraphRef => ({ kind: "code", componentId }),
    ),
  ];
}

/** Deepest graph that already contains both endpoints — where a new edge between them belongs. */
function resolveEdgeTarget(model: C4Model, source: string, target: string): GraphRef | null {
  const refs = allGraphRefs(model);
  const priorityOrder: GraphRef["kind"][] = ["code", "component", "containers", "context"];
  for (const kind of priorityOrder) {
    for (const ref of refs.filter((r) => r.kind === kind)) {
      const g = getGraph(model, ref);
      if (g.nodes.some((n) => n.id === source) && g.nodes.some((n) => n.id === target)) {
        return ref;
      }
    }
  }
  return null;
}

/**
 * Parses an API route's response defensively. A route we wrote will always
 * return JSON, but the request can be intercepted before it ever reaches our
 * code — a dev-server recompile in flight, a platform timeout, an auth wall
 * on a deployed URL — and those typically respond with an HTML error page
 * instead. Calling `res.json()` directly on one of those throws a raw
 * "Unexpected token '<'... is not valid JSON" that gives the user nothing to
 * act on, so read the body as text first and only parse it, surfacing a
 * clear, specific error either way.
 */
async function parseApiResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    const snippet = text.replace(/\s+/g, " ").trim().slice(0, 140);
    throw new Error(
      `Server returned an unexpected response (status ${res.status}). ` +
        (snippet
          ? `This usually means the dev server was still rebuilding, or hit a platform-level error — try again in a moment. Response started with: "${snippet}"`
          : "The response body was empty — try again in a moment."),
    );
  }
  if (!res.ok) {
    const message =
      json && typeof json === "object" && "error" in json && typeof json.error === "string"
        ? json.error
        : `Request failed (status ${res.status})`;
    throw new Error(message);
  }
  return json as T;
}

export default function Home() {
  const [hasEntered, setHasEntered] = useState(false);
  const [lastInput, setLastInput] = useState<RequirementInput | undefined>();
  const [model, setModel] = useState<C4Model | null>(null);
  // Ids of Container/Component nodes currently drawn open (their generated
  // children nested visibly inside them). The Software System itself is
  // always open — its Container graph is generated up front.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<SelectedItem>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandingId, setExpandingId] = useState<string | null>(null);
  const [expandError, setExpandError] = useState<string | null>(null);
  const [editingRequirements, setEditingRequirements] = useState(false);
  const exportRef = useRef<{ exportPng: () => void; exportSvg: () => void } | null>(null);

  // Which top-level screen is showing — used only to reset scroll position
  // on transitions below, so e.g. clicking a CTA near the bottom of the
  // landing page doesn't carry that scroll offset into the next screen.
  const screen = !hasEntered ? "landing" : !model || editingRequirements ? "intake" : "diagram";

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  async function generate(input: RequirementInput) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await parseApiResponse<Omit<C4Model, "componentsByContainer" | "codeByComponent">>(
        res,
      );
      setModel({ ...json, componentsByContainer: {}, codeByComponent: {} });
      setLastInput(input);
      setExpandedIds(new Set());
      setSelected(null);
      setEditingRequirements(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  function updateNode(id: string, patch: Partial<C4Node>) {
    setModel((prev) => {
      if (!prev) return prev;
      let next = prev;
      for (const ref of allGraphRefs(prev)) {
        const g = getGraph(prev, ref);
        if (g.nodes.some((n) => n.id === id)) {
          next = setGraph(next, ref, {
            ...g,
            nodes: g.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
          });
        }
      }
      return next;
    });
  }

  function deleteNode(id: string) {
    setModel((prev) => {
      if (!prev) return prev;
      let next = prev;
      for (const ref of allGraphRefs(prev)) {
        const g = getGraph(prev, ref);
        const touchesNode = g.nodes.some((n) => n.id === id);
        const touchesEdge = g.edges.some((e) => e.source === id || e.target === id);
        if (touchesNode || touchesEdge) {
          next = setGraph(next, ref, {
            nodes: g.nodes.filter((n) => n.id !== id),
            edges: g.edges.filter((e) => e.source !== id && e.target !== id),
          });
        }
      }
      return next;
    });
    setSelected(null);
  }

  function addNodeToGraph(kind: C4NodeKind, ref: GraphRef) {
    const id = newId(kind);
    setModel((prev) => {
      if (!prev) return prev;
      const g = getGraph(prev, ref);
      return setGraph(prev, ref, {
        ...g,
        nodes: [
          ...g.nodes,
          {
            id,
            kind,
            name: "New " + kind.replace(/([A-Z])/g, " $1"),
            description: DEFAULT_NODE_DESCRIPTIONS[kind],
          },
        ],
      });
    });
    setSelected({ kind: "node", id });
  }

  /** Add a node from the canvas — either the global toolbar (no parent) or
   * a specific expanded group's own "+" button (parentGroupId = that
   * container's/component's id). */
  function addChildNode(kind: C4NodeKind, parentGroupId?: string) {
    if (kind === "person" || kind === "externalSystem") {
      addNodeToGraph(kind, { kind: "context" });
    } else if (kind === "container" || kind === "datastore") {
      addNodeToGraph(kind, { kind: "containers" });
    } else if (kind === "component" && parentGroupId) {
      addNodeToGraph(kind, { kind: "component", containerId: parentGroupId });
    } else if (kind === "class" && parentGroupId) {
      addNodeToGraph(kind, { kind: "code", componentId: parentGroupId });
    }
  }

  function updateEdge(id: string, patch: Partial<C4Edge>) {
    setModel((prev) => {
      if (!prev) return prev;
      for (const ref of allGraphRefs(prev)) {
        const g = getGraph(prev, ref);
        if (g.edges.some((e) => e.id === id)) {
          return setGraph(prev, ref, {
            ...g,
            edges: g.edges.map((e) => (e.id === id ? { ...e, ...patch } : e)),
          });
        }
      }
      return prev;
    });
  }

  function deleteEdge(id: string) {
    setModel((prev) => {
      if (!prev) return prev;
      for (const ref of allGraphRefs(prev)) {
        const g = getGraph(prev, ref);
        if (g.edges.some((e) => e.id === id)) {
          return setGraph(prev, ref, { ...g, edges: g.edges.filter((e) => e.id !== id) });
        }
      }
      return prev;
    });
    setSelected(null);
  }

  function addEdge(source: string, target: string) {
    if (!model) return;
    const ref = resolveEdgeTarget(model, source, target);
    if (!ref) return;
    const id = newId(`${source}-${target}`);
    setModel((prev) => {
      if (!prev) return prev;
      const g = getGraph(prev, ref);
      return setGraph(prev, ref, {
        ...g,
        edges: [...g.edges, { id, source, target, label: "communicates with" }],
      });
    });
    setSelected({ kind: "edge", id });
  }

  /** Toggle a Container/Component open or closed. Opening it for the first
   * time generates its children via the appropriate API call; opening it
   * again after that (or closing it) is instant, no fetch. */
  async function toggleExpand(nodeId: string) {
    if (!model) return;

    if (expandedIds.has(nodeId)) {
      setExpandedIds((s) => {
        const next = new Set(s);
        next.delete(nodeId);
        return next;
      });
      return;
    }

    const containerNode = findContainerNode(model, nodeId);
    if (containerNode) {
      if (model.componentsByContainer[nodeId]) {
        setExpandedIds((s) => new Set(s).add(nodeId));
        return;
      }
      setExpandingId(nodeId);
      setExpandError(null);
      try {
        const neighborIds = new Set<string>();
        model.containers.edges.forEach((e) => {
          if (e.source === nodeId) neighborIds.add(e.target);
          if (e.target === nodeId) neighborIds.add(e.source);
        });
        const neighbors = model.containers.nodes.filter((n) => neighborIds.has(n.id));

        const res = await fetch("/api/generate-components", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            container: containerNode,
            systemName: model.systemName,
            systemDescription: model.systemDescription,
            requirements: lastInput,
            neighbors,
          }),
        });
        const json = await parseApiResponse<C4Graph>(res);

        setModel((prev) =>
          prev
            ? { ...prev, componentsByContainer: { ...prev.componentsByContainer, [nodeId]: json } }
            : prev,
        );
        setExpandedIds((s) => new Set(s).add(nodeId));
      } catch (err) {
        setExpandError(err instanceof Error ? err.message : "Couldn't generate components");
      } finally {
        setExpandingId(null);
      }
      return;
    }

    const componentNode = findComponentNode(model, nodeId);
    if (componentNode) {
      if (model.codeByComponent[nodeId]) {
        setExpandedIds((s) => new Set(s).add(nodeId));
        return;
      }
      const ownerContainerId = Object.keys(model.componentsByContainer).find((cid) =>
        model.componentsByContainer[cid].nodes.some((n) => n.id === nodeId),
      );
      const ownerContainer = ownerContainerId ? findContainerNode(model, ownerContainerId) : undefined;
      if (!ownerContainer) return;
      setExpandingId(nodeId);
      setExpandError(null);
      try {
        const res = await fetch("/api/generate-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            component: componentNode,
            container: ownerContainer,
            systemName: model.systemName,
          }),
        });
        const json = await parseApiResponse<C4Graph>(res);

        setModel((prev) =>
          prev ? { ...prev, codeByComponent: { ...prev.codeByComponent, [nodeId]: json } } : prev,
        );
        setExpandedIds((s) => new Set(s).add(nodeId));
      } catch (err) {
        setExpandError(err instanceof Error ? err.message : "Couldn't generate code elements");
      } finally {
        setExpandingId(null);
      }
    }
  }

  function goHome() {
    setHasEntered(false);
  }

  function exportStructurizrDsl() {
    if (!model) return;
    const dsl = modelToStructurizrDsl(model);
    const blob = new Blob([dsl], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(model.systemName) || "polaris"}.dsl`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!hasEntered) {
    return <Landing onEnter={() => setHasEntered(true)} />;
  }

  if (!model || editingRequirements) {
    return (
      <RequirementsForm
        onSubmit={generate}
        submitting={submitting}
        error={error}
        initial={lastInput}
        onHome={goHome}
      />
    );
  }

  const selectedNode = selected?.kind === "node" ? findNodeGlobally(model, selected.id) : undefined;
  const selectedEdge = selected?.kind === "edge" ? findEdgeGlobally(model, selected.id) : undefined;

  return (
    <div className="polaris-scene h-screen w-screen bg-[#050810]">
      <SpaceBackdrop showHeroStar={false} />
      <div className="relative z-10 h-full w-full flex flex-col">
      <header className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-cyan-500/10 bg-[#080d1a]/90 backdrop-blur gap-4">
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <button
            type="button"
            onClick={goHome}
            className="flex items-center gap-2 min-w-0 shrink-0 hover:opacity-80 transition-opacity"
            title="Back to home"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-cyan-400 shrink-0" fill="none">
              <path
                d="M12 2 L14.2 9.8 L22 12 L14.2 14.2 L12 22 L9.8 14.2 L2 12 L9.8 9.8 Z"
                fill="currentColor"
                fillOpacity="0.9"
              />
            </svg>
            <span className="font-semibold text-white shrink-0 tracking-tight">Polaris</span>
          </button>
          <span className="text-slate-600">/</span>
          <span className="text-slate-400 text-sm truncate max-w-[240px]">{model.systemName}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 hud-label text-emerald-400/90 mr-1">
            <span className="status-dot inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
            engine ready
          </div>
          {expandedIds.size > 0 && (
            <button
              onClick={() => setExpandedIds(new Set())}
              title="Collapse every expanded container/component back to a single box"
              className="hud-label text-slate-400 px-3 py-1.5 rounded-md border border-slate-700/50 hover:bg-slate-800/60 hover:text-slate-300 transition-colors"
            >
              Collapse all
            </button>
          )}
          <button
            onClick={() => setEditingRequirements(true)}
            className="hud-label text-slate-300 px-3 py-1.5 rounded-md border border-slate-600/50 hover:bg-slate-800/60 transition-colors"
          >
            Edit requirements
          </button>
          <button
            onClick={exportStructurizrDsl}
            title="Export the full model as Structurizr DSL — architecture-as-code you can open in Structurizr Local or run through structurizr-cli"
            className="hud-label text-slate-300 px-3 py-1.5 rounded-md border border-slate-600/50 hover:bg-slate-800/60 transition-colors"
          >
            Export DSL
          </button>
          <button
            onClick={() => exportRef.current?.exportPng()}
            className="hud-label text-slate-300 px-3 py-1.5 rounded-md border border-slate-600/50 hover:bg-slate-800/60 transition-colors"
          >
            Export PNG
          </button>
          <button
            onClick={() => exportRef.current?.exportSvg()}
            className="hud-label text-slate-950 px-3 py-1.5 rounded-md bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 shadow-[0_0_16px_-4px_rgba(34,211,238,0.7)] transition-all"
          >
            Export SVG
          </button>
        </div>
      </header>

      {expandError && (
        <div className="px-4 py-2 text-sm text-rose-300 bg-rose-500/10 border-b border-rose-500/20 flex items-center justify-between">
          <span>{expandError}</span>
          <button onClick={() => setExpandError(null)} className="text-rose-400/70 hover:text-rose-300">
            ✕
          </button>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 min-w-0">
          <DiagramCanvas
            model={model}
            expandedIds={expandedIds}
            expandingNodeId={expandingId}
            selected={selected}
            onSelect={setSelected}
            onToggleExpand={toggleExpand}
            onAddChild={addChildNode}
            onAddEdge={addEdge}
            exportRef={exportRef}
          />
        </div>
        <aside className="w-[340px] shrink-0 border-l border-cyan-500/10 bg-[#080d1a]/90 backdrop-blur overflow-y-auto">
          <Inspector
            key={selected ? `${selected.kind}:${selected.id}` : "none"}
            selected={selected}
            node={selectedNode}
            edge={selectedEdge}
            expandable={selectedNode !== undefined && EXPANDABLE_KINDS.includes(selectedNode.kind)}
            expanded={selected?.kind === "node" && expandedIds.has(selected.id)}
            onExpandNode={() => selected?.kind === "node" && toggleExpand(selected.id)}
            onUpdateNode={(patch) => selected?.kind === "node" && updateNode(selected.id, patch)}
            onDeleteNode={() => selected?.kind === "node" && deleteNode(selected.id)}
            onUpdateEdge={(patch) => selected?.kind === "edge" && updateEdge(selected.id, patch)}
            onDeleteEdge={() => selected?.kind === "edge" && deleteEdge(selected.id)}
            onClose={() => setSelected(null)}
          />
        </aside>
      </div>
      </div>
    </div>
  );
}
