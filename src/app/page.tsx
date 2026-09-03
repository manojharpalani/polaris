"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  C4Edge,
  C4Graph,
  C4Model,
  C4Node,
  C4NodeKind,
  DiagramLevel,
  DrillStep,
  RequirementInput,
  SelectedItem,
} from "@/lib/c4-schema";
import { EXPANDABLE_KIND_BY_LEVEL } from "@/lib/c4-schema";
import { newId } from "@/lib/id";
import Landing from "@/components/Landing";
import RequirementsForm from "@/components/RequirementsForm";
import DiagramCanvas, { type BoundaryInfo } from "@/components/DiagramCanvas";
import Inspector from "@/components/Inspector";
import SpaceBackdrop from "@/components/SpaceBackdrop";

const DEFAULT_NODE_DESCRIPTIONS: Record<C4NodeKind, string> = {
  person: "Describe who this is and what they need from the system.",
  softwareSystem: "Describe this system.",
  externalSystem: "Describe this external system and what it's used for.",
  container: "Describe what this container does.",
  datastore: "Describe what this stores.",
  component: "Describe what this component is responsible for.",
  class: "Describe this class's responsibility.",
};

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

function crumbLabel(step: DrillStep, model: C4Model): string {
  switch (step.level) {
    case "context":
      return "Context";
    case "container":
      return "Container";
    case "component":
      return `Component · ${findContainerNode(model, step.containerId)?.name ?? step.containerId}`;
    case "code":
      return `Code · ${findComponentNode(model, step.componentId)?.name ?? step.componentId}`;
  }
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
  const [drillPath, setDrillPath] = useState<DrillStep[]>([{ level: "context" }]);
  const [selected, setSelected] = useState<SelectedItem>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandingId, setExpandingId] = useState<string | null>(null);
  const [expandError, setExpandError] = useState<string | null>(null);
  const [editingRequirements, setEditingRequirements] = useState(false);
  const exportRef = useRef<{ exportPng: () => void; exportSvg: () => void } | null>(null);

  const currentStep = drillPath[drillPath.length - 1];

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
      setDrillPath([{ level: "context" }]);
      setSelected(null);
      setEditingRequirements(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const currentGraph = useMemo((): C4Graph | null => {
    if (!model) return null;
    switch (currentStep.level) {
      case "context":
        return model.context;
      case "container":
        return model.containers;
      case "component":
        return model.componentsByContainer[currentStep.containerId] ?? EMPTY_GRAPH;
      case "code":
        return model.codeByComponent[currentStep.componentId] ?? EMPTY_GRAPH;
    }
  }, [model, currentStep]);

  const boundary = useMemo((): BoundaryInfo | null => {
    if (!model || !currentGraph) return null;
    if (currentStep.level === "context") return null;
    if (currentStep.level === "container") {
      return {
        label: model.systemName,
        kindLabel: "Software System",
        memberIds: currentGraph.nodes
          .filter((n) => n.kind === "container" || n.kind === "datastore")
          .map((n) => n.id),
      };
    }
    if (currentStep.level === "component") {
      const container = findContainerNode(model, currentStep.containerId);
      return {
        label: container?.name ?? currentStep.containerId,
        kindLabel: "Container",
        memberIds: currentGraph.nodes.filter((n) => n.kind === "component").map((n) => n.id),
      };
    }
    // code
    const component = findComponentNode(model, currentStep.componentId);
    return {
      label: component?.name ?? currentStep.componentId,
      kindLabel: "Component",
      memberIds: currentGraph.nodes.filter((n) => n.kind === "class").map((n) => n.id),
    };
  }, [model, currentGraph, currentStep]);

  const expandableKind = EXPANDABLE_KIND_BY_LEVEL[currentStep.level];

  function updateCurrentGraph(
    fn: (nodes: C4Node[], edges: C4Edge[]) => { nodes: C4Node[]; edges: C4Edge[] },
  ) {
    setModel((prev) => {
      if (!prev) return prev;
      const step = drillPath[drillPath.length - 1];
      if (step.level === "context") {
        return { ...prev, context: fn(prev.context.nodes, prev.context.edges) };
      }
      if (step.level === "container") {
        return { ...prev, containers: fn(prev.containers.nodes, prev.containers.edges) };
      }
      if (step.level === "component") {
        const g = prev.componentsByContainer[step.containerId] ?? EMPTY_GRAPH;
        return {
          ...prev,
          componentsByContainer: {
            ...prev.componentsByContainer,
            [step.containerId]: fn(g.nodes, g.edges),
          },
        };
      }
      const g = prev.codeByComponent[step.componentId] ?? EMPTY_GRAPH;
      return {
        ...prev,
        codeByComponent: { ...prev.codeByComponent, [step.componentId]: fn(g.nodes, g.edges) },
      };
    });
  }

  function updateNode(id: string, patch: Partial<C4Node>) {
    updateCurrentGraph((nodes, edges) => ({
      nodes: nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
      edges,
    }));
  }

  function deleteNode(id: string) {
    updateCurrentGraph((nodes, edges) => ({
      nodes: nodes.filter((n) => n.id !== id),
      edges: edges.filter((e) => e.source !== id && e.target !== id),
    }));
    setSelected(null);
  }

  function addNode(kind: C4NodeKind) {
    const id = newId(kind);
    updateCurrentGraph((nodes, edges) => ({
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
    updateCurrentGraph((nodes, edges) => ({
      nodes,
      edges: edges.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  }

  function deleteEdge(id: string) {
    updateCurrentGraph((nodes, edges) => ({
      nodes,
      edges: edges.filter((e) => e.id !== id),
    }));
    setSelected(null);
  }

  function addEdge(source: string, target: string) {
    const id = newId(`${source}-${target}`);
    updateCurrentGraph((nodes, edges) => ({
      nodes,
      edges: [...edges, { id, source, target, label: "communicates with" }],
    }));
    setSelected({ kind: "edge", id });
  }

  async function handleExpand(nodeId: string) {
    if (!model || !currentGraph) return;
    const node = currentGraph.nodes.find((n) => n.id === nodeId);
    if (!node) return;
    setExpandError(null);

    if (currentStep.level === "context") {
      // The system node's Container graph was already generated up front.
      setDrillPath((p) => [...p, { level: "container" }]);
      setSelected(null);
      return;
    }

    if (currentStep.level === "container") {
      if (model.componentsByContainer[nodeId]) {
        setDrillPath((p) => [...p, { level: "component", containerId: nodeId }]);
        setSelected(null);
        return;
      }
      setExpandingId(nodeId);
      try {
        const neighborIds = new Set<string>();
        currentGraph.edges.forEach((e) => {
          if (e.source === nodeId) neighborIds.add(e.target);
          if (e.target === nodeId) neighborIds.add(e.source);
        });
        const neighbors = currentGraph.nodes.filter((n) => neighborIds.has(n.id));

        const res = await fetch("/api/generate-components", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            container: node,
            systemName: model.systemName,
            systemDescription: model.systemDescription,
            requirements: lastInput,
            neighbors,
          }),
        });
        const json = await parseApiResponse<C4Graph>(res);

        setModel((prev) =>
          prev
            ? {
                ...prev,
                componentsByContainer: { ...prev.componentsByContainer, [nodeId]: json },
              }
            : prev,
        );
        setDrillPath((p) => [...p, { level: "component", containerId: nodeId }]);
        setSelected(null);
      } catch (err) {
        setExpandError(err instanceof Error ? err.message : "Couldn't generate components");
      } finally {
        setExpandingId(null);
      }
      return;
    }

    if (currentStep.level === "component") {
      if (model.codeByComponent[nodeId]) {
        setDrillPath((p) => [...p, { level: "code", componentId: nodeId }]);
        setSelected(null);
        return;
      }
      const containerNode = findContainerNode(model, currentStep.containerId);
      if (!containerNode) return;
      setExpandingId(nodeId);
      try {
        const res = await fetch("/api/generate-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            component: node,
            container: containerNode,
            systemName: model.systemName,
          }),
        });
        const json = await parseApiResponse<C4Graph>(res);

        setModel((prev) =>
          prev ? { ...prev, codeByComponent: { ...prev.codeByComponent, [nodeId]: json } } : prev,
        );
        setDrillPath((p) => [...p, { level: "code", componentId: nodeId }]);
        setSelected(null);
      } catch (err) {
        setExpandError(err instanceof Error ? err.message : "Couldn't generate code elements");
      } finally {
        setExpandingId(null);
      }
    }
  }

  function navigateTo(index: number) {
    setDrillPath((p) => p.slice(0, index + 1));
    setSelected(null);
  }

  function goHome() {
    setHasEntered(false);
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

  const selectedNode =
    selected?.kind === "node" ? currentGraph?.nodes.find((n) => n.id === selected.id) : undefined;
  const selectedEdge =
    selected?.kind === "edge" ? currentGraph?.edges.find((e) => e.id === selected.id) : undefined;

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
          <span className="text-slate-400 text-sm truncate max-w-[160px]">{model.systemName}</span>
        </div>

        <nav className="hud-label flex items-center gap-1 min-w-0 overflow-x-auto">
          {drillPath.map((step, i) => (
            <span key={i} className="flex items-center gap-1 shrink-0">
              {i > 0 && <span className="text-slate-700">/</span>}
              <button
                onClick={() => navigateTo(i)}
                className={
                  i === drillPath.length - 1
                    ? "text-cyan-300 px-1"
                    : "text-slate-500 hover:text-slate-300 px-1 transition-colors"
                }
              >
                {crumbLabel(step, model)}
              </button>
            </span>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setEditingRequirements(true)}
            className="hud-label text-slate-300 px-3 py-1.5 rounded-md border border-slate-600/50 hover:bg-slate-800/60 transition-colors"
          >
            Edit requirements
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
          {currentGraph && (
            <DiagramCanvas
              level={currentStep.level as DiagramLevel}
              graph={currentGraph}
              boundary={boundary}
              selected={selected}
              onSelect={setSelected}
              onAddNode={addNode}
              onAddEdge={addEdge}
              expandableKind={expandableKind}
              expandingNodeId={expandingId}
              onExpand={handleExpand}
              exportRef={exportRef}
            />
          )}
        </div>
        <aside className="w-[340px] shrink-0 border-l border-cyan-500/10 bg-[#080d1a]/90 backdrop-blur overflow-y-auto">
          <Inspector
            key={selected ? `${selected.kind}:${selected.id}` : "none"}
            selected={selected}
            node={selectedNode}
            edge={selectedEdge}
            expandable={
              selectedNode !== undefined &&
              expandableKind !== null &&
              selectedNode.kind === expandableKind
            }
            onExpandNode={() => selected?.kind === "node" && handleExpand(selected.id)}
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
