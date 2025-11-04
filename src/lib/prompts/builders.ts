// src/lib/prompts/builders.ts
import type { ComposePromptResult, Cluster } from "../types";
import { config } from "../config";

/**
 * Build a prompt for the daily or breaking news image
 * Uses fixed symbolic style from config, focuses on world news content
 */
export function buildNewsPrompt(worldClusters: Cluster[]): ComposePromptResult {
  // Extract top themes from clusters
  const topThemes = worldClusters.slice(0, 5);
  
  // Create symbolic, metaphorical motifs from news themes
  const motifs = topThemes.map(cluster => {
    const title = cluster.title;
    return `interpret "${title}" through symbolic, dreamlike imagery`;
  }).join(", ");

  const prompt = [
    // Style foundation (symbolic, balanced colors, from config)
    config.style.prompt,
    
    // Structural locks
    "Composition: central vertical axis with layered depth, asymmetric balance around a central mass.",
    "Perspective: slight low angle, human eye height with deep atmospheric perspective.",
    "Aspect ratio: 2:3 portrait orientation (vertical), 1024x1536 pixels.",
    
    // Content from world news - emphasize metaphorical interpretation
    `Visual content: Create a cohesive symbolic painting that ${motifs}.`,
    "Use metaphorical imagery inspired by dreams, myths, folklore, fantasy literature, and cinema.",
    // IMPORTANT: remove specific recurring motifs (mountains, vessels, water, etc.)
    "Favor varied symbolic elements that can change each day: unusual animals, hybrid creatures, surreal architecture, enigmatic objects, abstract shapes, mirrored or fractured forms, and layered atmospheric spaces.",
    "Do not rely repeatedly on the same visual clichés (mountains, lone towers, obvious flags, boats on water, simple celestial orbs). Seek fresh symbolic combinations instead.",
    "CRITICAL: Absolutely no recognizable people, no real country flags (invented abstract flags are acceptable), no literal war imagery (guns, tanks, arrows), no skulls, no earth globes.",
    "Do not depict any flags that exist in reality.",
    "Maintain cultural and political neutrality through symbolic abstraction.",
    
    // Color guidance
    "Select two dominant colors from different color families (warm/cool/earth/jewel tones) and balance with supporting hues across the full spectrum.",
    "Soft, balanced lighting with gentle contrast. Avoid oversaturation.",
    
    // Guardrails
    "No text, logos, numbers, or identifiable people.",
    "No real flags or national symbols.",
    "Focus on dreamlike metaphor and symbolism.",
  ].join(" ");

  const negative_prompt = [
    "text, letters, numbers, captions, UI elements, watermarks, logos",
    "charts, diagrams, graphs, infographics",
    "real identifiable people, photographs of people, portraits, faces",
    "flags, national flags, country flags, state flags, banners with national symbols",
    "real flags of any country including USA, UK, France, Germany, China, Russia, Japan, India, Brazil, etc",    "literal war imagery, guns, tanks, weapons, arrows, missiles",
    "recognizable national symbols, coat of arms, national emblems",
    "literal war imagery, guns, tanks, weapons, arrows, missiles, bombs, explosions",
    "skulls, skeletons, death imagery",
    "earth globes, world maps, literal geographic representations",
    "graphic violence, medical imagery, disaster photos",
    "oversaturated colors, harsh contrast, dark shadows",
    "photorealistic flags, realistic national insignia",
  ].join(", ");

  return { prompt, negative_prompt };
}

/**
 * Generate a human-readable summary of themes from clusters
 */
export function generateThemeSummary(clusters: Cluster[]): string {
  return clusters
    .slice(0, 5)
    .map(c => `${c.title} (${c.items.length} sources)`)
    .join(" • ");
}

/**
 * List headlines for metadata storage
 */
export function listHeadlines(
  items: { title: string; source?: string }[], 
  maxCount: number
): string {
  return items
    .slice(0, maxCount)
    .map(i => {
      const title = (i.title || "").trim();
      const source = (i.source || "").trim();
      const t = title.length > 140 ? title.slice(0, 137) + "…" : title;
      return source ? `${t} — ${source}` : t;
    })
    .join(" · ");
}