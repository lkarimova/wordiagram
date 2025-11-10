// app/api/update/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchWorldNews, rankAndCluster, detectBreaking, hasSignificantNewsChange } from "@/lib/news";
import { runBreakingGeneration } from "@/server/generation";
import { config } from "@/lib/config";

export const runtime = "nodejs";

/**
 * Breaking news check endpoint
 * Called every 120 minutes to check for breaking news
 * Only generates new image if:
 * 1. Headlines have changed significantly (lightweight check)
 * 2. Breaking news is detected (clustering check with embeddings)
 */
export async function POST(request: NextRequest) {
  // Optional: Protect with token
  const token = new URL(request.url).searchParams.get("token");
  if (process.env.CRON_SECRET && token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[update] Starting breaking news check");
    
    // Step 1: Get the current displayed image and its headlines
    const { getLatestPainting } = await import("@/src/server/supabase");
    const currentPainting = await getLatestPainting();
    const lastHeadlines = currentPainting?.sources?.world
      ?.map((s: any) => s.title)
      .filter(Boolean) || null;
    
    console.log("[update] Last image had", lastHeadlines?.length || 0, "headlines");
    
    // Step 2: Lightweight check - fetch news and compare headlines to LAST IMAGE
    const world = await fetchWorldNews();
    console.log("[update] Fetched", world.length, "world news items");
    
    if (!hasSignificantNewsChange(world, lastHeadlines)) {
      console.log("[update] No significant headline changes compared to last image");
      return NextResponse.json({ 
        ok: true, 
        breaking: false, 
        reason: "no-significant-changes" 
      }, { status: 200 });
    }
    
    console.log("[update] Significant headline changes detected compared to last image, running clustering with embeddings");

    // Step 2: Run clustering to detect breaking news (now with embeddings - async!)
    const worldClusters = await rankAndCluster(world);
    console.log("[update] Created", worldClusters.length, "clusters");
    
    const worldBreaking = detectBreaking(worldClusters);
    console.log("[update] Detected", worldBreaking.length, "breaking clusters");

    const minBreaking =
    config.breakingRules.world.minBreakingClusters ?? 1;

    if (worldBreaking.length < minBreaking) {
      console.log(
        `[update] Not enough breaking clusters: ${worldBreaking.length} < minBreaking=${minBreaking}`
      );
      return NextResponse.json(
        {
          ok: true,
          breaking: false,
          reason: "not-enough-breaking-clusters",
          breakingCount: worldBreaking.length,
        },
        { status: 200 }
      );
    }

    // Step 3: Generate new image for breaking news
    console.log("[update] Breaking news detected, generating new image");
    // IMPORTANT: This is the only place that should call image generation.
   // All early exits above return BEFORE we hit the Images API.
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
    return NextResponse.json(
      {
        ok: false,
        error: "Internal error while checking for breaking news",
      },
      { status: 500 }
    );
  }
}