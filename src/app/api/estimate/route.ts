import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const ESTIMATION_MODEL = "claude-haiku-4-5-20251001";

export const runtime = "nodejs";

type EstimateRequest = { description?: string; portion?: number };

interface NutritionResult {
  name: string;
  calories: number;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
  confidence: "low" | "medium" | "high";
  notes?: string;
}

const NUTRITION_TOOL: Anthropic.Tool = {
  name: "report_nutrition",
  description:
    "Report the estimated nutritional content for the described meal or food item.",
  input_schema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Canonical name for the food or meal.",
      },
      calories: {
        type: "number",
        description: "Total calories (kcal).",
      },
      carbs_g: {
        type: "number",
        description: "Total carbohydrates in grams.",
      },
      protein_g: {
        type: "number",
        description: "Total protein in grams.",
      },
      fat_g: {
        type: "number",
        description: "Total fat in grams.",
      },
      confidence: {
        type: "string",
        enum: ["low", "medium", "high"],
        description:
          "Confidence level in the estimate based on specificity of the description.",
      },
      notes: {
        type: "string",
        description:
          "Optional clarifying notes, e.g. assumptions made or wide variance in the estimate.",
      },
    },
    required: ["name", "calories", "carbs_g", "protein_g", "fat_g", "confidence"],
  },
};

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

  const client = new Anthropic();

  const message = await client.messages.create({
    model: ESTIMATION_MODEL,
    max_tokens: 1024,
    tools: [NUTRITION_TOOL],
    tool_choice: { type: "tool", name: "report_nutrition" },
    messages: [
      {
        role: "user",
        content:
          `Estimate the nutritional content for ${portion !== 1 ? `${portion} serving(s) of: ` : ""}${description.trim()}`,
      },
    ],
  });

  const toolBlock = message.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    return NextResponse.json(
      { error: "Model did not return a tool_use block." },
      { status: 502 },
    );
  }

  const result = toolBlock.input as NutritionResult;

  return NextResponse.json({
    model: ESTIMATION_MODEL,
    input: { description, portion },
    estimate: result,
  });
}
