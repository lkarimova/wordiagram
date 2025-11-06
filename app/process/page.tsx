export const dynamic = "force-dynamic";

import Link from "next/link";

export default function ProcessPage() {
  return (
    <main className="min-h-screen bg-white text-black">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-medium">My Process</h1>
          <Link href="/" className="underline">
            Back to today
          </Link>
        </div>
        <p className="text-sm text-neutral-600">
          Process notes coming soon.
        </p>
      </div>
    </main>
  );
}
