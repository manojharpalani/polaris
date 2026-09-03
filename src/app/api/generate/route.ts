import { generateObject } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { anthropic, MODEL_ID } from "@/lib/anthropic";
import { C4ModelSchema, RequirementInputSchema } from "@/lib/c4-schema";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/prompt";

export const maxDuration = 60;

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
      instructions: {
        role: "system",
        content: SYSTEM_PROMPT,
        providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
      },
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
