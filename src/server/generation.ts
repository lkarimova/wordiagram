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

  // Curate concise “hard” context lists to keep prompts short & focused
  const worldHard = worldClusters.slice(0, 6).map(c => c.title).join(', ');
  const artHard   = artClusters.slice(0, 4).map(c => c.title).join(', ');

  // 2) Base prompt: locks structure; leaves visuals open-ended
  const basePrompt = buildOpenEndedPrompt(
    {
      aspect: '2:3',
      includeFrame: true,
      composition: 'central vertical axis; tiered plinths',
      balance: 'asymmetric balance around a central mass',
      camera: 'slight low angle, human eye height',
      space: 'deep atmospheric perspective',
    },
    {
      strictness: 'hard',                 // structural locks are mandatory
      negativeRules: ['No text anywhere.']
    }
  );

  // 3) Append HARD CONTEXT (mandatory themes; interpretation is open)
  const hardContext = [
    `HARD CONTEXT — These themes must be interpreted in the image (no text):`,
    `• Today’s world headlines (${dateStr}): ${worldHard}.`,
    `• Today’s art-world context: ${artHard}.`,
    `Do not depict written words, numbers, or logos. Do not include flags with readable marks.`,
    `You must reflect these themes, but the specific subjects, palette, era references, and symbols are up to you.`,
    `If a listed theme cannot be represented without text, use a culturally neutral symbolic substitute.`
  ].join('\n');

  const openEndedPrompt = `${basePrompt}\n${hardContext}`;

  // Convert to the { prompt, negative_prompt } your image fn expects
  const { prompt: finalPrompt, negative_prompt } =
    composeOpenEndedAsResult(openEndedPrompt);

  // 4) Generate & store image (ensure config.aspect is 2:3, e.g., 1024x1536)
  const image = await generateDailyBase(
    finalPrompt,
    negative_prompt,
    config.aspect.width,
    config.aspect.height
  );

  const imgUrl = await savePngToStorage(`${dateStr}/base.png`, image);

  // 5) Persist metadata
  const world_theme_summary = worldClusters.map(t => t.title).slice(0, 6).join(', ');
  const art_style_summary   = artClusters.map(t => t.title).slice(0, 6).join(', ');

  const row = await insertDailyPainting({
    date: dateStr,
    base_image_url: imgUrl,
    final_image_url: imgUrl,
    prompt: { prompt: finalPrompt, negative_prompt },
    style_descriptor: {
      descriptor: 'open-ended; model chooses style (hard news/art context)',
      palette: [],
      references: [],
    },
    world_theme_summary,
    art_style_summary,
    model_info: { model: 'gpt-image-1', aspect: config.aspect },
    sources: { world: world.map(i => i.url), art: art.map(i => i.url) },
  } as any);

  return row;
}
