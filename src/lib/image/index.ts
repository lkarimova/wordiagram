import { config } from '../config';
import { generateBaseImage, inpaintOrOverlay, restyle } from './providers/openai';

export async function generateDailyBase(prompt: string, negative: string | undefined, width: number, height: number) {
  return generateBaseImage({ prompt: `${prompt}\nNegative: ${negative || ''}`, width, height });
}

export async function applyWorldAddition(base: Uint8Array, prompt: string, mask?: Uint8Array) {
  return inpaintOrOverlay({ base, prompt, mask });
}

export async function applyArtRestyle(base: Uint8Array, prompt: string) {
  return restyle({ base, prompt });
}
