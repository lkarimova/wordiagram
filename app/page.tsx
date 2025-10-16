import Link from 'next/link';
import Image from 'next/image';
import Frame from '@/components/Frame';
import { getLatestDaily } from '@/server/supabase';

export default async function Home() {
  // Placeholder image for mock mode until DB wired into UI
  const latest = await getLatestDaily(); // reads via anon
  const url = latest?.final_image_url || latest?.base_image_url || null;
  
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const tz = 'ET';
  return (
    <main className="min-h-screen bg-white text-black">
      <div className="max-w-5xl mx-auto px-4 py-10 flex flex-col items-center gap-6">
        <Frame>
          {url ? (
            <Image 
              src={url}
              alt="World-News Painting"
              fill
              style={{ objectFit: "cover" }}
              unoptimized
              priority
            />
          ) : (
            <div className="w-full h-full grid place-items-center text-sm text-neutral-500">
              No image yet
            </div>
          )}
        </Frame>
        <p className="text-sm text-neutral-700">{dateStr} • 06:00 {tz}</p>
        <div className="flex gap-3">
          <Link href="/archive" className="px-4 py-2 bg-black text-white rounded">Archive</Link>
        </div>
      </div>
    </main>
  );
}
