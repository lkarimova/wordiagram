// app/painting/[date]/page.tsx
import Image from "next/image";
import { getDailyByDate } from "@/src/server/supabase";

type Props = { params: Promise<{ date: string }> };

export default async function PaintingByDate({ params }: Props) {
  const { date } = await params;
  const row = await getDailyByDate(date);
  const url = row?.final_image_url || row?.base_image_url || "";

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="relative w-full" style={{ aspectRatio: "3 / 4" }}>
          {url ? (
            <Image src={url} alt={`Painting ${date}`} fill style={{ objectFit: "cover" }} />
          ) : (
            <div className="w-full h-full grid place-items-center text-sm text-neutral-500">No image</div>
          )}
        </div>
        <p className="mt-3 text-sm text-neutral-700">{new Date(date).toLocaleDateString()}</p>
      </div>
    </main>
  );
}
