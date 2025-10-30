// src/lib/image/providers/openai.ts
import OpenAI from "openai";
import { toFile } from "openai/uploads";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

type GenOpts = { prompt: string; width: number; height: number };
type AllowedSize =
  | "256x256"
  | "512x512"
  | "1024x1024"
  | "1024x1536"
  | "1536x1024"
  | "1024x1792"
  | "1792x1024";

/** Always return a portrait size (2:3-ish by default). */
function toAllowedSize(_w: number, _h: number): AllowedSize {
  return "1024x1536";
}

async function fetchToBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch image failed: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

/** ------- Base generation (no mask) ------- */
async function generatePng(opts: GenOpts): Promise<Uint8Array> {
  const size = toAllowedSize(opts.width, opts.height);

  const res = await client.images.generate({
    model: "gpt-image-1",
    prompt: opts.prompt,
    size, // must be an allowed string
  });

  const item = res.data?.[0];
  if (!item) throw new Error("OpenAI Images returned empty data");

  if (item.b64_json) {
    return Uint8Array.from(Buffer.from(item.b64_json, "base64"));
  }
  if (item.url) {
    return fetchToBytes(item.url);
  }
  throw new Error("Images response missing b64_json and url");
}

/** Public API: base image */
export async function generateBaseImage(opts: { prompt: string; width: number; height: number }) {
  return generatePng(opts);
}

/** ------- Masked edit (add/overlay) ------- */
export async function editImageWithMask(opts: {
  baseImage: Uint8Array;   // PNG bytes
  maskImage: Uint8Array;   // PNG bytes; white = editable, black = protected
  prompt: string;
  width: number;
  height: number;
}): Promise<Uint8Array> {
  const size = toAllowedSize(opts.width, opts.height);

  // Ensure proper filenames + MIME so API doesn’t see application/octet-stream
  const baseFile = await toFile(Buffer.from(opts.baseImage), "base.png", { type: "image/png" });
  const maskFile = await toFile(Buffer.from(opts.maskImage), "mask.png", { type: "image/png" });

  // Support both .edit and .edits (SDK version differences)
  const payload: any = { model: "gpt-image-1", prompt: opts.prompt, image: [baseFile], mask: maskFile, size };
  const api: any = (client as any).images;

  const res: any =
    typeof api.edits === "function" ? await api.edits(payload) :
    typeof api.edit  === "function" ? await api.edit(payload)  :
    (() => { throw new Error("OpenAI SDK lacks images.edit/edits"); })();

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

/** Optional shims so older imports don’t break */
export async function inpaintOrOverlay(opts: { base: Uint8Array; prompt: string; mask?: Uint8Array }) {
  throw new Error("inpaintOrOverlay disabled: use editImageWithMask with an explicit or default mask");
  // If you later want to route through editImageWithMask when mask exists, you can do it here.
  return generatePng({ prompt: opts.prompt, width: 1024, height: 1536 });
}
export async function restyle(opts: { base: Uint8Array; prompt: string }) {
  return generatePng({ prompt: opts.prompt, width: 1024, height: 1536 });
}
