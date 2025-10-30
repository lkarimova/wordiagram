import type {
  ComposePromptResult,
  UpdatePlan,
  RestylePlan,
  StyleDescriptor, // for RestylePlan signature
  Cluster,         // for update/restyle plans
} from "../types";

type Strictness = "soft" | "medium" | "hard";

type StyleSpec = {
  medium: string;          // e.g., "oil on canvas"
  texture: string;         // e.g., "impasto brushwork" | "paper grain"
  palette: string[];       // array of HEX strings
  descriptor: string;      // one-line style phrase
};

const STYLE_RULES = [
  { k: /watercolor|aquarelle/i,  medium: "watercolor on cotton paper", texture: "paper grain, wet-into-wet blooms",
    palette: ["#274060","#5983B0","#D9E4EC","#F2D6B3","#BF8C60"], descriptor: "delicate watercolor with atmospheric washes" },
  { k: /pastel|chalk/i,          medium: "soft pastel on toned paper", texture: "chalky strokes, toothy paper",
    palette: ["#0D1B2A","#1B263B","#415A77","#E0E1DD","#E07A5F"], descriptor: "soft pastel with velvety gradients" },
  { k: /acrylic|contemporary/i,  medium: "acrylic on panel", texture: "flat coats with subtle brush chatter",
    palette: ["#0F0F0F","#2E86AB","#F6C667","#F4F4F4","#D94F04"], descriptor: "contemporary acrylic with clean edges" },
  { k: /collage|mixed|cut-out/i, medium: "paper collage", texture: "layered cut paper, deckled edges",
    palette: ["#1B1B1B","#F2E8CF","#BB4430","#7EBDC3","#F3DFA2"], descriptor: "paper collage with layered cutouts" },
  { k: /ink|line|drawing/i,      medium: "ink drawing on hot-press paper", texture: "linework, light hatching",
    palette: ["#101010","#2B2B2B","#6B6B6B","#BFBFBF","#F5F5F5"], descriptor: "ink drawing with graphic clarity" },
  { k: /charcoal|graphite/i,     medium: "charcoal on toned paper", texture: "smudged charcoal, matte tooth",
    palette: ["#0A0A0A","#3A3A3A","#6D6D6D","#A9A9A9","#EAEAEA"], descriptor: "charcoal study with tonal masses" },
  { k: /textile|fiber|weave/i,   medium: "textile collage", texture: "stitched fabric, woven textures",
    palette: ["#372F2F","#73683B","#CABFAB","#7B9EA8","#C97064"], descriptor: "textile collage with stitched seams" },
  { k: /photo|photography/i,     medium: "photo-collage on panel", texture: "print grain, matte varnish",
    palette: ["#121212","#3C3C3C","#8C8C8C","#DADADA","#F2F2F2"], descriptor: "photo-collage with tonal balance" },
  { k: /digital|ai|generative/i, medium: "digital painting (archival print)", texture: "smooth gradient ramps, dither grain",
    palette: ["#121420","#3F88C5","#F49D37","#E94F37","#EDE7E3"], descriptor: "post-digital painterly minimalism" },
  // default oil
  { k: /.*/,                     medium: "oil on canvas", texture: "impasto brushwork, archival grain",
    palette: ["#1A1A1A","#4B6CC1","#E2C290","#F2EFE9","#7A5C3E"], descriptor: "oil painting with tactile impasto" },
];

export function deriveArtStyleFromClusters(artClusters: Cluster[]): StyleSpec {
  const titleBlob = (artClusters || []).map(c => c.title).join(" | ");
  const rule = STYLE_RULES.find(r => r.k.test(titleBlob)) || STYLE_RULES[STYLE_RULES.length - 1];
  return { medium: rule.medium, texture: rule.texture, palette: rule.palette, descriptor: rule.descriptor };
}

export function styleBlock(spec: StyleSpec): string {
  const pal = spec.palette.join(", ");
  return [
    `Medium: ${spec.medium}.`,
    `Surface/Texture: ${spec.texture}.`,
    `Palette (hex): ${pal}.`,
    `Overall Descriptor: ${spec.descriptor}.`,
  ].join(" ");
}

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
  negativeRules?: ["No text, UI, charts, captions, or watermarks. No real identifiable people."];
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
    "No UI, charts, captions, or watermarks. No real identifiable people.",
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
    "• Orientation: portrait only; do not compose as landscape.",

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
      "text, UI, captions, watermarks, charts, diagrams, real identifiable people",
  };
}

export function buildAdditiveUpdatePlan(worldCluster: Cluster): UpdatePlan {
  const srcs = (worldCluster.items ?? []).map((i) => i.url).filter(Boolean).slice(0, 3);
  return {
    update_prompt:
     `Inside the PROVIDED MASKED AREA ONLY, add ONE clear, readable symbol for "${worldCluster.title}". ` +
     `Do NOT modify or restyle any pixels outside the mask. Preserve all existing content, palette, and composition. ` +
     `No text or letters. No real identifiable people.`,
    suggested_mask: undefined,
    rationale: "Breaking world event — additive only; masked edit; preserve scene.",
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