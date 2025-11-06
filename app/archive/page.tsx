export const dynamic = "force-dynamic";
import Link from 'next/link';
import Image from 'next/image';
import { listArchive, getLatestPainting } from "@/src/server/supabase";
import { formatInTimeZone } from "date-fns-tz";

const TZ = "America/New_York";
const CUTOFF_DATE = "2025-11-06";

export default async function ArchivePage() {
  const items = await listArchive(365);
  const today = formatInTimeZone(new Date(), TZ, "yyyy-MM-dd");

  // Get the current homepage image to exclude it
  const latestPainting = await getLatestPainting();
  const latestId = latestPainting?.id;

  // Filter: show images >= cutoff date, but exclude the current homepage image
  const archiveItems = items.filter(i => 
    i.date >= CUTOFF_DATE && i.id !== latestId
  );

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-medium">Archive</h1>
          <Link href="/" className="underline">Back to today</Link>
        </div>
        {archiveItems.length === 0 ? (
          <p className="text-sm text-neutral-600">No Archive entries yet. For Archive entries prior to November 6, 2025, please visit the <Link href="/process" className="underline">My Process</Link> page.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {archiveItems.map((p) => {
              const src = p.image_url;
              const bust = `${src}${src.includes("?") ? "&" : "?"}v=${encodeURIComponent(p.id)}`;

              // Show full datetime for clarity
              const label = p.created_at
                ? formatInTimeZone(new Date(p.created_at), TZ, "MMM d, yyyy • HH:mm 'ET'")
                : p.date;

              return (
                <Link key={p.id} href={`/painting/${p.id}`} className="block">
                  <div className="relative w-full" style={{ aspectRatio: "2 / 3" }}>
                    <Image
                      src={bust}
                      alt={label}
                      fill
                      style={{ objectFit: "cover" }}
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  </div>
                  <p className="mt-2 text-sm text-neutral-700">{label}</p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}