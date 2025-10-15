// src/lib/image/providers/openai.ts
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type GenOpts = { prompt: string; width: number; height: number };
type AllowedSize =
  | "auto"
  | "256x256"
  | "512x512"
  | "1024x1024"
  | "1536x1024"
  | "1024x1536"
  | "1792x1024"
  | "1024x1792";

function toAllowedSize(w: number, h: number): AllowedSize {
  // Portrait vs landscape shortcut; pick the closest supported
  if (h > w) {
    // portrait: prefer 1024x1536 (close to 3:4), fallback 1024x1792 if you want taller
    return "1024x1536";
  } else if (w > h) {
    // landscape: pick something sensible if ever used
    return "1536x1024";
  }
  return "1024x1024";
}

async function generatePng(opts: GenOpts): Promise<Uint8Array> {
  const size = toAllowedSize(opts.width, opts.height);

  const res = await client.images.generate({
    model: "gpt-image-1",
    prompt: opts.prompt,
    size,                          // ← use allowed size
    response_format: "b64_json",
  });

  const data = res.data as Array<{ b64_json?: string }> | undefined;
  if (!data?.[0]?.b64_json) throw new Error("OpenAI Images returned empty data");

  const b64 = data[0].b64_json!;
  return Uint8Array.from(Buffer.from(b64, "base64"));
}

// Keep the public API the same as before
export async function generateBaseImage(opts: { prompt: string; width: number; height: number }) {
  return generatePng(opts);
}
export async function inpaintOrOverlay(opts: { base: Uint8Array; prompt: string; mask?: Uint8Array }) {
  // Default portrait size; callers didn’t pass size
  return generatePng({ prompt: opts.prompt, width: 1024, height: 1536 });
}
export async function restyle(opts: { base: Uint8Array; prompt: string }) {
  return generatePng({ prompt: opts.prompt, width: 1024, height: 1536 });
}
