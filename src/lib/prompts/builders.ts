import type {
  ComposePromptResult,
  UpdatePlan,
  RestylePlan,
  StyleDescriptor, // kept only for type compatibility in RestylePlan signature
  Cluster,         // kept only for type compatibility in update/restyle plans
} from "../types";

type Strictness = "soft" | "medium" | "hard";

export interface LockSpec {
  aspect?: "2:3";
  camera?: "slight low angle, human eye-height";
  composition?: "central vertical axis, tiered plinths";
  balance?: "asymmetric balance around a central mass";
  space?: "deep atmospheric perspective";
  includeFrame?: boolean;
}

export interface OpenEndedSpec {
  medium?: "oil on canvas" | "watercolor on paper" | "acrylic on canvas" | "pastel on paper" | "mixed media";
  presentation?: "museum-grade";
  styleNote?: "surrealist";
  allowSymbolsHint?:
    | "musical notes ok as abstract glyphs"
    | "geometric shapes ok as abstract symbols"
    | "literary references ok as abstract motifs"
    | "historical figures ok as abstract symbols"
    | "mythological figures ok as abstract symbols"
    | "religious symbols ok as abstract symbols"
    | "political symbols ok as abstract symbols"
    | "cultural symbols ok as abstract symbols"
    | "natural symbols ok as abstract symbols"
    | "abstract symbols ok as abstract symbols";
  negativeRules?: string[];
  strictness?: Strictness;
}
export function buildOpenEndedPrompt(
  locks: LockSpec,
  open: OpenEndedSpec = {}
): string {
  const s = open.strictness ?? "medium";
  const reinforce =
  s === "hard"
    ? "These constraints are mandatory. Do not deviate."
    : s === "medium"
    ? "Prefer these constraints strongly."
    : "Use these as guiding constraints.";

  const negative = [
    "No text, numbers, letters, signage, logos, or flags with readable marks anywhere.",
    "No UI, charts, captions, or watermarks.",
    ...(open.negativeRules ?? []),
  ].join(" ");
  
  return [
    // What the model is making
    `Create a museum-grade ${open.medium ?? "oil on canvas"} painting with an ornate frame inside the image.`,
    `${open.presentation ?? "Polished, fair-booth presentation; subtle impasto; rich surface."}`,
    `${open.styleNote ?? "Classical realism blended with contemporary symbolism."}`,
    
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
    "You may invent symbols and scenes freely as long as composition/perspective/space remain locked.",

    // Guardrails
    open.allowSymbolsHint
      ? `Symbolic glyphs allowed: ${open.allowSymbolsHint} (abstract only; no letters).`
      : "Symbolic glyphs like musical notes are allowed as abstract shapes; avoid any letters.",
    negative,
  ]
    .filter(Boolean)
    .join(" ");
}
export function buildAdditiveUpdatePlan(worldCluster: Cluster): UpdatePlan {
  const srcs = (worldCluster.items ?? []).map((i) => i.url).filter(Boolean).slice(0, 3);
  return {
    update_prompt:
      `Add ONE small, readable symbol for "${worldCluster.title}" in the UPPER third; ` +
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
    blend_details: "60% new influence, 40% prior",
    rationale: "Art-world style update without altering structure.",
    sources: srcs,
  };
}