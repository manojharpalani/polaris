# North Star

Turn a system's functional and non-functional requirements into an interactive,
navigable C4 architecture diagram (Context + Container levels) — with every
container and relationship carrying the *rationale* for why it's there, tied
back to the requirement that drove it.

This is the MVP described in the project PRD: no auth, no persistence — fill
in requirements, get a diagram, explore/edit it, export it. Accounts, saved
projects, share links, and Component-level (C4 Level 3) diagrams are
deliberate fast-follows, not in this version.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind
- [Vercel AI SDK](https://ai-sdk.dev) + `@ai-sdk/anthropic`, using `generateObject`
  so the model returns a typed C4 graph (Zod schema), not prose to parse
- [React Flow](https://reactflow.dev) for the interactive canvas, with a small
  C4-styled node component and [dagre](https://github.com/dagrejs/dagre) for
  auto-layout
- `html-to-image` for PNG/SVG export

No database, no auth provider — intentionally, per the MVP cut above.

## Getting started

```bash
npm install
cp .env.example .env.local
# then put your Anthropic API key in .env.local
npm run dev
```

Open http://localhost:3000. Fill in the requirements form (at least a system
name, description, and one functional requirement) and submit — the app calls
`/api/generate`, which asks Claude to produce a structured C4 model, and
renders it.

You'll need an `ANTHROPIC_API_KEY` from https://console.anthropic.com/settings/keys.
The model used is set in `src/app/api/generate/route.ts` (`MODEL_ID`,
overridable via `ANTHROPIC_MODEL`) — check https://docs.claude.com for current
model IDs if the default has aged out.

## How it works

- `src/lib/c4-schema.ts` — the Zod schemas for both the requirements input and
  the generated C4 model (nodes: person / softwareSystem / externalSystem /
  container / datastore; edges with labels, technology, and rationale).
- `src/lib/prompt.ts` — the system prompt that tells Claude how to reason
  about the architecture (grounding every choice in a requirement, picking
  technology that matches the stated scale rather than defaulting to
  over-engineered patterns) and the function that turns the form input into a
  user prompt.
- `src/app/api/generate/route.ts` — the route handler that validates input,
  calls `generateObject`, and returns the C4 model as JSON.
- `src/lib/layout.ts` — dagre-based auto-layout, run separately for the
  Context and Container views.
- `src/components/DiagramCanvas.tsx` — the React Flow canvas: renders nodes/
  edges, handles click-to-select, drag-to-connect (creates a new
  relationship), and exposes PNG/SVG export.
- `src/components/Inspector.tsx` — the side panel for viewing and editing a
  selected node's or edge's name, description, technology, and rationale, and
  for deleting it.
- `src/app/page.tsx` — orchestrates requirements → generation → the
  Context/Container-toggle + canvas + inspector view, and owns all edits
  (rename/add/delete) against the in-memory model.

Everything lives in browser/server memory for the session — refreshing the
page loses the current diagram (there's no database yet). Editing the
requirements and regenerating replaces the model.

## Known MVP limitations (by design, not oversight)

- Manually dragging a node to reposition it is not preserved across edits —
  any add/delete/rename triggers a fresh auto-layout. Treat manual dragging as
  a final pre-export touch-up, not something to rely on mid-edit.
- New relationships you draw by dragging between nodes get a generic label
  ("communicates with") — edit it via the Inspector after creating it.
- Targeted regeneration ("just redo this one container") isn't wired up yet —
  editing is fully manual, or you regenerate the whole diagram from the
  requirements form.
- Nothing persists between sessions. There's no login and no database.

## Deploying to Vercel

```bash
npm i -g vercel   # if you don't have it
vercel
```

Follow the prompts to link/create a project, then set the `ANTHROPIC_API_KEY`
environment variable in the Vercel project settings (Settings → Environment
Variables) before your first real deploy — `vercel dev`/`vercel --prod` won't
pick up `.env.local` in production. Redeploy after adding it.

## Suggested next steps (post-MVP, from the PRD)

1. Validate diagram quality on a handful of real requirement sets before
   adding anything else — this is the part the whole product hinges on.
2. Persistence + the simplest viable auth (e.g. GitHub OAuth), so a project
   survives a refresh and you can return to it.
3. Shareable read-only links.
4. Component-level (C4 Level 3) drill-down for one container at a time.
5. Targeted regeneration of a single node/subgraph instead of full
   regeneration only.
