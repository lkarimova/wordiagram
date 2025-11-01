// app/api/update/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchWorldNews, rankAndCluster, detectBreaking, hasSignificantNewsChange } from "@/lib/news";
import { runBreakingGeneration } from "@/server/generation";

export const runtime = "nodejs";

/**
 * Breaking news check endpoint
 * Called every 15 minutes to check for breaking news
 * Only generates new image if:
 * 1. Headlines have changed significantly (lightweight check)
 * 2. Breaking news is detected (clustering check)
 */
export async function POST(request: NextRequest) {
  // Optional: Protect with token
  const token = new URL(request.url).searchParams.get("token");
  if (process.env.CRON_SECRET && token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[update] Starting breaking news check");
    
    // Step 1: Lightweight check - fetch news and compare headlines
    const world = await fetchWorldNews();
    console.log("[update] Fetched", world.length, "world news items");
    
    if (!hasSignificantNewsChange(world)) {
      console.log("[update] No significant headline changes detected");
      return NextResponse.json({ 
        ok: true, 
        breaking: false, 
        reason: "no-significant-changes" 
      }, { status: 200 });
    }
    
    console.log("[update] Significant headline changes detected, checking for breaking news");

    // Step 2: Run clustering to detect breaking news
    const worldClusters = rankAndCluster(world);
    console.log("[update] Created", worldClusters.length, "clusters");
    
    const worldBreaking = detectBreaking(worldClusters);
    console.log("[update] Detected", worldBreaking.length, "breaking clusters");

    if (worldBreaking.length === 0) {
      console.log("[update] No breaking news criteria met");
      return NextResponse.json({ 
        ok: true, 
        breaking: false, 
        reason: "no-breaking-criteria" 
      }, { status: 200 });
    }

    // Step 3: Generate new image for breaking news
    console.log("[update] Breaking news detected, generating new image");
    const row = await runBreakingGeneration({
      world,
      worldClusters,
      reason: { world: worldBreaking },
    });

    return NextResponse.json({ 
      ok: true, 
      breaking: true, 
      row: {
        id: row.id,
        date: row.date,
        image_url: row.image_url,
        theme: row.world_theme_summary,
      }
    }, { status: 200 });
    
  } catch (err: any) {
    console.error("[update] Error:", err);
    return NextResponse.json({ 
      ok: false, 
      error: err?.message || "breaking check failed" 
    }, { status: 500 });
  }
}