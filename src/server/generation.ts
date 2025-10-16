import { formatInTimeZone } from 'date-fns-tz';
import { config } from '@/lib/config';
import { fetchWorldNews, fetchArtNews, rankAndCluster } from '@/lib/news';
import { buildContentMotifs, buildStyleDescriptor, composePaintingPrompt } from '@/lib/prompts/builders';
import { generateDailyBase } from '@/lib/image';
import { savePngToStorage } from "@/lib/storage";
import { insertDailyPainting } from './supabase';


function todayInTimezone(): string {
  const now = new Date();
  return formatInTimeZone(now, config.timezone, 'yyyy-MM-dd');
}

export async function runDailyGeneration() {
  const dateStr = todayInTimezone();
  const world = await fetchWorldNews();
  const art = await fetchArtNews();
  const worldClusters = rankAndCluster(world);
  const artClusters = rankAndCluster(art);
  const motifs = buildContentMotifs(worldClusters);
  const style = buildStyleDescriptor(artClusters);
  const composed = composePaintingPrompt(motifs, style);

  const image = await generateDailyBase(composed.prompt, composed.negative_prompt, config.aspect.width, config.aspect.height);
  const imgUrl = await savePngToStorage(`${dateStr}/base.png`, image);

  const row = await insertDailyPainting({
    date: dateStr,
    base_image_url: imgUrl,
    prompt: composed as any,
    style_descriptor: style as any,
    world_theme_summary: motifs.themes.map(t => t.title).join(', '),
    art_style_summary: style.descriptor,
    model_info: { model: 'gpt-image-1', aspect: config.aspect },
    sources: { world: world.map(i => i.url), art: art.map(i => i.url) },
    final_image_url: imgUrl,
  } as any);
  return row;
}
