// app/api/admin/debug/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { basicAuth } from '@/lib/utils/auth';
import { getLatestDaily } from '@/src/server/supabase';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const auth = basicAuth(req);
  if (auth) return auth; // 401 if missing/wrong

  const row = await getLatestDaily();
  if (!row) return NextResponse.json({ ok: false, error: 'no row' }, { status: 404 });

  // Only return the private analysis fields; no public UI change
  const debug = {
    date: row.date,
    final_image_url: row.final_image_url,
    base_image_url: row.base_image_url,
    model: row.model_info?.model,
    aspect: row.model_info?.aspect,
    composer: row.model_info?.debug?.composer ?? null,
    newsSelected: row.model_info?.debug?.newsSelected ?? null,
    clustersPicked: row.model_info?.debug?.clustersPicked ?? null,
    generatedAt: row.model_info?.debug?.generatedAt ?? null,
  };

  return NextResponse.json({ ok: true, debug });
}
