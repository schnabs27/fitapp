import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// Model for meal estimation. Haiku is the cheapest/fastest tier and
// plenty for calorie + macro estimation. If you ever want a second
// opinion on a tricky meal, swap this for a Sonnet model string —
// everything else below stays the same.
const ESTIMATION_MODEL = "claude-haiku-4-5-20251001";

export const runtime = "nodejs"; // Anthropic SDK needs the Node runtime, not Edge

type EstimateRequest = { description?: string; portion?: number };

type NutritionEstimate = {
  name: string;
  calories: number;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
  confidence: "low" | "medium" | "high";
  notes?: string;
};

// Forcing a tool call (instead of asking Claude to "please return JSON")
// guarantees a parseable, schema-shaped response every time — no
// markdown fences or stray prose to strip out.
const NUTRITION_TOOL: Anthropic.Tool = {
  name: "report_nutrition",
  description:
    "Report estimated nutrition facts for a described meal or food item.",
  input_schema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description:
          "A short, human-readable name for this meal, e.g. 'Toasted Sprouted Grain Bread with Egg and Avocado'.",
      },
      calories: {
        type: "integer",
        description: "Estimated total calories (kcal) for the full portion described.",
      },
      carbs_g: {
        type: "number",
        description: "Estimated total carbohydrates in grams.",
      },
      protein_g: {
        type: "number",
        description: "Estimated total protein in grams.",
      },
      fat_g: {
        type: "number",
        description: "Estimated total fat in grams.",
      },
      confidence: {
        type: "string",
        enum: ["low", "medium", "high"],
        description:
          "How confident this estimate is, given how specific the description was.",
      },
      notes: {
        type: "string",
        description:
          "Optional: brief note on assumptions made (e.g. assumed cooking oil, portion size guessed).",
      },
    },
    required: ["name", "calories", "carbs_g", "protein_g", "fat_g", "confidence"],
  },
};

export async function POST(request: Request) {
  let body: EstimateRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { description, portion = 1 } = body;

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

  const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env automatically

  try {
    const message = await client.messages.create({
      model: ESTIMATION_MODEL,
      max_tokens: 1024,
      tools: [NUTRITION_TOOL],
      tool_choice: { type: "tool", name: "report_nutrition" },
      messages: [
        {
          role: "user",
          content: `Estimate the nutrition for this meal. Portion multiplier: ${portion}x the described amounts.\n\nMeal description: ${description}`,
        },
      ],
    });

    const toolUseBlock = message.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );

    if (!toolUseBlock) {
      return NextResponse.json(
        { error: "Claude did not return a structured estimate. Try again." },
        { status: 502 },
      );
    }

    const estimate = toolUseBlock.input as NutritionEstimate;

    return NextResponse.json({
      model: ESTIMATION_MODEL,
      input: { description, portion },
      estimate,
    });
  } catch (err) {
    console.error("Claude estimation error:", err);
    return NextResponse.json(
      { error: "Failed to get an estimate from Claude. Please try again." },
      { status: 502 },
    );
  }
}
