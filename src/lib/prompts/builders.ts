// src/lib/prompts/builders.ts
import type {
  Cluster,
  StyleDescriptor,
  ComposePromptResult,
  UpdatePlan,
  RestylePlan,
} from "../types";

/** ─────────────────────────────────────────────────────────────────────────────
 * 1) CONTENT MOTIFS
 * Bias keywords toward short, concrete terms so symbols feel natural.
 * ────────────────────────────────────────────────────────────────────────────*/
export function buildContentMotifs(
  clusters: Array<{ title: string; keywords?: string[] }>
) {
  const themes = clusters.map((c) => ({
    title: c.title,
    keywords: (c.keywords ?? [])
      .filter((k) => k && k.split(" ").length <= 2)
      .slice(0, 6),
  }));
  return { themes };
}

/** ─────────────────────────────────────────────────────────────────────────────
 * 2) STYLE DESCRIPTOR
 * Blend prior (40%) with fresh art-news (60%).
 * ────────────────────────────────────────────────────────────────────────────*/
export function buildStyleDescriptor(
  artClusters: Cluster[],
  prior?: StyleDescriptor
): StyleDescriptor {
  const base: StyleDescriptor = {
    descriptor:
      "scenic genre painting with impasto texture and archival grain",
    palette: ["#4b6cc1", "#e2c290", "#1a1a1a", "#f2efe9", "#dc143c", "#ff8c42", "#ffd700", "#ff6b6b", "#0047ab", "#50c878", "#7851a9", "#40e0d0", "#ff00ff", "#32cd32", "#ff69b4", "#ff4500"],
    references: ["metaphorical landscapes", "abstract scenes", "surrealist compositions"],
  };

  if (!prior) return base;

  const ratio = { previous: 0.4, news: 0.6 };
  return {
    descriptor: `${Math.round(ratio.previous * 100)}% ${prior.descriptor} blended with ${Math.round(ratio.news * 100)}% ${base.descriptor}`,
    palette: Array.from(new Set([...(prior.palette || []), ...base.palette])).slice(
      0,
      6
    ),
    references: Array.from(
      new Set([...(prior.references || []), ...(base.references || [])])
    ),
    blendRatio: ratio,
  };
}

/** ─────────────────────────────────────────────────────────────────────────────
 * 3) SYMBOL SUGGESTION LIB + PICKER
 * You can disable suggestions entirely (see composePaintingPrompt options).
 * ────────────────────────────────────────────────────────────────────────────*/
const SYMBOL_LIB: Record<string, string[]> = {
  conflict: ["olive branch", "paper crane", "broken laurel", "fractured globe"],
  diplomacy: ["bridge", "interlaced hands", "signed parchment", "scales of justice"],
  economy: ["weighing scales", "coin stack", "abacus", "rising staircase"],
  markets: ["bull silhouette", "bear silhouette", "ticker ribbon", "hourglass"],
  technology: ["microchip", "satellite", "antenna mast", "network lattice"],
  energy: ["oil lamp", "wind turbine", "solar disc", "power plug"],
  climate: ["melting hourglass", "glacier shard", "withered leaf", "thermometer"],
  migration: ["compass", "suitcase", "paper boat", "footprints"],
  health: ["stethoscope", "red-cross lantern", "heartbeat line", "mask"],
  art: ["easel", "palette", "gallery plinth", "unrolled canvas"],
  law: ["gavel", "column", "scales of justice", "scroll"],
  finance: ["gold bar", "safe door", "ledger", "bank façade"],
  europe: ["circle of stars", "arched window", "laurel ring"],
  asia: ["pagoda roof", "folding fan", "paper lantern"],
  americas: ["eagle feather", "compass rose", "wheat sheaf"],
};

function pickSymbols(themes: string[], max = 10): string[] {
  const bag: string[] = [];
  for (const t of themes) {
    const key = t.toLowerCase();
    for (const k of Object.keys(SYMBOL_LIB)) {
      if (key.includes(k)) {
        for (const s of SYMBOL_LIB[k]) {
          if (!bag.includes(s)) bag.push(s);
          if (bag.length >= max) return bag;
        }
      }
    }
  }
  return bag.slice(0, max);
}

/** ─────────────────────────────────────────────────────────────────────────────
 * 4) COMPOSE PAINTING PROMPT
 * Target: strong symbolism, clear hierarchy, medium-high object density.
 *
 * Toggle symbol suggestions:
 *  - Default: 'suggest' (we list specific symbols)
 *  - Set env SYMBOL_STRATEGY='model' to let the model choose symbols
 *    or call composePaintingPrompt(..., { symbolStrategy: 'model' })
 * ────────────────────────────────────────────────────────────────────────────*/
type SymbolStrategy = "suggest" | "model";
const ENV_SYMBOL_STRATEGY = (process.env.SYMBOL_STRATEGY ??
  "suggest") as SymbolStrategy;

