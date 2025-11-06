// app/painting/[id]/page.tsx
import Image from "next/image";
import Link from "next/link";
import { getPaintingById } from "@/src/server/supabase";
import { formatInTimeZone } from "date-fns-tz";
import { config } from "@/lib/config";
import { NewsReveal } from "@/src/components/NewsReveal";

const TZ = "America/New_York";

type Props = { params: Promise<{ id: string }> };

export default async function PaintingById({ params }: Props) {
  const { id } = await params;

  const painting = await getPaintingById(id);
  if (!painting) {
    return (
      <main className="min-h-screen bg-white text-black">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <div className="mb-4">
            <Link href="/archive" className="text-sm underline">
              ← Back to Archive
            </Link>
          </div>
          <p className="text-sm text-neutral-700">Painting not found.</p>
        </div>
      </main>
    );
  }

  const tz = config.timezone || TZ;

  const formattedDate = painting.date
    ? formatInTimeZone(new Date(painting.date), tz, "MMMM d, yyyy")
    : "";

  const timestamp = painting.created_at
    ? formatInTimeZone(
        new Date(painting.created_at),
        tz,
        "h:mm a 'ET'"
      )
    : "";

  const src = painting.image_url;
  const bust = `${src}${src.includes("?") ? "&" : "?"}v=${encodeURIComponent(
    painting.id
  )}`;

  // Cluster titles for this specific image (same logic as homepage Reveal News)
  const clusters =
    (painting as any).model_info?.debug?.clustersPicked ?? [];
  const clusterLines = Array.isArray(clusters)
    ? clusters
        .map((c: any) => (c?.title || "").trim())
        .filter((t: string) => t.length > 0)
    : [];

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/archive" className="text-sm underline">
            ← Back to Archive
          </Link>
          <Link href="/" className="text-sm underline">
            Back to today
          </Link>
        </div>

        <div className="relative w-full" style={{ aspectRatio: "2 / 3" }}>
          {src ? (
            <Image
              src={bust}
              alt={`Painting ${painting.date}`}
              fill
              style={{ objectFit: "cover" }}
              priority
            />
          ) : (
            <div className="w-full h-full grid place-items-center text-sm text-neutral-500">
              No image
            </div>
          )}
        </div>

        <div className="mt-4 space-y-1 text-center">
          {formattedDate && (
            <p className="text-base font-medium">{formattedDate}</p>
          )}
          {timestamp && (
            <p className="text-sm text-neutral-600">{timestamp}</p>
          )}
        </div>

        {clusterLines.length > 0 && (
          <div className="mt-4 flex justify-center">
            <NewsReveal clusters={clusterLines} />
          </div>
        )}
      </div>
    </main>
  );
}
