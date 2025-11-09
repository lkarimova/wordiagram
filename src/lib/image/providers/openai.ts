// src/lib/image/providers/openai.ts
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

type GenOpts = {
  prompt: string;
  width: number;
  height: number;
};

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
export async function generateBaseImage(opts: {
  prompt: string;
  width: number;
  height: number;
}) {
  return generatePng(opts);
}