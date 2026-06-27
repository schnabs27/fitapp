import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import type { UserSettings } from "@/lib/types";

// Same tier as meal estimation — cheap and fast, plenty for this task.
const ESTIMATION_MODEL = "claude-haiku-4-5-20251001";

export const runtime = "nodejs";

type EstimateRequest = { description?: string };

type ExerciseEstimate = {
  name: string;
  duration_minutes: number;
  calories_burned: number;
  confidence: "low" | "medium" | "high";
  notes?: string;
};

const EXERCISE_TOOL: Anthropic.Tool = {
  name: "report_exercise",
  description:
    "Report an estimated calorie burn for a described exercise session.",
  input_schema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description:
          "A short, human-readable name for this session, e.g. 'Bicep Day' or 'Dog Walk'.",
      },
      duration_minutes: {
        type: "number",
        description: "Total duration of the session in minutes.",
      },
      calories_burned: {
        type: "integer",
        description: "Estimated total calories burned during this session.",
      },
      confidence: {
        type: "string",
        enum: ["low", "medium", "high"],
        description:
          "How confident this estimate is, given how specific the description was and how much is known about the person's profile.",
      },
      notes: {
        type: "string",
        description:
          "Optional: brief note on assumptions made (e.g. assumed bodyweight if no profile was set, assumed moderate intensity).",
      },
    },
    required: ["name", "duration_minutes", "calories_burned", "confidence"],
  },
};

// Builds a short biometric context line from whatever profile fields
// are set. Calorie burn depends heavily on weight/age/sex, so this
// matters a lot more here than it did for meal macro estimation.
function buildProfileContext(settings: UserSettings | null): string {
  if (!settings) {
    return "No profile information is available — assume an average adult.";
  }

  const parts: string[] = [];

  if (settings.birth_year) {
    const age = new Date().getFullYear() - settings.birth_year;
    parts.push(`${age}-year-old`);
  }
  if (settings.biological_sex) parts.push(settings.biological_sex);
  if (settings.height_in) {
    const feet = Math.floor(settings.height_in / 12);
    const inches = Math.round(settings.height_in % 12);
    parts.push(`${feet}'${inches}" tall`);
  }
  if (settings.weight_lbs) parts.push(`${settings.weight_lbs} lbs`);
  if (settings.activity_level) parts.push(settings.activity_level);

  if (parts.length === 0) {
    return "No profile information is available — assume an average adult.";
  }
  return `The person is a ${parts.join(", ")}.`;
}

export async function POST(request: Request) {
  let body: EstimateRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { description } = body;

  if (!description || !description.trim()) {
    return NextResponse.json(
      { error: "An exercise description is required." },
      { status: 400 },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set on the server." },
      { status: 500 },
    );
  }

  // Pull the person's profile so the estimate is personalized rather
  // than a generic guess. RLS already scopes this to the signed-in user.
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { data: settingsRow } = await supabase
    .from("user_settings")
    .select("*")
    .maybeSingle();

  const profileContext = buildProfileContext(settingsRow as UserSettings | null);

  const client = new Anthropic();

  try {
    const message = await client.messages.create({
      model: ESTIMATION_MODEL,
      max_tokens: 1024,
      tools: [EXERCISE_TOOL],
      tool_choice: { type: "tool", name: "report_exercise" },
      messages: [
        {
          role: "user",
          content: `Estimate the calories burned for this exercise session.\n\n${profileContext}\n\nSession description: ${description}`,
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

    const estimate = toolUseBlock.input as ExerciseEstimate;

    return NextResponse.json({
      model: ESTIMATION_MODEL,
      input: { description },
      estimate,
    });
  } catch (err) {
    console.error("Claude exercise estimation error:", err);
    return NextResponse.json(
      { error: "Failed to get an estimate from Claude. Please try again." },
      { status: 502 },
    );
  }
}
