// src/lib/image/index.ts
import { generateBaseImage } from "./providers/openai";

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
