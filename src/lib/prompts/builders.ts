// src/lib/prompts/builders.ts
import type { ComposePromptResult, Cluster } from "../types";

/**
 * Base style prompt for all news images.
 * Single source of truth lives here (not in config.ts).
 */
const BASE_STYLE_PROMPT = [
  "Symbolic oil painting with dreamlike, mythological imagery.",
  "Use two dominant colors (varied each time - choose from warm tones, cool tones, earth tones, or jewel tones) balanced with a full spectrum of supporting hues.",
  "Soft, diffused lighting with gentle contrast. Rich impasto texture.",
  "Draw inspiration from surrealist dreams, mythology, folklore, fantasy literature, and cinematic symbolism.",
  "Favor poetic symbolism: objects, colors, animals, settings, and/or characters, derived from the news themes; atmospheric effects.",
  "Do not rely repeatedly on the same visual clichés. Seek fresh symbolic combinations instead.",
  "CRITICAL: Absolutely no recognizable people, no real country flags, no literal war imagery (guns, tanks, arrows), no skulls, no earth globes.",
  "Museum-quality presentation with ornate frame."
].join(" ");

// Soften harsher headline language into more conceptual phrasing for the image prompt.
// Returns a cleaned title, or null if the whole thing should be omitted.
function softenTitleForPrompt(title: string): string | null {
  if (!title) return null;

  // Known harsh terms and what to do with them:
  // - string => replace with that phrase
  // - null   => drop the word entirely
  const HARSH_MAP: Record<string, string | null> = {
    // very strong / graphic-ish
    "massacre": "a deadly attack",
    "massacres": "deadly attacks",
    "genocide": "attempts to destroy a group",
    "murder": "killing",
    "murders": "killings",

    // killing / death
    "killed": "lost their lives",
    "killing": "loss of life",
    "kills": "loss of life",
    "slain": "lost their lives",
    "dead": "fatalities",
    "deaths": "loss of life",

    // attacks / strikes
    "attack": "a violent incident",
    "attacks": "violent incidents",
    "attacked": "hit by violence",
    "bombing": "an explosion",
    "bombings": "explosions",
    "bomb": "an explosive device",
    "bombs": "explosive devices",
    "explosion": "a destructive blast",
    "explosions": "destructive blasts",
    "airstrike": "an air attack",
    "airstrikes": "air attacks",
    "shelling": "heavy fire",

    // abuse / torture
    "abuse": "mistreatment",
    "abused": "severely mistreated",
    "abusing": "severe mistreatment",
    "torture": "severe mistreatment",
    "tortured": "severely mistreated",
    "torturing": "severe mistreatment",

    // terror / extremist
    "terror": "extremist violence",
    "terrorism": "extremist violence",
    "terrorist": "extremist group",
    "terrorists": "extremist groups",

    // hostages / kidnapping
    "hostage": "captive",
    "hostages": "captives",
    "kidnap": "abduction",
    "kidnapped": "abducted",
    "kidnapping": "abduction",
    "kidnappings": "abductions",

    // if you want to *remove* certain words entirely, map to null
    // e.g. "rape": null,
  };

  // Words that we consider "too harsh to bother with" and just drop,
  // *even if* they appear in some unexpected form. Broad pattern.
  const FORCE_DROP = [
    /\brape(d|s|ing)?\b/i,
  ];

  // Early skip: if the whole title is dominated by something we don't want to touch,
  // you can choose to skip it entirely:
  if (FORCE_DROP.some((re) => re.test(title))) {
    return null;
  }

  // Tokenize on spaces, keep punctuation loosely attached for readability
  const rawWords = title.split(/\s+/).filter(Boolean);
  const softenedWords: string[] = [];

  for (const raw of rawWords) {
    // Normalize for matching: strip punctuation around the word
    const core = raw.toLowerCase().replace(/^[^\w]+|[^\w]+$/g, "");

    if (!core) {
      softenedWords.push(raw);
      continue;
    }

    const mapped = HARSH_MAP[core];

    if (mapped === null) {
      // Explicitly drop this word (too harsh, no replacement)
      continue;
    }

    if (typeof mapped === "string") {
      // Replace with conceptual phrase; keep punctuation from original if you want,
      // but simplest is just push the replacement as a separate token.
      softenedWords.push(mapped);
    } else {
      // Not in the harsh map: keep the word as-is
      softenedWords.push(raw);
    }
  }

  const result = softenedWords.join(" ").trim();

  // If the result is too short or almost empty, skip this cluster entirely.
  const wordCount = result.split(/\s+/).filter(Boolean).length;
  if (!result || wordCount < 3) {
    return null;
  }

  return result;
}

/**
 * Build a prompt for the daily or breaking news image
 * Uses fixed symbolic style, focuses on world news content
 */
export function buildNewsPrompt(worldClusters: Cluster[]): ComposePromptResult {
  // Extract top themes from clusters
  const topThemes = worldClusters.slice(0, 5);
  
  // Create symbolic, metaphorical motifs from news themes
  const motifs = topThemes
    .map(cluster => {
      const rawTitle = cluster.title || "";
      const safeTitle = softenTitleForPrompt(rawTitle);
      if (!safeTitle) return null;
      return `interpret "${safeTitle}" through symbolic, dreamlike imagery`;
    })
    .filter(Boolean)
    .join(", ");

  const prompt = [
    // Style foundation (symbolic, balanced colors)
    BASE_STYLE_PROMPT,
    
    // Structural locks
    "Composition: central vertical axis with layered depth, asymmetric balance around a central mass.",
    "Perspective: slight low angle, human eye height with deep atmospheric perspective.",
    "Aspect ratio: 2:3 portrait orientation (vertical), 1024x1536 pixels.",
    
    // Content from world news - emphasize metaphorical interpretation
    motifs
    ? `Visual content: Create a cohesive symbolic painting that ${motifs}.`,
    : "Use metaphorical imagery inspired by dreams, myths, folklore, fantasy literature, and cinema.",
    "Favor poetic symbolism: objects, colors, animals, plants, settings, and/or characters, derived from the news themes; atmospheric effects.",
    "Do not rely repeatedly on the same visual clichés. Seek fresh symbolic combinations instead.",
    "CRITICAL: Absolutely no recognizable people, no real country flags, no literal war imagery (guns, tanks, arrows), no skulls, no earth globes.",
    "Maintain cultural and political neutrality through symbolic abstraction.",
    
    // Color guidance
    "Select two dominant colors from different color families (warm/cool/earth/jewel tones) and balance with supporting hues across the full spectrum.",
    "Use varied colors each time.",
    "Balance the colors with supporting hues across the full spectrum.",
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
    "real flags of any country including USA, UK, France, Germany, China, Russia, Japan, India, Brazil, etc",
    "literal war imagery, guns, tanks, weapons, arrows, missiles",
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