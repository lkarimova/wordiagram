// src/lib/storage.ts
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE!; // server-only key

function storageClient() {
  if (!URL || !SERVICE) throw new Error("Supabase storage env not configured");
  return createClient(URL, SERVICE, { auth: { persistSession: false } });
}

/**
 * Save a PNG byte array to Supabase Storage and return its public URL.
 * @param key path inside the bucket, e.g. "daily/2025-10-15.png"
 */
export async function savePngToStorage(key: string, bytes: Uint8Array) {
  const supabase = storageClient();

  // Ensure you created a public bucket named "images" in Supabase
  const { error: upErr } = await supabase
    .storage
    .from("images")
    .upload(key, bytes, { contentType: "image/png", upsert: true });

  if (upErr) throw upErr;

  const { data } = supabase.storage.from("images").getPublicUrl(key);
  if (!data?.publicUrl) throw new Error("Failed to resolve public URL");
  return data.publicUrl as string;
}
