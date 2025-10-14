import { put } from '@vercel/blob';
import { config } from './config';

export async function storePublicBlob(path: string, data: Blob | ArrayBuffer | Uint8Array, contentType: string) {
  const key = `${config.storage.publicPrefix}/${path}`;
  const res = await put(key, data as any, { access: 'public', contentType });
  return res.url;
}
