import { createAnthropic } from "@ai-sdk/anthropic";

// Override with ANTHROPIC_MODEL if you want a different Claude model.
export const MODEL_ID =
  process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929";

// Personal/identity-linked API keys (as opposed to legacy workspace-scoped
// keys) require the workspace they act in on every request. If your key
// gives a 400 asking for "anthropic-workspace-id", set ANTHROPIC_WORKSPACE_ID
// (Console → Settings → Workspaces) — or generate a workspace-scoped key
// instead, which doesn't need this at all.
export const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  headers: process.env.ANTHROPIC_WORKSPACE_ID
    ? { "anthropic-workspace-id": process.env.ANTHROPIC_WORKSPACE_ID }
    : undefined,
});