export function composePaintingPrompt(
  motifs: ReturnType<typeof buildContentMotifs>,
  style: ReturnType<typeof buildStyleDescriptor>,
  options?: { symbolStrategy?: SymbolStrategy; density?: { min?: number; max?: number } }
): ComposePromptResult {
  const symbolStrategy = options?.symbolStrategy ?? ENV_SYMBOL_STRATEGY;
  const densityMin = Math.max(7, options?.density?.min ?? 9);
  const densityMax = Math.max(densityMin, options?.density?.max ?? 12);

  const themes = (motifs?.themes ?? []).map((t) => t.title);
  const styleDescriptor = style?.descriptor ?? "contemporary painterly";

  // Planned structure: 1 centerpiece + 2 anchors + (density-3) small symbols
  const plannedTotal = Math.min(densityMax, Math.max(densityMin, 10));
  const smallCount = Math.max(4, plannedTotal - 3);

  let symbolLine = "Include 6–10 recognizable symbolic elements (no text).";
  let symbolList: string[] = [];

  if (symbolStrategy === "suggest") {
    const candidates = pickSymbols(themes, 12);
    const centerpiece = candidates[0] ?? "scales of justice";
    const anchors = [candidates[1] ?? "gold bar", candidates[2] ?? "gavel"];
    const smalls = candidates.slice(3, 3 + smallCount);
    symbolList = [centerpiece, ...anchors, ...smalls];

    symbolLine =
      `Symbols (examples; model may adapt to composition): ` +
      symbolList.join(", ") +
      `.`;
  }

  const densityNote = `Object density: ${plannedTotal}±1 items total (1 centerpiece, 2 anchors, ${smallCount}±1 small symbols).`;

  const composition = [
    `Structured, poster/altarpiece layout with ornamental borders.`,
    `Foreground: single **centerpiece** large and readable.`,
    `Midground: two **anchors** left/right to balance.`,
    `Background: ${Math.max(3, Math.min(6, smallCount))}–6 **smaller symbols** arranged in bands or niches.`,
    `Clear silhouettes; negative space around centerpiece; avoid clutter.`,
  ].join(" ");

  const symbolism = [
    `Symbols must be recognizable at a glance (not melted into abstraction).`,
    `Culturally neutral; no specific national flags unless globally relevant.`,
  ].join(" ");

  const rendering = [
    `Painterly texture with subtle impasto and archival grain.`,
    `Controlled palette; gentle directional light leading the eye.`,
    `Style: ${styleDescriptor}.`,
  ].join(" ");

  const basePrompt = [
    `A museum-grade **symbolic** painting (portrait 2:3), framed with ornamental borders.`,
    densityNote,
    composition,
    symbolLine,
    symbolism,
    rendering,
    `Themes to interpret: ${themes.length ? themes.join(", ") : "today's global headlines"}.`,
  ].join(" ");

  const checklist =
    `Checklist (render visually, no text): [centerpiece ✓] [anchor L ✓] [anchor R ✓] [${smallCount} small symbols ✓].`;

  const control = [
    `Hierarchy: 1) centerpiece, 2) anchors, 3) small symbols.`,
    `Place elements on rule-of-thirds; keep frame margins clean.`,
    `Maintain legible silhouettes; avoid micro-details that break forms.`,
  ].join(" ");

  const negative =
    "illegible symbolism, over-abstraction, photorealism, nudity, graphic harm, text, logos, gore, private persons";

  return {
    prompt: `${basePrompt}\n${checklist}\nControl: ${control}`,
    negative_prompt: negative,
  };
}

/** ─────────────────────────────────────────────────────────────────────────────
 * 5) UPDATE PLANS
 * Additive (world) and restyle (art) prompts for /api/update flows.
 * ────────────────────────────────────────────────────────────────────────────*/
export function buildAdditiveUpdatePlan(worldCluster: Cluster): UpdatePlan {
  const srcs = (worldCluster.items ?? []).map((i) => i.url).filter(Boolean).slice(0, 3);
  return {
    update_prompt: `Add ONE small, readable symbol for "${worldCluster.title}" in the UPPER third, harmonized palette, do not obscure centerpiece or anchors.`,
    suggested_mask: undefined,
    rationale: "Breaking world event — additive only; keep composition balanced.",
    sources: srcs,
  };
}

export function buildRestylePlan(
  artCluster: Cluster,
  prior: StyleDescriptor
): RestylePlan {
  const srcs = (artCluster.items ?? []).map((i) => i.url).filter(Boolean).slice(0, 3);
  return {
    restyle_prompt:
      `Restyle with "${artCluster.title}" influence while preserving all content; adjust palette/brushwork per latest art headlines.`,
    blend_details: "60% new influence, 40% prior",
    rationale: "Breaking art-world style update.",
    sources: srcs,
  };
}