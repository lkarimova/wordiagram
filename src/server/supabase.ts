// src/server/supabase.ts
import { createClient } from "@supabase/supabase-js";
import { formatInTimeZone } from "date-fns-tz";
const TZ = "America/New_York";

const URL = process.env.SUPABASE_URL!;
const ANON = process.env.SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE; // server-only

// Anonymous client (reads)
const anon = () =>
  createClient(URL, ANON, { auth: { persistSession: false } });

// Service Role client (writes) — requires SUPABASE_SERVICE_ROLE set in Vercel
const svc = () => {
  if (!SERVICE) throw new Error("SUPABASE_SERVICE_ROLE missing");
  return createClient(URL, SERVICE, { auth: { persistSession: false } });
};

// ──────────────────────────────────────────────────────────────────────────────
// Types (Updated for simplified schema)
export type DailyPainting = {
  id: string;
  date: string; // yyyy-mm-dd
  image_url: string;
  prompt: any;
  world_theme_summary: string;
  model_info: any;
  sources: any;
  is_daily: boolean;
  created_at?: string;
};

// ──────────────────────────────────────────────────────────────────────────────
// READS (Anon)

/** Get the most recent painting (daily or breaking) */
export async function getLatestPainting() {
  const { data, error } = await anon()
    .from("daily_paintings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as DailyPainting | null;
}

/** Get the daily painting for today (6am generation) */
export async function getTodaysDaily() {
  const today = formatInTimeZone(new Date(), TZ, "yyyy-MM-dd");
  const { data, error } = await anon()
    .from("daily_paintings")
    .select("*")
    .eq("date", today)
    .eq("is_daily", true)
    .maybeSingle();
  if (error) throw error;
  return data as DailyPainting | null;
}

/** Get all paintings for a specific date (daily + any breaking) */
export async function getPaintingsByDate(date: string) {
  const { data, error } = await anon()
    .from("daily_paintings")
    .select("*")
    .eq("date", date)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as DailyPainting[];
}

/** Get the latest (most recent) painting for a specific date */
export async function getLatestPaintingForDate(date: string) {
  const { data, error } = await anon()
    .from("daily_paintings")
    .select("*")
    .eq("date", date)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as DailyPainting | null;
}

// ──────────────────────────────────────────────────────────────────────────────
// DEBUG HELPER: lookup by local ET minute
// This is only used for admin debug endpoints, not for core app behavior.

/**
 * Convert an ET "minute" (YYYY-MM-DDTHH:mm in America/New_York) into
 * a UTC ISO start/end range for that minute.
 *
 * NOTE: This uses a simple month-based DST approximation:
 *   - months 4–10 (Apr–Oct) → EDT (UTC-4)
 *   - other months → EST (UTC-5)
 * Good enough for admin/debug.
 */
function localMinuteToUtcRange(localMinute: string): {
  startIso: string;
  endIso: string;
} {
  // Expect "YYYY-MM-DDTHH:mm"
  const [datePart, timePart] = localMinute.split("T");
  if (!datePart || !timePart) {
    throw new Error(
      `Invalid localMinute format (expected YYYY-MM-DDTHH:mm): ${localMinute}`
    );
  }

  const [yearStr, monthStr, dayStr] = datePart.split("-");
  const [hourStr, minuteStr] = timePart.split(":");

  const year = Number(yearStr);
  const month = Number(monthStr); // 1–12
  const day = Number(dayStr);
  const hour = Number(hourStr);
  const minute = Number(minuteStr);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    throw new Error(`Invalid localMinute components: ${localMinute}`);
  }

  // Simple DST approximation:
  // months 4–10 (Apr–Oct) → UTC-4, others UTC-5
  const isDstApprox = month >= 4 && month <= 10;
  const offsetHours = isDstApprox ? 4 : 5;

  // local ET time is UTC - offset → UTC = local + offset
  const utcStartMs = Date.UTC(
    year,
    month - 1,
    day,
    hour + offsetHours,
    minute,
    0,
    0
  );
  const utcEndMs = utcStartMs + 60 * 1000; // +1 minute

  return {
    startIso: new Date(utcStartMs).toISOString(),
    endIso: new Date(utcEndMs).toISOString(),
  };
}

/**
 * Get the latest painting whose created_at falls within a specific ET minute.
 * localMinute should be in format "YYYY-MM-DDTHH:mm" in America/New_York time,
 * matching what you see on the UI (date + hour:minute).
 */
export async function getPaintingByLocalCreatedMinute(
  localMinute: string
): Promise<DailyPainting | null> {
  const { startIso, endIso } = localMinuteToUtcRange(localMinute);

  const { data, error } = await anon()
    .from("daily_paintings")
    .select("*")
    .gte("created_at", startIso)
    .lt("created_at", endIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as DailyPainting | null;
}

/** List archive: all images per day */
export async function listArchive(limit = 90) {
  const { data, error } = await anon()
    .from("daily_paintings")
    .select("id,date,image_url,created_at,is_daily")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit); // limit by images, not days

  if (error) throw error;
  return data as Pick<
    DailyPainting,
    "id" | "date" | "image_url" | "created_at" | "is_daily"
  >[];
}

/** List all images for a specific date (for viewing multiple updates) */
export async function listPaintingsForDate(date: string) {
  const { data, error } = await anon()
    .from("daily_paintings")
    .select("id,date,image_url,created_at,is_daily,world_theme_summary")
    .eq("date", date)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as Pick<DailyPainting, "id"|"date"|"image_url"|"created_at"|"is_daily"|"world_theme_summary">[];
}

// ──────────────────────────────────────────────────────────────────────────────
// WRITES (Service Role) — bypasses RLS

/** Insert a new painting (daily or breaking) */
export async function insertDailyPainting(row: Omit<DailyPainting, "id" | "created_at">) {
  const client = svc();

  // Always insert a new row (we removed the unique constraint on date)
  const { data, error } = await client
    .from("daily_paintings")
    .insert(row)
    .select()
    .single();
  
  if (error) throw error;
  return data as DailyPainting;
}

/** Update an existing painting */
export async function updatePainting(id: string, updates: Partial<DailyPainting>) {
  const { data, error } = await svc()
    .from("daily_paintings")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as DailyPainting;
}

export async function getPaintingByCreatedAt(createdAt: string) {
  const { data, error } = await anon()
    .from("daily_paintings")
    .select("*")
    .eq("created_at", createdAt)
    .maybeSingle();

  if (error) throw error;
  return data as DailyPainting | null;
}

export async function getPaintingById(id: string) {
  const { data, error } = await anon()
    .from("daily_paintings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as DailyPainting | null;
}
