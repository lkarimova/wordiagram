export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import Frame from "@/src/components/Frame";
import { getLatestPainting } from "@/src/server/supabase";
import { formatInTimeZone } from "date-fns-tz";
import { config } from "@/lib/config";
import { NewsReveal } from "@/src/components/NewsReveal";

export default async function Home() {
  const painting = await getLatestPainting();

  // Fallback placeholder if nothing exists yet
  const imgUrl =
    painting?.image_url ||
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAMCAYAAABfnvydAAAAI0lEQVQokWP8////fwYgYGBg+M9AgQGQ2QEUJgYFQ4g0g3EFAH5oAqK5nGxgAAAAASUVORK5CYII=";

  const tz = config.timezone || "America/New_York";
  const stamp = painting?.created_at
    ? formatInTimeZone(
        new Date(painting.created_at),
        tz,
        "MMM d, yyyy • HH:mm 'ET'"
      )
    : "";

  // Build cluster lines from world_theme_summary, stripping "(N sources)"
  const rawSummary = painting?.world_theme_summary;
  const clusterLines =
  typeof rawSummary === "string" && rawSummary.trim().length > 0
    ? rawSummary
        .split(" • ")
        .map((part) =>
          part
            .replace(/\s*\([^)]*\)\s*$/, "") // strip "(N sources)"
            .trim()
        )
        .filter(Boolean)
    : [];

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="mx-auto px-4 py-10 pb-4 flex flex-col items-center gap-6">
        {/* Title + description (always visible) */}
        <header className="text-center max-w-2xl mb-6">
          <h1 className="text-3xl md:text-4xl font-semibold">Wordiagram</h1>
          <p className="mt-3 text-sm text-neutral-700">
              A real-time painting of the latest world news.
              <br />
              <span className="italic">Word</span> comes from Old English, meaning “news”.
              <br />
              <span className="italic"> Diagram</span> comes from Latin, meaning "through drawing".
          </p>
        </header>

        {/* Painting frame */}
        <Frame>
          {painting?.image_url ? (
            <Image
              src={imgUrl}
              alt="World-News Painting"
              fill
              style={{ objectFit: "cover" }}
              sizes="(max-width: 768px) 90vw, 600px"
              priority
            />
          ) : (
            <div className="w-full h-full grid place-items-center text-sm text-neutral-500">
              No image yet
            </div>
          )}
        </Frame>

        {/* Date/time and below that: View Archive • Reveal News */}
        {stamp ? (
          <>
          <p className="text-sm text-neutral-700 text-center">{stamp}</p>
          {clusterLines.length > 0 ? (
            <NewsReveal clusters={clusterLines}>
              <Link
                href="/archive"
                className="underline underline-offset-2 decoration-current hover:opacity-80"
              >
                View Archive
              </Link>
            </NewsReveal>
          ) : (
            <p className="text-xs text-neutral-400 text-center">
              News details not available for this image.
            </p>
          )}
          </>
        ) : null}
      </div>

      <footer className="mt-4 mb-16 mt:mb-10 text-xs text-neutral-500">
       <div className="mx-auto max-w-md px-6 text-center leading-relaxed">
        <p className="mt-1 text-sm text-neutral-700">
          Created with OpenAI's GPT-image-1, GitHub, Vercel, Supabase, Cursor, Claude AI, ChatGPT.{" "}
          <br />
          <Link
            href="/process"
            className="underline underline-offset-2 hover:opacity-80"
          >
          Read about my process
          </Link>
          {" "} &rarr;
        </p>
        <p className="mt-4">© {new Date().getFullYear()} Liza Karimova</p>
       </div>
      </footer>
    </main>
  );
}
