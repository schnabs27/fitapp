import { NextResponse } from "next/server";
// import Anthropic from "@anthropic-ai/sdk"; // ← uncomment in the next build step

// Model for meal estimation. Haiku is the cheapest/fastest tier and
// plenty for calorie + macro estimation. Verify the current string and
// pricing before going live: https://docs.claude.com/en/about-claude/models/overview
const ESTIMATION_MODEL = "claude-haiku-4-5-20251001";

export const runtime = "nodejs"; // Anthropic SDK needs the Node runtime, not Edge

type EstimateRequest = { description?: string; portion?: number };

export async function POST(request: Request) {
  const { description, portion = 1 }: EstimateRequest = await request.json();

  if (!description || !description.trim()) {
    return NextResponse.json(
      { error: "A meal description is required." },
      { status: 400 },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set on the server." },
      { status: 500 },
    );
  }

  // ────────────────────────────────────────────────────────────────
  // SCAFFOLD STUB — returns placeholder macros so the UI has a stable
  // shape to build against. The next build step replaces this block
  // with a real Claude call using tool use / structured outputs:
  //
  //   const client = new Anthropic();
  //   const message = await client.messages.create({
  //     model: ESTIMATION_MODEL,
  //     max_tokens: 1024,
  //     tools: [ /* nutrition schema */ ],
  //     tool_choice: { type: "tool", name: "report_nutrition" },
  //     messages: [{ role: "user", content: description }],
  //   });
  //   ...parse the tool_use block into the object below...
  // ────────────────────────────────────────────────────────────────
  void ESTIMATION_MODEL; // referenced so the constant isn't flagged unused

  return NextResponse.json({
    stub: true,
    model: ESTIMATION_MODEL,
    input: { description, portion },
    estimate: {
      name: description.slice(0, 60),
      calories: 0,
      carbs_g: 0,
      protein_g: 0,
      fat_g: 0,
    },
  });
}
