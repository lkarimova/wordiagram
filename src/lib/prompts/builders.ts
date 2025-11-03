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
    "Favor poetic symbolism: celestial bodies, natural phenomena, mysterious vessels, ethereal creatures, architectural fragments, botanical elements, atmospheric effects.",
    "Avoid literal depictions: no recognizable people, no real country flags (invented symbolic flags are acceptable), no literal war imagery (guns, tanks, arrows), no skulls, no earth globes.",
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
    "flags of real countries, national symbols",
    "literal war imagery, guns, tanks, weapons, arrows, missiles",
    "skulls, skeletons, death imagery",
    "earth globes, world maps, literal geographic representations",
    "graphic violence, medical imagery, disaster photos",
    "oversaturated colors, harsh contrast, dark shadows",
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