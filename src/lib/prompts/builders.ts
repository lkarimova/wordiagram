// src/lib/prompts/builders.ts
import type { ComposePromptResult, Cluster } from "../types";
import { config } from "../config";

/**
 * Build a prompt for the daily or breaking news image
 * Uses fixed style from config, focuses on world news content
 */
export function buildNewsPrompt(worldClusters: Cluster[]): ComposePromptResult {
  // Extract top themes from clusters
  const topThemes = worldClusters.slice(0, 5);
  
  // Create visual motifs from news themes
  const motifs = topThemes.map(cluster => {
    const title = cluster.title;
    return `symbolically represent "${title}" through abstract visual elements`;
  }).join(", ");

  const prompt = [
    // Style foundation (fixed from config)
    config.style.prompt,
    
    // Structural locks
    "Composition: central vertical axis with layered depth, asymmetric balance around a central mass.",
    "Perspective: slight low angle, human eye height with deep atmospheric perspective.",
    "Aspect ratio: 2:3 portrait orientation (vertical), 1024x1536 pixels.",
    
    // Content from world news
    `Visual content: Create a cohesive painting that ${motifs}.`,
    "Use symbolic objects, scenes, colors, and metaphorical imagery.",
    "Maintain cultural neutrality and avoid literal disaster depictions.",
    
    // Guardrails
    "No text, logos, numbers, or identifiable people.",
    "No flags unless globally relevant.",
    "Focus on metaphor and symbolism over photorealism.",
  ].join(" ");

  const negative_prompt = [
    "text, letters, numbers, captions, UI elements, watermarks, logos",
    "charts, diagrams, graphs, infographics",
    "real identifiable people, photographs of people",
    "flags, national symbols",
    "graphic violence, medical imagery, disaster photos",
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