// app/api/ai/training/route.ts
import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function clampInt(n: any, min: number, max: number) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, Math.trunc(x)));
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY in .env.local" },
        { status: 500 }
      );
    }

    const body = await req.json();

    const prompt = String(body?.prompt ?? "").trim();
    const groupName = String(body?.groupName ?? "").trim();
    const groupGoal = String(body?.groupGoal ?? "").trim();

    // NEW: multi-week controls
    const scheduleType = String(body?.scheduleType ?? "weekly").toLowerCase(); // "weekly" | "daily"
    const weekStart = String(body?.weekStart ?? "").trim(); // YYYY-MM-DD (Monday)
    const weeksCount = clampInt(body?.weeksCount ?? 4, 1, 24); // cap for safety

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    if (scheduleType === "weekly" && !weekStart) {
      return NextResponse.json(
        { error: "weekStart is required for weekly generation (YYYY-MM-DD)." },
        { status: 400 }
      );
    }

    // IMPORTANT: force JSON-only, with exact number of items
    const input = `
You are a running coach.
Generate training/guidelines for a running group.

Group name: ${groupName || "N/A"}
Group goal: ${groupGoal || "N/A"}

User prompt:
${prompt}

Schedule:
- schedule_type: ${scheduleType}
- For weekly: generate EXACTLY ${weeksCount} weeks, starting from Monday week_start = ${weekStart}
- Each week must be safe for mixed ability runners (no extreme volume)

Return ONLY valid JSON in this exact shape:
{
  "weeks": [
    {
      "week_start": "YYYY-MM-DD",
      "title": "max 70 chars",
      "content": "actionable plan. bullet points when useful. include warm-up / main set / cooldown when applicable"
    }
  ]
}

Rules:
- JSON only (no markdown, no extra text).
- weeks array length MUST be exactly ${weeksCount}.
- week_start must be consecutive Mondays starting at ${weekStart}.
- content should be structured and readable.
- keep it safe and realistic.
`;

    const resp = await client.responses.create({
      // you can swap model later if you want cheaper
      model: "gpt-5.2",
      input,
    });

    const text = (resp as any).output_text ?? "";

    let parsed: any = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      const m = text.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          parsed = JSON.parse(m[0]);
        } catch {}
      }
    }

    const weeks = Array.isArray(parsed?.weeks) ? parsed.weeks : null;

    if (!weeks || weeks.length === 0) {
      return NextResponse.json(
        {
          error: "AI returned unexpected format. Try a clearer prompt.",
          raw: text,
        },
        { status: 200 }
      );
    }

    // sanitize + harden
    const cleanWeeks = weeks
      .slice(0, weeksCount)
      .map((w: any) => ({
        week_start: String(w?.week_start ?? "").trim(),
        title: String(w?.title ?? "").trim().slice(0, 120),
        content: String(w?.content ?? "").trim(),
      }))
      .filter((w: any) => w.week_start && w.title && w.content);

    if (cleanWeeks.length !== Math.min(weeksCount, weeks.length)) {
      return NextResponse.json(
        {
          error:
            "AI returned incomplete weeks. Try again or simplify the prompt.",
          raw: text,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        scheduleType,
        weeksCount,
        weeks: cleanWeeks,
      },
      { status: 200 }
    );
  } catch (e: any) {
    // surface quota errors nicely
    const msg = e?.message ?? "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}