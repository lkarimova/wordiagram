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

// Portrait-only mapper: always return a portrait size
function toAllowedSize(_w: number, _h: number): AllowedSize {
  return "1024x1536"; // lock to portrait 2:3-ish
}

async function fetchToBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch image failed: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

/** ----- Base generation (keeps your b64/url flexibility) ----- */
async function generatePng(opts: GenOpts): Promise<Uint8Array> {
  const size: AllowedSize = toAllowedSize(opts.width, opts.height);
  
  const res = await client.images.generate({
    model: "gpt-image-1",
    prompt: opts.prompt,
    size,
  });

  const item = res.data?.[0];
  if (!item) throw new Error("OpenAI Images returned empty data");

  if (item.b64_json) {
    return Uint8Array.from(Buffer.from(item.b64_json, "base64"));
  }
  if (item.url) {
    const r = await fetch(item.url);
    if (!r.ok) throw new Error(`fetch image failed: ${r.status}`);
    return new Uint8Array(await r.arrayBuffer());
  }
  throw new Error("Images response missing b64_json and url");
}

/** Public API used elsewhere */
export async function generateBaseImage(opts: { prompt: string; width: number; height: number }) {
  return generatePng(opts);
}

/** ----- Masked edit: preserves all pixels outside white mask ----- */
export async function editImageWithMask(opts: {
  baseImage: Uint8Array;
  maskImage: Uint8Array;
  prompt: string;
  width: number;
  height: number;
}): Promise<Uint8Array> {
  const size: AllowedSize = toAllowedSize(opts.width, opts.height)

  // Common payload — most SDK versions accept Buffer directly
  const payload: any = {
    model: "gpt-image-1",
    image: [await toFile(Buffer.from(opts.baseImage), "base.png")],
    mask: await toFile(Buffer.from(opts.maskImage), "mask.png"),
    prompt: opts.prompt,
    size,
  };

  const api: any = (client as any).images;
  const res: any =
    typeof api.edits === "function" ? await api.edits(payload)
    : typeof api.edit  === "function" ? await api.edit(payload)
    : (() => { throw new Error("OpenAI SDK lacks images.edit/edits"); })();

  const item = res?.data?.[0];
  if (!item) throw new Error("OpenAI image edit returned empty data");

  if (item.b64_json) {
    return Uint8Array.from(Buffer.from(item.b64_json, "base64"));
  }
  if (item.url) {
    const r = await fetch(item.url);
    if (!r.ok) throw new Error(`fetch edited image failed: ${r.status}`);
    return new Uint8Array(await r.arrayBuffer());
  }
  throw new Error("Image edit response missing b64_json and url");
}