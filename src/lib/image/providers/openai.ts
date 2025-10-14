import OpenAI from 'openai';
import { config } from '../../config';

export type GenerateOptions = { prompt: string; negative?: string; seed?: number; width: number; height: number };

export async function generateBaseImage(opts: GenerateOptions): Promise<Uint8Array> {
  if (config.mock.images) {
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/D/PwAH+QKp5xqNVwAAAABJRU5ErkJggg==';
    return Uint8Array.from(Buffer.from(pngBase64, 'base64'));
  }
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const res = await client.images.generate({
    model: 'gpt-image-1',
    prompt: opts.prompt,
    size: `${opts.width}x${opts.height}`,
  } as any);
  const b64 = res.data[0].b64_json!;
  return Uint8Array.from(Buffer.from(b64, 'base64'));
}

export async function inpaintOrOverlay(opts: { base: Uint8Array; prompt: string; mask?: Uint8Array }): Promise<Uint8Array> {
  if (config.mock.images) {
    return opts.base;
  }
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const res = await client.images.edits.create({
    model: 'gpt-image-1',
    image: [new Blob([opts.base]) as any],
    mask: opts.mask ? (new Blob([opts.mask]) as any) : undefined,
    prompt: opts.prompt,
  } as any);
  const b64 = (res as any).data[0].b64_json as string;
  return Uint8Array.from(Buffer.from(b64, 'base64'));
}

export async function restyle(opts: { base: Uint8Array; prompt: string }): Promise<Uint8Array> {
  if (config.mock.images) {
    return opts.base;
  }
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const res = await client.images.edits.create({
    model: 'gpt-image-1',
    image: [new Blob([opts.base]) as any],
    prompt: opts.prompt,
  } as any);
  const b64 = (res as any).data[0].b64_json as string;
  return Uint8Array.from(Buffer.from(b64, 'base64'));
}
