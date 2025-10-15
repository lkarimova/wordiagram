import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL!;
const ANON = process.env.SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE; 

const anon = () => createClient(URL, ANON, { auth: { persistSession: false } });
const svc = () => {
  if (!SERVICE) throw new Error("SUPABASE_SERVICE_ROLE missing");
  return createClient(URL, SERVICE, { auth: { persistSession: false } });
};

export function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Supabase env not configured');
  }
  return createClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: fetch as any },
  });
}

export type DailyPainting = {
  id: string;
  date: string; // yyyy-mm-dd
  base_image_url: string;
  prompt: any;
  style_descriptor: any;
  world_theme_summary: string;
  art_style_summary: string;
  model_info: any;
  sources: any;
  created_at?: string;
  final_image_url?: string | null;
};

export type PaintingUpdate = {
  id: string;
  daily_id: string;
  update_type: 'world_addition' | 'art_restyle';
  mask_url?: string | null;
  overlay_image_url?: string | null;
  update_prompt: any;
  sources: any;
  rationale: string;
  created_at?: string;
};

export async function insertDailyPainting(row: Omit<DailyPainting, 'id'>) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('daily_paintings')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data as DailyPainting;
}

export async function updateDailyFinalImage(id: string, finalUrl: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('daily_paintings')
    .update({ final_image_url: finalUrl })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as DailyPainting;
}

export async function getLatestDaily() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('daily_paintings')
    .select('*')
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as DailyPainting | null;
}

export async function getDailyByDate(date: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('daily_paintings')
    .select('*')
    .eq('date', date)
    .maybeSingle();
  if (error) throw error;
  return data as DailyPainting | null;
}

export async function listArchive(limit = 60) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('daily_paintings')
    .select('id,date,final_image_url,base_image_url')
    .order('date', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as Pick<DailyPainting, 'id'|'date'|'final_image_url'|'base_image_url'>[];
}

export async function insertPaintingUpdate(row: Omit<PaintingUpdate, 'id'>) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('painting_updates')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data as PaintingUpdate;
}
