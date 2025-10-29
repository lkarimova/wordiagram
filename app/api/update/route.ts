// app/api/update/route.ts
import { NextRequest, NextResponse } from "next/server";
import { basicAuth } from "@/src/lib/utils/auth";
import { getLatestDaily, updateDailyFinalImage, insertPaintingUpdate } from "@/src/server/supabase";
import { fetchWorldNews, fetchArtNews, rankAndCluster } from "@/src/lib/news";
import { buildAdditiveUpdatePlan } from "@/src/lib/prompts/builders";
import { applyWorldAddition } from "@/src/lib/image";
import { savePngToStorage } from "@/src/lib/storage";

export const runtime = "nodejs";

type Kind = "world" | "art" | "both";

type UpdateDetail = { type: "world_addition" ; url: string };

type RunUpdateResult = {
  updates_applied: number;
  details: UpdateDetail[];
  message?: string;
};

async function runUpdate(kind: Kind): Promise<RunUpdateResult> {
  const daily = await getLatestDaily();
  if (!daily) {
    return { updates_applied: 0, details: [], message: "No daily painting yet" };
  }

  const baseUrl = daily.final_image_url || daily.base_image_url;
  const baseResp = await fetch(baseUrl);
  if (!baseResp.ok) throw new Error(`Failed to fetch base image: ${baseResp.status}`);
  const baseBuf = new Uint8Array(await baseResp.arrayBuffer());

  const result: RunUpdateResult = {
    updates_applied: 0,
    details: [],
  };

  if (kind === "world" || kind === "both") {
    const world = await fetchWorldNews();
    const wClusters = rankAndCluster(world).filter((c) => c.kind === "world");
    if (wClusters.length) {
      const plan = buildAdditiveUpdatePlan(wClusters[0]);
      const updated = await applyWorldAddition(baseBuf, plan.update_prompt);
      // optional: keep updates under a folder
      const url = await savePngToStorage(`updates/${daily.date}-world-${Date.now()}.png`, updated);
      await insertPaintingUpdate({
        daily_id: daily.id,
        update_type: "world_addition",
        mask_url: null,
        overlay_image_url: url,
        update_prompt: plan as any,
        sources: { world: world.map((i) => i.url) },
        rationale: plan.rationale,
      } as any);
      await updateDailyFinalImage(daily.id, url);
      result.updates_applied++;
      result.details.push({ type: "world_addition", url });
    }
  }

  if (kind === "art" || kind === "both") {
    result.message = 'Art restyle updates are disabled; style is now applied only at initial daily generation.';
  }
  return result;
}

export async function POST(request: NextRequest) {
  // Basic auth (disabled if BASIC_AUTH_USER/PASS are not set)
  const auth = basicAuth(request);
  if (auth) return auth;

  let kind: Kind = "both";
  try {
    const body = (await request.json()) as Partial<{ kind: Kind }>;
    if (body.kind && ["world", "art", "both"].includes(body.kind)) {
      kind = body.kind;
    }
  } catch {
    /* empty/invalid body is fine → default "both" */
  }

  try {
    const res = await runUpdate(kind);
    if (res.updates_applied === 0 && res.message) {
      return NextResponse.json(res, { status: 400 });
    }
    return NextResponse.json(res, { status: 200 });
  } catch (err: any) {
    console.error("[/api/update] error", err);
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
