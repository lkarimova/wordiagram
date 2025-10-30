// src/lib/image/index.ts
import sharp from "sharp";
import { generateBaseImage, editImageWithMask } from "./providers/openai";

/** Base generation (daily create) */
export async function generateDailyBase(
  prompt: string,
  negative: string | undefined,
  width: number,
  height: number
) {
  const full = negative ? `${prompt}\nNegative: ${negative}` : prompt;
  return generateBaseImage({ prompt: full, width, height });
}

/** Helper: build a white-on-black PNG mask (white = editable). */
async function makeRectMask(
  width: number,
  height: number,
  rect: { x: number; y: number; w: number; h: number }
): Promise<Uint8Array> {
  // Create black canvas
  const base = sharp({
    create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } },
  }).png();

  // White rectangle
  const white = await sharp({
    create: { width: rect.w, height: rect.h, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  }).png().toBuffer();

  const buf = await base
    .composite([{ input: white, left: rect.x, top: rect.y }])
    .png()
    .toBuffer();

  return new Uint8Array(buf);
}

/**
 * Add a new element via masked edit (never full regenerate).
 * If no mask is provided, we create an upper-third band by default.
 */
export async function applyWorldAddition(
  base: Uint8Array,
  prompt: string,
  mask?: Uint8Array
) {
  const meta = await sharp(base).metadata();
  const width = meta.width ?? 1024;
  const height = meta.height ?? 1536;

  const effectiveMask =
    mask ??
    (await makeRectMask(width, height, {
      x: Math.round(width * 0.15),
      w: Math.round(width * 0.70),
      y: Math.round(height * 0.08),
      h: Math.round(height * 0.22),
    }));

  return editImageWithMask({
    baseImage: base,
    maskImage: effectiveMask,
    prompt,
    width,
    height,
  });
}
