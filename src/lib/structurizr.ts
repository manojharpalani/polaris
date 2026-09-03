import type { C4Edge, C4Model } from "@/lib/c4-schema";

/**
 * Exports the current C4 model as Structurizr DSL — a small, well-documented
 * text format (docs.structurizr.com/dsl) for describing a C4 architecture as
 * code. This is deliberately an *export*, not a rendering dependency: Polaris
 * keeps its own interactive canvas as the primary experience, and this just
 * hands the user a portable `.dsl` file they can open in the free
 * Structurizr Local Docker image, run through `structurizr-cli export` for
 * PlantUML/Mermaid, or drop into a self-hosted Structurizr server their org
 * already has. Structurizr's own cloud service is being retired (Sep 2026)
 * and Structurizr Lite is EOL, so this intentionally targets nothing but the
 * open, self-hostable DSL/CLI tooling (Apache 2.0 / MIT).
 *
 * DSL naturally covers Context, Container, and Component — the same three
 * levels Polaris models — and has no "Code" level, matching this app's own
 * scope (Code-level class diagrams aren't exported).
 *
 * Every C4Node/C4Edge's `rationale` and `relatedRequirements` — the
 * traceability that's the actual point of Polaris — has no native field in
 * Structurizr's model, so it's preserved as `//` comments directly above the
 * element/relationship it belongs to, staying human-readable in the DSL
 * source even though it isn't a query-able model property there.
 */

const INDENT = "    ";

function escapeDslString(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, " ")
    .trim();
}

/** Assigns each raw node id a valid, unique Structurizr DSL identifier. */
function createIdentifierRegistry() {
  const tokenByRawId = new Map<string, string>();
  const used = new Set<string>();

  function declare(rawId: string): string {
    const existing = tokenByRawId.get(rawId);
    if (existing) return existing;

    let base = rawId.replace(/[^A-Za-z0-9_]/g, "_");
    if (!/^[A-Za-z_]/.test(base)) base = `el_${base}`;
    if (!base) base = "el";

    let candidate = base;
    let n = 2;
    while (used.has(candidate)) {
      candidate = `${base}_${n}`;
      n += 1;
    }
    used.add(candidate);
    tokenByRawId.set(rawId, candidate);
    return candidate;
  }

  /** Looks up a previously-declared id — undefined if never declared. */
  function lookup(rawId: string): string | undefined {
    return tokenByRawId.get(rawId);
  }

  return { declare, lookup };
}

function rationaleComment(
  node: { rationale?: string; relatedRequirements?: string[] },
  depth: number,
): string[] {
  const lines: string[] = [];
  if (node.rationale) {
    lines.push(`// Why: ${escapeDslString(node.rationale)}`);
  }
  if (node.relatedRequirements && node.relatedRequirements.length > 0) {
    lines.push(
      `// Requirement(s): ${node.relatedRequirements.map((r) => escapeDslString(r)).join(" | ")}`,
    );
  }
  return lines.map((l) => INDENT.repeat(depth) + l);
}

