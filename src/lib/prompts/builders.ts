import type OpenAI from "openai";

type Strictness = "soft" | "medium" | "hard";

interface LockSpec {
  camera?: "slight low angle, human eye-height";
  composition?: "central vertical axis, tiered plinths";
  balance?: "asymmetric balance around a central mass";
  space?: "deep atmospheric perspective";
  includeFrame?: boolean;
}

interface OpenEndedSpec {
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
    "You may invent symbols and scenes freely as long as they fit the locked composition and perspective.",

    // Guardrails
    open.allowSymbolsHint
      ? `Symbolic glyphs allowed: ${open.allowSymbolsHint} (abstract only; no letters).`
      : "Symbolic glyphs like musical notes are allowed as abstract shapes; avoid any letters.",
    negative,
  ]
    .filter(Boolean)
    .join(" ");
}

type OpenAIImageSize =
  | "auto"
  | "1024x1024"
  | "1536x1024"
  | "1024x1536"   // 2:3 portrait
  | "256x256"
  | "512x512"
  | "1792x1024"
  | "1024x1792";

export function size2x3(): OpenAIImageSize {
  return "1024x1536";
}

export async function generateOpenEnded(
  client: OpenAI,
  prompt: string,
  opts?: { size?: OpenAIImageSize; seed?: number; n?: number }
) {
  const res = await client.images.generate({
    model: "gpt-image-1",
    prompt,
    size: opts?.size ?? size2x3(),
    n: opts?.n ?? 1,
    ...(opts?.seed ? { seed: opts.seed } : {}),
  });
  const data = res.data ?? [];
  if (data.length === 0 || !data[0]?.b64_json) throw new Error("Image API returned no data");
  return data.map(d => d.b64_json!).filter(Boolean);
}