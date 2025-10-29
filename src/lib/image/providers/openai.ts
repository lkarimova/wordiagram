// src/lib/image/providers/openai.ts
import OpenAI, { toFile } from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

type GenOpts = { prompt: string; width: number; height: number };
type EditOpts = {
  baseImage: Uint8Array;
  maskImage: Uint8Array; // white = editable, black = protected
  prompt: string;
  width: number;
  height: number;
};

// Allowed sizes: remove "1536x2048"
type AllowedSize =
  | "256x256"
  | "512x512"
  | "1024x1024"
  | "1024x1536"
  | "1536x1024"
  | "1024x1792"
  | "1792x1024";

// Map to supported sizes (portrait 2:3 → 1024x1536; landscape → 1536x1024)
function toAllowedSize(w: number, h: number): AllowedSize {
  return h >= w ? "1024x1536" : "1536x1024";
}

async function fetchToBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch image failed: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

/** ----- Base generation (keeps your b64/url flexibility) ----- */
async function generatePng(opts: GenOpts): Promise<Uint8Array> {
  const size = toAllowedSize(opts.width, opts.height);

  const res = await client.images.generate({
    model: "gpt-image-1",
    prompt: opts.prompt,
    size,
    // you can keep these if you like; remove if you hit API errors:
    // background: "transparent",
    // quality: "medium",
    response_format: "b64_json", // prefer b64 for consistency
  });

  const item = res.data?.[0];
  if (!item) throw new Error("OpenAI Images returned empty data");

  if (item.b64_json) return Uint8Array.from(Buffer.from(item.b64_json, "base64"));
  if (item.url) return fetchToBytes(item.url);
  throw new Error("Images response missing b64_json and url");
}

/** Public API used elsewhere */
export async function generateBaseImage(opts: { prompt: string; width: number; height: number }) {
  return generatePng(opts);
}

/** ----- Masked edit: preserves all pixels outside white mask ----- */
export async function editImageWithMask(opts: EditOpts): Promise<Uint8Array> {
  const size = toAllowedSize(opts.width, opts.height);

  const res = await client.images.edits({
    model: "gpt-image-1",
    // IMPORTANT: first image is the base; mask is separate
    image: [await toFile(Buffer.from(opts.baseImage), "base.png")], // base first
    mask: await toFile(Buffer.from(opts.maskImage), "mask.png"),    // white = editable
    prompt: opts.prompt,
    size,                                  // e.g. "1024x1536"
    response_format: "b64_json",
  });

  const item = res.data?.[0];
  if (!item) throw new Error("OpenAI Image edit returned empty data");

  if (item.b64_json) return Uint8Array.from(Buffer.from(item.b64_json, "base64"));
  if (item.url) return fetchToBytes(item.url);
  throw new Error("Images edit response missing b64_json and url");
}
