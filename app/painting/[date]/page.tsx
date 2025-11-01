// app/painting/[date]/page.tsx
import Image from "next/image";
import Link from "next/link";
import { getLatestPaintingForDate, listPaintingsForDate } from "@/src/server/supabase";
import { formatInTimeZone } from "date-fns-tz";
const TZ = "America/New_York";

type Props = { params: Promise<{ date: string }> };

export default async function PaintingByDate({ params }: Props) {
  const { date } = await params;
  
  // Get the latest (most recent) painting for this date
  const painting = await getLatestPaintingForDate(date);
  
  // Optional: Get all paintings for this date to show count
  const allPaintings = await listPaintingsForDate(date);
  
  const url = painting?.image_url || "";
  const formattedDate = formatInTimeZone(new Date(date), TZ, "MMMM d, yyyy");
  const timestamp = painting?.created_at 
    ? formatInTimeZone(new Date(painting.created_at), TZ, "h:mm a 'ET'")
    : "";

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-4">
          <Link href="/archive" className="text-sm underline">← Back to Archive</Link>
        </div>
        
        <div className="relative w-full" style={{ aspectRatio: '2 / 3' }}>
          {url ? (
            <Image 
              src={url} 
              alt={`Painting ${date}`} 
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
        
        <div className="mt-4 space-y-1">
          <p className="text-base font-medium">{formattedDate}</p>
          {timestamp && (
            <p className="text-sm text-neutral-600">{timestamp}</p>
          )}
          {allPaintings.length > 1 && (
            <p className="text-xs text-neutral-500">
              {allPaintings.length} updates on this day (showing latest)
            </p>
          )}
        </div>
      </div>
    </main>
  );
}