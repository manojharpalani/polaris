import { generateObject } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { anthropic, MODEL_ID } from "@/lib/anthropic";
import {
  C4NodeSchema,
  ComponentGraphSchema,
  RequirementInputSchema,
} from "@/lib/c4-schema";
import { COMPONENT_SYSTEM_PROMPT, buildComponentUserPrompt } from "@/lib/prompt";
import { z } from "zod";

export const maxDuration = 60;

const BodySchema = z.object({
  container: C4NodeSchema,
  systemName: z.string(),
  systemDescription: z.string(),
  requirements: RequirementInputSchema,
  neighbors: z.array(C4NodeSchema).default([]),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set." },
      { status: 500 },
    );
  }

  const { container, systemName, systemDescription, requirements, neighbors } =
    parsed.data;

  try {
    const { object } = await generateObject({
      model: anthropic(MODEL_ID),
      schema: ComponentGraphSchema,
      messages: [
        {
          role: "system",
          content: COMPONENT_SYSTEM_PROMPT,
          providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
        },
        {
          role: "user",
          content: buildComponentUserPrompt(
            container,
            systemName,
            systemDescription,
            requirements,
            neighbors,
          ),
        },
      ],
    });

    return NextResponse.json(object);
  } catch (err) {
    console.error("Component generation failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Generation failed: ${message}` },
      { status: 502 },
    );
  }
}
