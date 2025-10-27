// src/server/generation.ts
import { formatInTimeZone } from 'date-fns-tz';
import { config } from '@/lib/config';
import { fetchWorldNews, fetchArtNews, rankAndCluster } from '@/lib/news';
import {
  buildOpenEndedPrompt,
  composeOpenEndedAsResult,
} from '@/lib/prompts/builders';
import { generateDailyBase } from '@/lib/image';
import { savePngToStorage } from '@/lib/storage';
import { insertDailyPainting } from './supabase';

function todayInTimezone(): string {
  const now = new Date();
  return formatInTimeZone(now, config.timezone, 'yyyy-MM-dd');
}

export async function runDailyGeneration() {
  const dateStr = todayInTimezone();

  // 1) Fetch & cluster news
  const world = await fetchWorldNews();
  const art = await fetchArtNews();
  const worldClusters = rankAndCluster(world);
  const artClusters = rankAndCluster(art);

  // Optional: soft “vibes” (no specifics)
  const inspirationTags = [
    ...worldClusters.map((c) => c.title),
    ...artClusters.map((c) => c.title),
  ].slice(0, 8);

  // 2) Build an open-ended prompt (locks structure; model chooses specifics)
  const openEndedPrompt = buildOpenEndedPrompt(
    {
      aspect: '2:3',
      includeFrame: true,
      composition: 'central vertical axis; tiered plinths',
      balance: 'asymmetric balance around a central mass',
      camera: 'slight low angle, human eye height',
      space: 'deep atmospheric perspective',
    },
    {
      strictness: 'medium',
      negativeRules: ['No text anywhere.'],
      // palette: [...] // (optional) soft hint
    }
  );

  // Convert to the { prompt, negative_prompt } shape your image fn expects
  const { prompt: finalPrompt, negative_prompt } =
    composeOpenEndedAsResult(openEndedPrompt);

  // 3) Generate & store image (ensure config.aspect is 2:3, e.g., 1024x1536)
  const image = await generateDailyBase(
    finalPrompt,
    negative_prompt,
    config.aspect.width,
    config.aspect.height
  );

  const imgUrl = await savePngToStorage(`${dateStr}/base.png`, image);

  // 4) Persist metadata (use cluster titles as summaries)
  const world_theme_summary = worldClusters.map((t) => t.title).slice(0, 6).join(', ');
  const art_style_summary = artClusters.map((t) => t.title).slice(0, 6).join(', ');

  const row = await insertDailyPainting({
    date: dateStr,
    base_image_url: imgUrl,
    final_image_url: imgUrl,
    prompt: { prompt: finalPrompt, negative_prompt }, // store exactly what was used
    style_descriptor: {
      descriptor: 'open-ended; model chooses style',
      palette: [],
      references: [],
    },
    world_theme_summary,
    art_style_summary,
    model_info: { model: 'gpt-image-1', aspect: config.aspect },
    sources: { world: world.map((i) => i.url), art: art.map((i) => i.url) },
  } as any);

  return row;
}
