import Link from 'next/link';
import Image from 'next/image';
import Frame from '@/components/Frame';

export default async function Home() {
  // Placeholder image for mock mode until DB wired into UI
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const tz = 'ET';
  const placeholder = "https://placehold.co/768x1024/png?text=Wordiagram";
  return (
    <main className="min-h-screen bg-white text-black">
      <div className="max-w-5xl mx-auto px-4 py-10 flex flex-col items-center gap-6">
        <Frame>
          <Image src={placeholder} alt="World-News Painting" fill style={{ objectFit: 'cover' }} priority />
        </Frame>
        <p className="text-sm text-neutral-700">{dateStr} • 06:00 {tz}</p>
        <div className="flex gap-3">
          <Link href="/archive" className="px-4 py-2 bg-black text-white rounded">Archive</Link>
        </div>
      </div>
    </main>
  );
}
