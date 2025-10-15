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
  if (h > w) return "1024x1536";           // portrait (close to 3:4)
  if (w > h) return "1536x1024";           // landscape
  return "1024x1024";                      // square fallback
}

async function fetchToBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch image failed: ${res.status}`);
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

async function generatePng(opts: GenOpts): Promise<Uint8Array> {
  const size = toAllowedSize(opts.width, opts.height);

  const res = await client.images.generate({
    model: "gpt-image-1",
    prompt: opts.prompt,
    background: "transparent",
    quality: "medium",
    size,                 // ← remove response_format; let SDK choose
    // optional: background: "transparent", quality: "medium",
  });

  const item = res.data?.[0];
  if (!item) throw new Error("OpenAI Images returned empty data");

  // Handle either base64 or URL responses
  if (item.b64_json) {
    return Uint8Array.from(Buffer.from(item.b64_json, "base64"));
  }
  if (item.url) {
    return fetchToBytes(item.url);
  }
  throw new Error("Images response missing b64_json and url");
}

// Public API used elsewhere
export async function generateBaseImage(opts: { prompt: string; width: number; height: number }) {
  return generatePng(opts);
}
export async function inpaintOrOverlay(opts: { base: Uint8Array; prompt: string; mask?: Uint8Array }) {
  return generatePng({ prompt: opts.prompt, width: 1024, height: 1536 });
}
export async function restyle(opts: { base: Uint8Array; prompt: string }) {
  return generatePng({ prompt: opts.prompt, width: 1024, height: 1536 });
}
