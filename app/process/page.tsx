export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import { listArchive } from "@/src/server/supabase";

const CUTOFF_DATE = "2025-11-06";

export default async function ProcessPage() {
  const items = await listArchive(365); // or higher if you need deeper history
  const processItems = items.filter((i) => i.date < CUTOFF_DATE);

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-medium">My Process</h1>
          <Link href="/" className="underline">
            Back to today
          </Link>
        </div>

        <p className="text-sm text-neutral-600 mb-4">
          Earlier paintings are displayed here.
        </p>

        {processItems.length === 0 ? (
          <p className="text-sm text-neutral-600">
            No earlier images to display.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {processItems.map((p) => {
              const src = p.image_url;
              const bust = `${src}${
                src.includes("?") ? "&" : "?"
              }v=${encodeURIComponent(p.id)}`;
              return (
                <div key={p.id} className="block">
                  <div
                    className="relative w-full"
                    style={{ aspectRatio: "2 / 3" }}
                  >
                    <Image
                      src={bust}
                      alt={p.date}
                      fill
                      style={{ objectFit: "cover" }}
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  </div>
                  <p className="mt-2 text-sm text-neutral-700 text-center">
                    {p.date}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
