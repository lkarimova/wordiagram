// app/api/admin/debug/painting/route.ts
import { NextRequest, NextResponse } from "next/server";
import { basicAuth } from "@/lib/utils/auth";
import {
  getPaintingById,
  getLatestPaintingForDate,
  getPaintingByLocalCreatedMinute,
} from "@/src/server/supabase";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = basicAuth(req);
  if (auth) return auth; // 401 if missing/wrong

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const date = url.searchParams.get("date");
  const createdLocal = url.searchParams.get("created_at"); // "YYYY-MM-DDTHH:mm" in ET

  if (!id && !date && !createdLocal) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Provide one of: ?id=<painting-id> or ?date=YYYY-MM-DD or ?created_at=YYYY-MM-DDTHH:mm (ET)",
      },
      { status: 400 }
    );
  }

  let row = null;

  if (id) {
    row = await getPaintingById(id);
  } else if (createdLocal) {
    row = await getPaintingByLocalCreatedMinute(createdLocal);
  } else if (date) {
    // latest painting for that date
    row = await getLatestPaintingForDate(date);
  }

  if (!row) {
    return NextResponse.json(
      { ok: false, error: "painting not found" },
      { status: 404 }
    );
  }

  const debug = {
    id: row.id,
    date: row.date,
    created_at: row.created_at,
    image_url: row.image_url,
    is_daily: row.is_daily,
    prompt: row.prompt,
    world_theme_summary: row.world_theme_summary,
    clustersPicked: row.model_info?.debug?.clustersPicked ?? null,
    newsSelected: row.model_info?.debug?.newsSelected ?? null,
    generatedAt: row.model_info?.debug?.generatedAt ?? null,
  };

  return NextResponse.json({ ok: true, debug });
}