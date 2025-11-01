import { NextRequest, NextResponse } from "next/server";
import { basicAuth } from "@/lib/utils/auth";
import { fetchWorldNews, fetchArtNews, rankAndCluster, detectBreaking } from "@/lib/news";
import { runBreakingGeneration } from "@/server/generation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // Protect with Basic Auth
  const auth = basicAuth(request);
  if (auth) return auth;

  try {
    const world = await fetchWorldNews();
    const art = await fetchArtNews();
    const worldClusters = rankAndCluster(world, "world");
    const artClusters   = rankAndCluster(art, "art");

    // Use your real thresholds from config/news rules
    const worldBreaking = detectBreaking(undefined, worldClusters, "world"); // prev undefined for now
    const artBreaking   = detectBreaking(undefined, artClusters, "art");

    const hasBreaking = (worldBreaking.length > 0) || (artBreaking.length > 0);
    if (!hasBreaking) {
      return NextResponse.json({ ok: true, breaking: false, reason: "no-breaking" }, { status: 200 });
    }

    // Create a brand-new base row (timestamped)
    const row = await runBreakingGeneration({
      world, art, worldClusters, artClusters,
      reason: {
        world: worldBreaking,
        art: artBreaking,
      }
    });

    return NextResponse.json({ ok: true, breaking: true, row }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "breaking failed" }, { status: 500 });
  }
}
