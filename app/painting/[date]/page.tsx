import Image from 'next/image';

export default function PaintingByDate({ params }: { params: { date: string } }) {
  const url = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAMCAYAAABfnvydAAAAI0lEQVQokWP8////fwYgYGBg+M9AgQGQ2QEUJgYFQ4g0g3EFAH5oAqK5nGxgAAAAASUVORK5CYII=';
  return (
    <main className="min-h-screen bg-white text-black">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="relative w-full" style={{ aspectRatio: '3 / 4' }}>
          <Image src={url} alt={"Painting " + params.date} fill style={{ objectFit: 'cover' }} />
        </div>
        <p className="mt-3 text-sm text-neutral-700">{new Date(params.date).toLocaleDateString()}</p>
      </div>
    </main>
  );
}
