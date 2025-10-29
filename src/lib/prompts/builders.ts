import type {
  ComposePromptResult,
  UpdatePlan,
  RestylePlan,
  StyleDescriptor, // for RestylePlan signature
  Cluster,         // for update/restyle plans
} from "../types";

type Strictness = "soft" | "medium" | "hard";

export interface LockSpec {
  aspect?: "2:3";
  camera?: string;        // was a single literal; widen to string
  composition?: string;   // widen to string
  balance?: string;       // widen to string
  space?: string;         // widen to string
  includeFrame?: boolean;
}

export interface OpenEndedSpec {
  medium?:  
  | "oil on canvas"
  | "acrylic on canvas"
  | "watercolor on paper"
  | "pastel on paper"
  | "ink on paper"
  | "mixed media"
  | (string & {});        // e.g., "oil on canvas"
  presentation?: "museum-grade" | "gallery" | "studio" | (string & {});  // e.g., "museum-grade"
  styleNote?: string;     // e.g., "surrealist"
  allowSymbolsHint?: string;
  negativeRules?: ["No text, UI, charts, captions, or watermarks."];
  strictness: "hard";
}

/** Build an open-ended prompt that locks structure & aspect, lets the model decide specifics. */
export function buildOpenEndedPrompt(
  locks: LockSpec,
  open: OpenEndedSpec = {strictness: "hard"}
): string {
  const s = open.strictness ?? "medium";
  const reinforce =
    s === "hard"
      ? "These constraints are mandatory. Do not deviate."
      : s === "medium"
      ? "Prefer these constraints strongly."
      : "Use these as guiding constraints.";

  const negative = [
    "No text anywhere.",
    "No UI, charts, captions, or watermarks.",
    ...(open.negativeRules ?? []),
  ].join(" ");

  return [
    // What the model is making
    `Create a museum-grade ${open.medium ?? "oil on canvas"} painting with an ornate frame inside the image.`,
    `${open.presentation ?? "Polished, fair-booth presentation; subtle impasto; rich surface."}`,
    `${open.styleNote ?? "Classical realism blended with contemporary symbolism and surrealism."}`,

    // HARD/SOFT locks: composition & camera/space
    `COMPOSITION LOCKS — ${reinforce}`,
    locks.composition ? `• Composition: ${locks.composition}.` : "",
    locks.balance ? `• Balance: ${locks.balance}.` : "",
    locks.camera ? `• Camera/Perspective: ${locks.camera}.` : "",
    locks.space ? `• Space/Depth: ${locks.space}.` : "",
    locks.includeFrame === false ? "• Exclude frame." : "• Include the frame as part of the composition.",
    "• Target aspect ratio 2:3 (vertical). Maintain this geometry.",

    // Keep it open-ended
    "OPEN CHOICES — The model chooses subject matter, palette, motifs, era references, and lighting.",
    "You may choose symbols and scenes freely as long as composition/perspective/space remain locked.",

    // Guardrails
    open.allowSymbolsHint
      ? `Symbolic glyphs allowed: ${open.allowSymbolsHint} (abstract only; no letters).`
      : "Symbolic glyph are allowed as abstract shapes; avoid any letters.",
    negative,
  ]
    .filter(Boolean)
    .join(" ");
}

/** Adapter: return the shape your image pipeline expects */
export function composeOpenEndedAsResult(prompt: string): ComposePromptResult {
  return {
    prompt,
    negative_prompt:
      "text, UI, captions, watermarks, charts, diagrams",
  };
}

export function buildAdditiveUpdatePlan(worldCluster: Cluster): UpdatePlan {
  const srcs = (worldCluster.items ?? []).map((i) => i.url).filter(Boolean).slice(0, 3);
  return {
    update_prompt:
      `Add ONE large, readable symbol for "${worldCluster.title}" in the UPPER third; ` +
      `harmonize palette; do NOT obscure the central axis or anchors; keep 2:3 aspect; ` +
      `avoid any text or letters.`,
    suggested_mask: undefined,
    rationale: "Breaking world event — additive only; respect composition/perspective/space locks.",
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
      `Restyle with "${artCluster.title}" influence while preserving all content and the locked composition, perspective, and space; ` +
      `maintain 2:3 aspect; avoid any text.`,
    blend_details: "80% new influence, 20% prior",
    rationale: "Art-world style update without altering structure.",
    sources: srcs,
  };
}
