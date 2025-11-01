// src/server/generation.ts
import { formatInTimeZone } from "date-fns-tz";
import { config } from "@/lib/config";
import { fetchWorldNews, rankAndCluster } from "@/lib/news";
import { buildNewsPrompt, generateThemeSummary, listHeadlines } from "@/lib/prompts/builders";
import { generateDailyBase } from "@/lib/image";
import { savePngToStorage } from "@/lib/storage";
import { insertDailyPainting, getLatestPainting } from "./supabase";

function todayInTimezone(): string {
  const now = new Date();
  return formatInTimeZone(now, config.timezone, "yyyy-MM-dd");
}

function nowTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Daily generation at 6:00 AM ET
 * Creates the baseline image for the day
 */
export async function runDailyGeneration() {
  const dateStr = todayInTimezone();
  console.log("[generate] Starting daily generation for", dateStr);

  // 1) Fetch & cluster world news
  const world = await fetchWorldNews();
  console.log("[generate] world news count:", world.length);

  const worldClusters = rankAndCluster(world);
  console.log("[generate] world clusters:", worldClusters.length);

  // 2) Build prompt from news
  const { prompt, negative_prompt } = buildNewsPrompt(worldClusters);
  console.log("[generate] prompt:", prompt.substring(0, 200) + "...");

  // 3) Generate image (2:3 aspect, 1024x1536)
  const image = await generateDailyBase(
    prompt,
    negative_prompt,
    config.aspect.width,
    config.aspect.height
  );

  // 4) Save to storage
  const imgUrl = await savePngToStorage(`${dateStr}/daily-${Date.now()}.png`, image);
  console.log("[generate] saved image:", imgUrl);

  // 5) Prepare metadata
  const themeSummary = generateThemeSummary(worldClusters);
  const headlinesList = listHeadlines(world, 20);

  const debug = {
    date: dateStr,
    aspect: `${config.aspect.width}x${config.aspect.height}`,
    prompt,
    negative_prompt,
    newsSelected: world.slice(0, 20).map(i => ({
      title: i.title,
      url: i.url,
      source: i.source,
      publishedAt: i.publishedAt,
    })),
    clustersPicked: worldClusters.slice(0, 10).map(c => ({
      title: c.title,
      size: c.items.length,
      score: c.score,
    })),
    generatedAt: nowTimestamp(),
  };

  // 6) Save to database
  const row = await insertDailyPainting({
    date: dateStr,
    image_url: imgUrl,
    prompt: { prompt, negative_prompt },
    world_theme_summary: themeSummary,
    model_info: { 
      model: "gpt-image-1", 
      aspect: config.aspect, 
      debug 
    },
    sources: {
      world: world.slice(0, 20).map(i => ({
        title: i.title,
        url: i.url,
        source: i.source,
      })),
    },
    is_daily: true,
  });

  console.log("[generate] completed, row id:", row.id);
  return row;
}

/**
 * Breaking news generation
 * Creates a completely new image when breaking news is detected
 */
export async function runBreakingGeneration(params: {
  world: any[];
  worldClusters: any[];
  reason: { world: any[] };
}) {
  const dateStr = todayInTimezone();
  const timestamp = nowTimestamp();
  console.log("[breaking] Starting breaking news generation", { dateStr, timestamp });

  const { world, worldClusters, reason } = params;

  // 1) Build prompt highlighting the breaking news
  const breakingClusters = reason.world.map(d => 
    worldClusters.find(c => c.id === d.clusterId)
  ).filter(Boolean);

  const { prompt, negative_prompt } = buildNewsPrompt(breakingClusters.length > 0 ? breakingClusters : worldClusters);
  console.log("[breaking] prompt:", prompt.substring(0, 200) + "...");

  // 2) Generate new image
  const image = await generateDailyBase(
    prompt,
    negative_prompt,
    config.aspect.width,
    config.aspect.height
  );

  // 3) Save to storage with timestamp
  const imgUrl = await savePngToStorage(
    `${dateStr}/breaking-${Date.now()}.png`, 
    image
  );
  console.log("[breaking] saved image:", imgUrl);

  // 4) Prepare metadata
  const themeSummary = generateThemeSummary(breakingClusters.length > 0 ? breakingClusters : worldClusters);

  const debug = {
    date: dateStr,
    timestamp,
    type: "breaking",
    aspect: `${config.aspect.width}x${config.aspect.height}`,
    prompt,
    negative_prompt,
    breakingReason: reason,
    newsSelected: world.slice(0, 20).map(i => ({
      title: i.title,
      url: i.url,
      source: i.source,
      publishedAt: i.publishedAt,
    })),
    clustersPicked: worldClusters.slice(0, 10).map(c => ({
      title: c.title,
      size: c.items.length,
      score: c.score,
    })),
    generatedAt: timestamp,
  };

  // 5) Save to database
  const row = await insertDailyPainting({
    date: dateStr,
    image_url: imgUrl,
    prompt: { prompt, negative_prompt },
    world_theme_summary: `BREAKING: ${themeSummary}`,
    model_info: { 
      model: "gpt-image-1", 
      aspect: config.aspect, 
      debug 
    },
    sources: {
      world: world.slice(0, 20).map(i => ({
        title: i.title,
        url: i.url,
        source: i.source,
      })),
    },
    is_daily: false,
  });

  console.log("[breaking] completed, row id:", row.id);
  return row;
}