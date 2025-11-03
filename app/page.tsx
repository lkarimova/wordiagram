export const dynamic = 'force-dynamic';

import Link from 'next/link';
import Image from 'next/image';
import Frame from '@/src/components/Frame';
import { getLatestPainting } from '@/src/server/supabase';
import { formatInTimeZone } from 'date-fns-tz';
import { config } from '@/lib/config';

export default async function Home() {
  const painting = await getLatestPainting();

  // Fallback placeholder if nothing exists yet
  const imgUrl =
    painting?.image_url ||
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAMCAYAAABfnvydAAAAI0lEQVQokWP8////fwYgYGBg+M9AgQGQ2QEUJgYFQ4g0g3EFAH5oAqK5nGxgAAAAASUVORK5CYII=';

  const tz = config.timezone || 'America/New_York';
  const stamp = painting?.created_at
    ? formatInTimeZone(new Date(painting.created_at), tz, "MMM d, yyyy • HH:mm 'ET'")
    : '';

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="mx-auto px-4 py-10 flex flex-col items-center gap-6">
        <Frame>
          {painting?.image_url ? (
            <Image 
              src={imgUrl}
              alt="World-News Painting"
              fill
              style={{ objectFit: "cover" }}
              sizes="(max-width: 768px) 90vw, 600px"
              priority
            />
          ) : (
            <div className="w-full h-full grid place-items-center text-sm text-neutral-500">
              No image yet
            </div>
          )}
        </Frame>
        {stamp ? (
          <p className="text-sm text-neutral-700">
            {stamp} •{" "}
            <Link
              href="/archive"
              className="underline underline-offset-2 decoration-current hover:opacity-80"
            >
              View Archive
            </Link>
          </p>
        ) : null}
      </div>
    </main>
  );
}