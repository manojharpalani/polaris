import { createAnthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { C4ModelSchema, RequirementInputSchema } from "@/lib/c4-schema";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/prompt";

export const maxDuration = 60;

// Override with ANTHROPIC_MODEL if you want a different Claude model.
const MODEL_ID = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929";

// Personal/identity-linked API keys (as opposed to legacy workspace-scoped
// keys) require the workspace they act in on every request. If your key
// gives a 400 asking for "anthropic-workspace-id", set ANTHROPIC_WORKSPACE_ID
// (Console → Settings → Workspaces) — or generate a workspace-scoped key
// instead, which doesn't need this at all.
const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  headers: process.env.ANTHROPIC_WORKSPACE_ID
    ? { "anthropic-workspace-id": process.env.ANTHROPIC_WORKSPACE_ID }
    : undefined,
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = RequirementInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid requirements", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          "ANTHROPIC_API_KEY is not set. Add it to your .env.local (see .env.example).",
      },
      { status: 500 },
    );
  }

  try {
    const { object } = await generateObject({
      model: anthropic(MODEL_ID),
      schema: C4ModelSchema,
      system: SYSTEM_PROMPT,
      prompt: buildUserPrompt(parsed.data),
    });

    return NextResponse.json(object);
  } catch (err) {
    console.error("Generation failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Generation failed: ${message}` },
      { status: 502 },
    );
  }
}
