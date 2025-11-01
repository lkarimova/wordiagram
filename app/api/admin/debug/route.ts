// app/api/admin/debug/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { basicAuth } from '@/lib/utils/auth';
import { getLatestPainting } from '@/src/server/supabase';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const auth = basicAuth(req);
  if (auth) return auth; // 401 if missing/wrong

  const row = await getLatestPainting();
  if (!row) return NextResponse.json({ ok: false, error: 'no row' }, { status: 404 });

  // Only return the private analysis fields; no public UI change
  const debug = {
    date: row.date,
    image_url: row.image_url,
    is_daily: row.is_daily,
    model: row.model_info?.model,
    aspect: row.model_info?.aspect,
    prompt: row.prompt,
    world_theme_summary: row.world_theme_summary,
    composer: row.model_info?.debug?.composer ?? null,
    newsSelected: row.model_info?.debug?.newsSelected ?? null,
    clustersPicked: row.model_info?.debug?.clustersPicked ?? null,
    generatedAt: row.model_info?.debug?.generatedAt ?? null,
  };

  return NextResponse.json({ ok: true, debug });
}