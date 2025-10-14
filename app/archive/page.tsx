import Link from 'next/link';
import Image from 'next/image';

async function getArchive() {
  return [
    { date: '2025-10-14', url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAMCAYAAABfnvydAAAAI0lEQVQokWP8////fwYgYGBg+M9AgQGQ2QEUJgYFQ4g0g3EFAH5oAqK5nGxgAAAAASUVORK5CYII=' },
  ];
}

export default async function ArchivePage() {
  const items = await getArchive();
  return (
    <main className="min-h-screen bg-white text-black">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-xl font-semibold mb-6">Archive</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {items.map((it) => (
            <Link key={it.date} href={"/painting/" + it.date} className="block border border-neutral-200 p-2">
              <div className="relative w-full" style={{ aspectRatio: '3 / 4' }}>
                <Image src={it.url} alt={"Painting " + it.date} fill style={{ objectFit: 'cover' }} />
              </div>
              <div className="mt-2 text-sm">{new Date(it.date).toLocaleDateString()}</div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
