export const dynamic = "force-dynamic";
import Link from 'next/link';
import Image from 'next/image';
import { listArchive } from "@/src/server/supabase";
import { formatInTimeZone } from "date-fns-tz";
const TZ = "America/New_York";

export default async function ArchivePage() {
  const items = await listArchive(90);
  const today = formatInTimeZone(new Date(), TZ, "yyyy-MM-dd");

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-medium">Archive</h1>
          <Link href="/" className="underline">Back to today</Link>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-neutral-600">No entries yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {items.map((p) => {
              const src = p.image_url;
              const bust = `${src}${src.includes("?") ? "&" : "?"}v=${encodeURIComponent(p.id)}`;

              // Show full datetime for clarity
              const label = p.created_at
                ? formatInTimeZone(new Date(p.created_at), TZ, "yyyy-MM-dd HH:mm")
                : p.date;

              return (
                <Link key={p.id} href={`/painting/${p.date}`} className="block">
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