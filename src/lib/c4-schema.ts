import { z } from "zod";

// ---- Input: requirements the user provides ----

export const NFR_CATEGORIES = [
  "scale",
  "availability",
  "latency",
  "security_compliance",
  "cost",
  "team_constraints",
  "other",
] as const;

export const NfrCategorySchema = z.enum(NFR_CATEGORIES);
export type NfrCategory = z.infer<typeof NfrCategorySchema>;

export const NonFunctionalRequirementSchema = z.object({
  category: NfrCategorySchema,
  detail: z.string().min(1),
});
export type NonFunctionalRequirement = z.infer<
  typeof NonFunctionalRequirementSchema
>;

export const RequirementInputSchema = z.object({
  systemName: z.string().min(1),
  description: z.string().min(1),
  actors: z.array(z.string()).default([]),
  functionalRequirements: z.array(z.string().min(1)).min(1),
  nonFunctionalRequirements: z.array(NonFunctionalRequirementSchema).default(
    [],
  ),
  constraints: z.array(z.string()).default([]),
});
export type RequirementInput = z.infer<typeof RequirementInputSchema>;

// ---- Output: the C4 model the LLM generates ----

export const C4_NODE_KINDS = [
  "person",
  "softwareSystem",
  "externalSystem",
  "container",
  "datastore",
] as const;

export const C4NodeKindSchema = z.enum(C4_NODE_KINDS);
export type C4NodeKind = z.infer<typeof C4NodeKindSchema>;

export const C4NodeSchema = z.object({
  id: z.string().describe("short stable slug id, e.g. 'payments-api'"),
  kind: C4NodeKindSchema,
  name: z.string(),
  description: z.string().describe("one to two sentences, what it does"),
  technology: z
    .string()
    .optional()
    .describe("e.g. 'Node.js / Postgres', omit for person/external system"),
  rationale: z
    .string()
    .optional()
    .describe(
      "why this exists / this technology was chosen, explicitly tied to one or more requirements",
    ),
  relatedRequirements: z
    .array(z.string())
    .optional()
    .describe("verbatim or near-verbatim snippets of the requirements that drove this node"),
});
export type C4Node = z.infer<typeof C4NodeSchema>;

export const C4EdgeSchema = z.object({
  id: z.string(),
  source: z.string().describe("source node id"),
  target: z.string().describe("target node id"),
  label: z.string().describe("short verb phrase, e.g. 'reads/writes'"),
  technology: z
    .string()
    .optional()
    .describe("protocol, e.g. 'HTTPS/JSON', 'gRPC', 'async/Kafka'"),
  rationale: z.string().optional(),
});
export type C4Edge = z.infer<typeof C4EdgeSchema>;

export const C4GraphSchema = z.object({
  nodes: z.array(C4NodeSchema),
  edges: z.array(C4EdgeSchema),
});
export type C4Graph = z.infer<typeof C4GraphSchema>;

export const C4ModelSchema = z.object({
  systemName: z.string(),
  systemDescription: z.string(),
  context: C4GraphSchema.describe(
    "Level 1: the system as one box, its users (person nodes), and the external systems it talks to",
  ),
  containers: C4GraphSchema.describe(
    "Level 2: the major deployable/runnable pieces inside the system (services, UIs, queues, datastores) and how they relate. May reuse person/externalSystem node ids from context to show entry points.",
  ),
});
export type C4Model = z.infer<typeof C4ModelSchema>;

export type DiagramLevel = "context" | "container";

export type SelectedItem =
  | { kind: "node"; id: string }
  | { kind: "edge"; id: string }
  | null;
