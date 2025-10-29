// src/lib/image/index.ts
import sharp from "sharp";
import { generateBaseImage, editImageWithMask } from "./providers/openai";

/** Generate the base (daily) image */
export async function generateDailyBase(
  prompt: string,
  negative: string | undefined,
  width: number,
  height: number
): Promise<Uint8Array> {
  return generateBaseImage({
    prompt: `${prompt}\nNegative: ${negative || ""}`,
    width,
    height,
  });
}

/** Create a white-on-black PNG mask: white = editable area, black = protected. */
async function makeRectMask(
  width: number,
  height: number,
  rect: { x: number; y: number; w: number; h: number }
): Promise<Uint8Array> {
  const base = sharp({
    create: { width, height, channels: 1, background: { r: 0, g: 0, b: 0, alpha: 1 } },
  });

  const overlay = await sharp({
    create: { width: rect.w, height: rect.h, channels: 1, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  })
    .png()
    .toBuffer();

  const buf = await base
    .composite([{ input: overlay, left: rect.x, top: rect.y }])
    .png()
    .toBuffer();

  return new Uint8Array(buf);
}

/**
 * Masked additive update:
 * Only the white region of the mask is editable; everything else is preserved.
 * If no mask provided, we create a centered top band by default.
 */
export async function applyWorldAddition(
  base: Uint8Array,
  prompt: string,
  mask?: Uint8Array
): Promise<Uint8Array> {
  const meta = await sharp(base).metadata();
  const width = meta.width ?? 1024;
  const height = meta.height ?? 1536;

  const effectiveMask =
    mask ??
    (await makeRectMask(width, height, {
      x: Math.round(width * 0.2), // centered band
      w: Math.round(width * 0.6),
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
