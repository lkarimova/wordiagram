// src/server/generation.ts
import { formatInTimeZone } from "date-fns-tz";
import { config } from "@/lib/config";
import { fetchWorldNews, rankAndCluster, dedupeOverlappingClusters } from "@/lib/news";
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

const MIN_CLUSTERS_FOR_PROMPT = 10; // same number as in buildNewsPrompt

// Select top-N news items across clusters, ranked by their cluster's score (desc),
// de-duplicated by URL to avoid repeats from overlapping feeds.
function selectTopItemsByClusterScore(
  clusters: Array<{ items: any[]; score?: number }>,
  topN: number
) {
  const seen = new Set<string>();
  const withScores: Array<{ item: any; clusterScore: number }> = [];
  for (const c of clusters) {
    const s = Number(c.score ?? 0);
    for (const it of c.items || []) {
      const url = it?.url;
      if (!url || seen.has(url)) continue;
      seen.add(url);
      withScores.push({ item: it, clusterScore: s });
    }
  }
  withScores.sort((a, b) => b.clusterScore - a.clusterScore);
  return withScores.slice(0, topN).map(x => x.item);
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
  const worldClustersRaw = await rankAndCluster(world);
  console.log("[generate] world clusters (raw):", worldClustersRaw.length);

  // Remove any internal overlaps (no breaking set here, so pass [])
  const { existing: deduped } = dedupeOverlappingClusters([], worldClustersRaw);
  console.log("[generate] world clusters (deduped):", deduped.length);

  // SAFETY: if dedupe collapses too much, fall back to raw clusters
  const worldClusters =
    deduped.length >= MIN_CLUSTERS_FOR_PROMPT ? deduped : worldClustersRaw;
  console.log("[generate] world clusters (used for prompt):", worldClusters.length);

  // 2) Build prompt from final clusters
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
  const summaryClusters = worldClusters.slice(0, 10);
  const themeSummary = generateThemeSummary(summaryClusters);
  const headlinesList = listHeadlines(world, 20);

  const debug = {
    date: dateStr,
    aspect: `${config.aspect.width}x${config.aspect.height}`,
    prompt,
    negative_prompt,
    clusterDebug: {
      mode: "daily",
      counts: {
        raw: worldClustersRaw.length,
        deduped: deduped.length,
        usedForPrompt: worldClusters.length,
      },
      usedTitles: worldClusters.slice(0, 20).map(c => (c.title || "").trim()),
      thresholds: {
        rankAndClusterSimilarity: 0.3, // see news/index.ts similarityThreshold
        dedupe: {
          jaccard: 0.3,       // default in dedupeOverlappingClusters
          centroidSim: 0.85,  // default in dedupeOverlappingClusters
        },
        minClustersForPrompt: MIN_CLUSTERS_FOR_PROMPT,
      },
    },
    newsSelected: selectTopItemsByClusterScore(summaryClusters, 20).map(i => ({
      title: i.title,
      url: i.url,
      source: i.source,
      publishedAt: i.publishedAt,
    })),
    clustersPicked: summaryClusters.map(c => ({
      title: c.title,
      size: c.items.length,
      score: c.score,
    })),
    generatedAt: nowTimestamp(),
  };

  // Build sources list from the same clusters used in the summary/debug (top by cluster score)
  const summaryWorldItems: any[] = selectTopItemsByClusterScore(summaryClusters, 20);

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
      world: summaryWorldItems.map(i => ({
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

  // 1) Identify breaking clusters
  const breakingClusters = reason.world
    .map(d => worldClusters.find(c => c.id === d.clusterId))
    .filter(Boolean);

  // 2) Build merged cluster list for metadata/UI (breaking first, then others)
  const breakingIds = new Set(breakingClusters.map(c => c.id));
  const worldNonBreaking = worldClusters.filter(c => !breakingIds.has(c.id));

  const mergedClusters = [
    ...breakingClusters,
    ...worldNonBreaking,
  ];

  // 3) Decide which clusters feed the prompt
  //    - Use *all* breaking clusters
  //    - Optionally top-off with some world clusters up to a soft cap
  const MAX_PROMPT_CLUSTERS = 10;

  let promptClusters: typeof worldClusters;

  if (breakingClusters.length === 0) {
    // Fallback: no specific breaking clusters; just use top N world clusters
    promptClusters = worldClusters.slice(0, MAX_PROMPT_CLUSTERS);
  } else if (breakingClusters.length >= MAX_PROMPT_CLUSTERS) {
    // Lots of breaking clusters → use ALL of them (no cap)
    // (You can change this if you want a hard cap)
    promptClusters = breakingClusters;
  } else {
    // Use all breaking + enough world clusters to reach the cap
    const extraNeeded = MAX_PROMPT_CLUSTERS - breakingClusters.length;
    const extraWorld = worldNonBreaking.slice(0, extraNeeded);
    promptClusters = [...breakingClusters, ...extraWorld];
  }

  // Prompt now sees "as many breaking as possible", then global context if needed
  const { prompt, negative_prompt } = buildNewsPrompt(promptClusters);
  console.log("[breaking] prompt:", prompt.substring(0, 200) + "...");

  // 4) Generate image
  const image = await generateDailyBase(
    prompt,
    negative_prompt,
    config.aspect.width,
    config.aspect.height
  );

  // 5) Save to storage with timestamp
  const imgUrl = await savePngToStorage(
    `${dateStr}/breaking-${Date.now()}.png`,
    image
  );
  console.log("[breaking] saved image:", imgUrl);

  // 6) Summary for UI: still safe to keep at 10 lines
  const summaryClusters = mergedClusters.slice(0, 10);
  const baseSummary = generateThemeSummary(summaryClusters);
  const themeSummary = `BREAKING: ${baseSummary}`;

  const debug = {
    date: dateStr,
    timestamp,
    type: "breaking",
    aspect: `${config.aspect.width}x${config.aspect.height}`,
    prompt,
    negative_prompt,
    clusterDebug: {
      mode: "breaking",
      counts: {
        totalWorldClusters: worldClusters.length,
        breaking: breakingClusters.length,
        mergedForUi: mergedClusters.length,
        usedForPrompt: promptClusters.length,
      },
      breakingTitles: breakingClusters.slice(0, 50).map(c => (c.title || "").trim()),
      promptTitles: promptClusters.slice(0, 50).map(c => (c.title || "").trim()),
      promptBreakdown: {
        breakingIncluded: promptClusters.filter(c => breakingClusters.some(b => b.id === c.id)).length,
        worldIncluded: promptClusters.filter(c => !breakingClusters.some(b => b.id === c.id)).length,
      },
      thresholds: {
        minBreakingClusters: config.breakingRules.world.minBreakingClusters ?? 1,
        rankAndClusterSimilarity: 0.3, // see news/index.ts similarityThreshold
      },
    },
    breakingReason: reason,
    newsSelected: selectTopItemsByClusterScore(summaryClusters, 20).map(i => ({
      title: i.title,
      url: i.url,
      source: i.source,
      publishedAt: i.publishedAt,
    })),
    clustersPicked: summaryClusters.map(c => ({
      title: (c.title || "").trim(),
      size: c.items.length,
      score: c.score,
    })),
    generatedAt: timestamp,
  };

  // Build sources list from the same clusters used in the summary/debug (top by cluster score)
  const summaryWorldItems: any[] = selectTopItemsByClusterScore(summaryClusters, 20);

  // 5) Save to database
  const row = await insertDailyPainting({
    date: dateStr,
    image_url: imgUrl,
    prompt: { prompt, negative_prompt },
    world_theme_summary: themeSummary,
    model_info: {
      model: "gpt-image-1",
      aspect: config.aspect,
      debug,
    },
    sources: {
      world: summaryWorldItems.map(i => ({
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