// app/api/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";

// If your function lives at src/server/generation.ts and exports runDailyGenerate
import { runDailyGeneration } from "@/server/generation";

export async function GET(req: NextRequest) {
  // Optional: secure with CRON_SECRET for Vercel Cron/manual hits
  const token = new URL(req.url).searchParams.get("token");
  if (process.env.CRON_SECRET && token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if generations are paused
  const isPaused = process.env.PAUSE_GENERATIONS === "true";
  if (isPaused) {
    return NextResponse.json(
      {
        ok: false,
        paused: true,
        message: "Generations are currently paused",
      },
      { status: 200 }
    );
  }

  try {
    const result = await runDailyGeneration(); // should save image + return URL/metadata
    return NextResponse.json({ ok: true, result }, { status: 200 });
  } catch (err) {
    console.error("[generate] error", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Internal error while generating daily image",
      },
      { status: 500 }
    );
  }
}