export function modelToStructurizrDsl(model: C4Model): string {
  const registry = createIdentifierRegistry();
  const lines: string[] = [];
  const skippedEdges: C4Edge[] = [];

  const systemNode = model.context.nodes.find((n) => n.kind === "softwareSystem");
  const persons = model.context.nodes.filter((n) => n.kind === "person");
  const externals = model.context.nodes.filter((n) => n.kind === "externalSystem");
  const containerNodes = model.containers.nodes.filter(
    (n) => n.kind === "container" || n.kind === "datastore",
  );

  lines.push(
    `workspace "${escapeDslString(model.systemName)}" "${escapeDslString(model.systemDescription)}" {`,
  );
  lines.push(`${INDENT}model {`);

  for (const p of persons) {
    const id = registry.declare(p.id);
    lines.push(...rationaleComment(p, 2));
    lines.push(
      `${INDENT.repeat(2)}${id} = person "${escapeDslString(p.name)}" "${escapeDslString(p.description)}"`,
    );
  }

  for (const ext of externals) {
    const id = registry.declare(ext.id);
    lines.push(...rationaleComment(ext, 2));
    lines.push(
      `${INDENT.repeat(2)}${id} = softwareSystem "${escapeDslString(ext.name)}" "${escapeDslString(ext.description)}" "External"`,
    );
  }

  const systemId = registry.declare(systemNode?.id ?? "system");
  if (systemNode) lines.push(...rationaleComment(systemNode, 2));
  lines.push(
    `${INDENT.repeat(2)}${systemId} = softwareSystem "${escapeDslString(model.systemName)}" "${escapeDslString(model.systemDescription)}" {`,
  );

  for (const c of containerNodes) {
    const cid = registry.declare(c.id);
    const tag = c.kind === "datastore" ? ` "Database"` : "";
    const technology = escapeDslString(c.technology ?? "");
    const components = model.componentsByContainer[c.id]?.nodes ?? [];

    lines.push(...rationaleComment(c, 3));
    if (components.length > 0) {
      lines.push(
        `${INDENT.repeat(3)}${cid} = container "${escapeDslString(c.name)}" "${escapeDslString(c.description)}" "${technology}"${tag} {`,
      );
      for (const comp of components) {
        const compId = registry.declare(comp.id);
        lines.push(...rationaleComment(comp, 4));
        lines.push(
          `${INDENT.repeat(4)}${compId} = component "${escapeDslString(comp.name)}" "${escapeDslString(comp.description)}" "${escapeDslString(comp.technology ?? "")}"`,
        );
      }
      lines.push(`${INDENT.repeat(3)}}`);
    } else {
      lines.push(
        `${INDENT.repeat(3)}${cid} = container "${escapeDslString(c.name)}" "${escapeDslString(c.description)}" "${technology}"${tag}`,
      );
    }
  }

  lines.push(`${INDENT.repeat(2)}}`); // close main software system

  function pushRelationships(edges: C4Edge[], depth: number) {
    for (const e of edges) {
      const src = registry.lookup(e.source);
      const tgt = registry.lookup(e.target);
      if (!src || !tgt) {
        skippedEdges.push(e);
        continue;
      }
      lines.push(...rationaleComment(e, depth));
      const tech = e.technology ? ` "${escapeDslString(e.technology)}"` : "";
      lines.push(`${INDENT.repeat(depth)}${src} -> ${tgt} "${escapeDslString(e.label)}"${tech}`);
    }
  }

  lines.push("");
  lines.push(`${INDENT.repeat(2)}// Relationships`);
  pushRelationships(model.context.edges, 2);
  pushRelationships(model.containers.edges, 2);
  for (const graph of Object.values(model.componentsByContainer)) {
    pushRelationships(graph.edges, 2);
  }

  if (skippedEdges.length > 0) {
    lines.push(
      `${INDENT.repeat(2)}// Note: ${skippedEdges.length} relationship(s) omitted — they referenced an` +
        ` element outside what's expanded/exported (e.g. an unexpanded container's components, or Code-level`,
    );
    lines.push(
      `${INDENT.repeat(2)}// classes, which Structurizr DSL has no level for). Expand more of the diagram in` +
        " Polaris before exporting to include them.",
    );
  }

  lines.push(`${INDENT}}`); // close model
  lines.push("");
  lines.push(`${INDENT}views {`);
  lines.push(`${INDENT.repeat(2)}systemContext ${systemId} "SystemContext" {`);
  lines.push(`${INDENT.repeat(3)}include *`);
  lines.push(`${INDENT.repeat(3)}autoLayout`);
  lines.push(`${INDENT.repeat(2)}}`);
  lines.push(`${INDENT.repeat(2)}container ${systemId} "Containers" {`);
  lines.push(`${INDENT.repeat(3)}include *`);
  lines.push(`${INDENT.repeat(3)}autoLayout`);
  lines.push(`${INDENT.repeat(2)}}`);

  for (const c of containerNodes) {
    const components = model.componentsByContainer[c.id]?.nodes ?? [];
    if (components.length === 0) continue;
    const cid = registry.lookup(c.id);
    if (!cid) continue;
    lines.push(`${INDENT.repeat(2)}component ${cid} "Components_${cid}" {`);
    lines.push(`${INDENT.repeat(3)}include *`);
    lines.push(`${INDENT.repeat(3)}autoLayout`);
    lines.push(`${INDENT.repeat(2)}}`);
  }

  lines.push(`${INDENT.repeat(2)}styles {`);
  lines.push(`${INDENT.repeat(3)}element "Person" { shape Person; background #08427b; color #ffffff }`);
  lines.push(`${INDENT.repeat(3)}element "Software System" { background #1168bd; color #ffffff }`);
  lines.push(`${INDENT.repeat(3)}element "External" { background #999999; color #ffffff }`);
  lines.push(`${INDENT.repeat(3)}element "Container" { background #438dd5; color #ffffff }`);
  lines.push(`${INDENT.repeat(3)}element "Database" { shape Cylinder }`);
  lines.push(`${INDENT.repeat(3)}element "Component" { background #85bbf0; color #000000 }`);
  lines.push(`${INDENT.repeat(2)}}`);
  lines.push(`${INDENT}}`); // close views
  lines.push("}"); // close workspace

  return lines.join("\n");
}
