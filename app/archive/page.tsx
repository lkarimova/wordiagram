import Link from 'next/link';
import Image from 'next/image';
import { listArchive } from "@/src/server/supabase";

export default async function ArchivePage() {
  const items = await listArchive(60);
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
            const url = p.final_image_url || p.base_image_url;
            return (
              <Link key={p.id} href={`/painting/${p.date}`} className="block">
                <div className="relative w-full" style={{ aspectRatio: "2 / 3" }}>
                  <Image
                    src={url}
                    alt={p.date}
                    fill
                    style={{ objectFit: "cover" }}
                    // unoptimized
                  />
                </div>
                <p className="mt-2 text-sm text-neutral-700">{p.date}</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  </main>
);
}
