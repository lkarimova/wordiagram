export const dynamic = 'force-dynamic';

import Link from 'next/link';
import Image from 'next/image';
import Frame from '@/src/components/Frame';
import { getLatestDaily, getLatestUpdateForDaily } from '@/src/server/supabase';
import { formatInTimeZone } from 'date-fns-tz';
import { config } from '@/lib/config';

export default async function Home() {
  const daily = await getLatestDaily();

  // Fallback placeholder if nothing exists yet
  const imgUrl =
    daily?.final_image_url || daily?.base_image_url ||
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAMCAYAAABfnvydAAAAI0lEQVQokWP8////fwYgYGBg+M9AgQGQ2QEUJgYFQ4g0g3EFAH5oAqK5nGxgAAAAASUVORK5CYII=';

  // Pick the newer of: daily.created_at vs latest update.created_at
  let latestIso = daily?.created_at ?? null;
  if (daily?.id) {
    const lastUpd = await getLatestUpdateForDaily(daily.id);
    if (lastUpd?.created_at) {
      const a = new Date(latestIso ?? 0);
      const b = new Date(lastUpd.created_at);
      if (!latestIso || b > a) latestIso = lastUpd.created_at;
    }
  }
  
  const tz = config.timezone || 'America/New_York';
  const stamp = latestIso
    ? formatInTimeZone(new Date(latestIso), tz, "MMM d, yyyy • HH:mm 'ET'")
    : '';
  return (
    <main className="min-h-screen bg-white text-black">
      <div className="mx-auto px-4 py-10 flex flex-col items-center gap-6">
        <Frame>
            <Image 
              src={imgUrl}
              alt="World-News Painting"
              fill
              style={{ objectFit: "cover" }}
              sizes="(max-width: 1024px) 90vw, 60vw"
              priority
            />
           : (
            <div className="w-full h-full grid place-items-center text-sm text-neutral-500">
              No image yet
            </div>
          )
          </Frame>
        {stamp ? (
          <p className="text-sm text-neutral-700">{stamp}</p>
        ) : null}
        <div className="flex gap-3">
          <Link href="/archive" className="px-4 py-2 bg-black text-white rounded">
            Archive
          </Link>
        </div>
      </div>
    </main>
  );
}
