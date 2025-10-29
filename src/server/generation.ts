// src/server/generation.ts
import { formatInTimeZone } from "date-fns-tz";
import { config } from "@/lib/config";
import {
  fetchWorldNews,
  fetchArtNews,
  rankAndCluster,
} from "@/lib/news";
import {
  buildOpenEndedPrompt,
  composeOpenEndedAsResult,
} from "@/lib/prompts/builders";
import { generateDailyBase } from "@/lib/image";
import { savePngToStorage } from "@/lib/storage";
import { insertDailyPainting } from "./supabase";

function todayInTimezone(): string {
  const now = new Date();
  return formatInTimeZone(now, config.timezone, "yyyy-MM-dd");
}

function topTitles(items: { title: string }[], n: number): string {
  const pick = items.slice(0, n).map(i => (i.title || "").trim()).filter(Boolean);
  return pick
    .map(t => (t.length > 110 ? t.slice(0, 107) + "…" : t))
    .join(" ; ");
}

export async function runDailyGeneration() {
  const dateStr = todayInTimezone();

  // 1) Fetch & cluster news
  const world = await fetchWorldNews();
  const art = await fetchArtNews();

  console.log("[generate] world count:", world.length);
  console.log("[generate] art count  :", art.length);

  const worldClusters = rankAndCluster(world);
  const artClusters = rankAndCluster(art);

  // 2) Base prompt: locks structure; leaves visuals open-ended
  const basePrompt = buildOpenEndedPrompt(
    {
      aspect: "2:3",
      includeFrame: true,
      composition: "central vertical axis; tiered plinths",
      balance: "asymmetric balance around a central mass",
      camera: "slight low angle, human eye height",
      space: "deep atmospheric perspective",
    },
    {
      strictness: "hard", // structural locks are mandatory
      negativeRules: ["No text, UI, charts, captions, or watermarks."],
    }
  );

  // 3) HARD CONTEXT from concrete story titles (not generic labels)
  const worldHard = topTitles(world, 4);
  const artHard = topTitles(art, 3);

  const hardContext = [
    `HARD CONTEXT — These themes must be interpreted in the image (no text):`,
    `• Today’s world headlines (${dateStr}): ${worldHard || "—"}.`,
    `• Today’s art-world context: ${artHard || "—"}.`,
    `Do not depict written words, numbers, or logos. Do not include flags with readable marks.`,
    `You must reflect these themes, but the specific subjects, palette, era references, and symbols are up to you.`,
  ].join("\n");

  const openEndedPrompt = `${basePrompt}\n${hardContext}`;

  // 4) Convert to the { prompt, negative_prompt } your image fn expects
  const { prompt: finalPrompt, negative_prompt } =
    composeOpenEndedAsResult(openEndedPrompt);

  console.log("[generate] prompt:", finalPrompt);

  // 5) Generate & store image (2:3, 1024x1536)
  const image = await generateDailyBase(
    finalPrompt,
    negative_prompt,
    config.aspect.width,
    config.aspect.height
  );

  const imgUrl = await savePngToStorage(`${dateStr}/base.png`, image);

  // 6) Persist metadata + debug
  const debug = {
    date: dateStr,
    aspect: `${config.aspect.width}x${config.aspect.height}`,
    composer: {
      basePrompt,
      hardContext,
      openEndedPrompt,
      finalPrompt,
      negative_prompt,
    },
    newsSelected: {
      world: world.slice(0, 12).map(i => ({
        title: i.title,
        url: i.url,
        source: i.source,
      })),
      art: art.slice(0, 12).map(i => ({
        title: i.title,
        url: i.url,
        source: i.source,
      })),
    },
    clustersPicked: {
      world: worldClusters.slice(0, 4).map(c => ({
        title: c.title,
        size: c.items.length,
      })),
      art: artClusters.slice(0, 4).map(c => ({
        title: c.title,
        size: c.items.length,
      })),
    },
    generatedAt: new Date().toISOString(),
  };

  // Specific, human-readable summaries (titles, not labels)
  const world_theme_summary = worldHard || "(no world items)";
  const art_style_summary = artHard || "(no art items)";

  const row = await insertDailyPainting({
    date: dateStr,
    base_image_url: imgUrl,
    final_image_url: imgUrl,
    prompt: { prompt: finalPrompt, negative_prompt },
    style_descriptor: {
      descriptor: "open-ended; model chooses style (hard news/art context)",
      palette: [],
      references: [],
    },
    world_theme_summary,
    art_style_summary,
    model_info: { model: "gpt-image-1", aspect: config.aspect, debug },
    // Save real sources for private inspection
    sources: {
      world: world.slice(0, 20).map(i => ({
        title: i.title,
        url: i.url,
        source: i.source,
      })),
      art: art.slice(0, 20).map(i => ({
        title: i.title,
        url: i.url,
        source: i.source,
      })),
    },
  } as any);

  return row;
}
