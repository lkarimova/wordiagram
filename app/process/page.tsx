export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import { listArchive } from "@/src/server/supabase";
import { formatInTimeZone } from "date-fns-tz";
import { config } from "@/src/lib/config";
import { LightCursor } from "@/src/components/LightCursor";

const CUTOFF_DATE = "2025-11-06";
const tz = config.timezone || "America/New_York";

export default async function ProcessPage() {
  const items = await listArchive(365); // or higher if you need deeper history
  const processItems = items.filter((i) => i.date < CUTOFF_DATE);

  return (
    <main className="min-h-screen text-black">
      <div
        id="process-root"
        className="relative max-w-6xl mx-auto px-4 py-10"
      >
        {/* Glow overlay for this page */}
        <LightCursor attachToSelector="#process-root" />
  
        {/* Title + description – keep above glow */}
        <div className="relative z-30 flex justify-between items-center mb-6">
          <h1 className="text-xl font-medium">My Process</h1>
          <Link href="/" className="underline">
            Back to today
          </Link>
        </div>
        
        <div className="relative z-30">
        <p className="text-sm text-neutral-700 mb-10 leading-relaxed">
          11/06/2025
          <br />{" "}
          <br />
          I have been learning how to code for past 3 weeks. As someone that has
          never coded before, this was a fun and challenging first project. I
          learned what API&apos;s, GitHub, Vercel, Supabase were, and how to use
          Cursor, Claude and Chat GPT to build a project that uses backend to
          <span className="font-bold text-black"> pull in live data,</span> process it through prompt engineering, and <span className="font-bold text-black">render meaningfulimages.</span> Please feel free to{" "}
          <a
            href="mailto:lkarimova.design@gmail.com"
            className="font-bold text-black underline underline-offset-2 hover:text-neutral-600"
          >
            contact
          </a>{" "}
          me with questions and feedback. I hope you enjoy this project!
        </p>

        <p className="text-sm text-neutral-700 mb-10 leading-relaxed">
          <span className="font-medium text-xl text-black">Challenges</span>
          <br />
          Most of the work focused on backend challenges: making the prompt
          safe, building a logic that interprets headlines as symbols rather
          than literal text, and experimenting with clustering and update
          cadence to <span className="font-bold text-black">balance coherence with variation.</span> Getting the AI engine to
          think metaphorically instead of descriptively was surprisingly
          difficult, since <span className="font-bold text-black">randomness is discouraged in most models</span>, and I had
          to design a clear decision logic.
          <br />{" "}
          <br />
          <span className="font-bold italic text-black">
          1. Balancing Autonomy vs. Control in Image Generation:
          </span>{" "}
          Getting GPT-Image-1 to produce consistent yet symbolic paintings was
          difficult, because it tended to either over-abstract
          or over-literalize. I spent a lot of
          effort <span className="font-bold text-black">fine-tuning prompts, negative prompts, and structural “locks”</span> to
          find the right balance between freedom and compositional discipline.
          <br />{" "}
          <br />
          <span className="font-bold italic text-black">
          2.Creating a Dynamic Generation Logic for Breaking News:
          </span>{" "}
          Designing a stable pipeline that generated an image only when meaningful
          changes occurred was challenging. I had to define what qualified as breaking news. It included <span className="font-bold text-black">creating thresholds
          for recency, cluster change, and number of news sources</span> so the system reacted to real global shifts while not over-generating images.
          <br />{" "}
          <br />
          <span className="font-bold italic text-black">
          3. Prompt Composition, Safety &amp; Data Interpretation:
          </span>{" "}
          Linking world news clusters semantically to symbolic visual motifs demanded
          experimentation. I started with <span className="font-bold text-black">keyword-based clustering,</span> but it felt too vague and generic.
          I then tried <span className="font-bold text-black">embedding-based clustering (using text-embedding-3-small)</span> which introduced complexity, but gave much richer results. This semantic version managed to capture relationships between
          global headlines more meaningfully. I had to handle<span className="font-bold text-black"> OpenAI safety rejections </span>
          by sanitizing harsh language and abstracting violent or sensitive terms. I also created <span className="font-bold text-black">fallback heuristics for edge cases</span> through post-processing, such as breaking earthquake news showing up as magnitude numbers "M 5.0" without descriptors.
        </p>

        <p className="text-sm text-neutral-700 mb-10 leading-relaxed">
          <span className="font-medium text-xl text-black">Learnings</span>
          <br />{" "}
          <br />
          <span className="font-bold text-black">1. Creativity lies in constraint.</span> Randomness is not encouraged, so decision logic becomes extremely
          important.
          <br />
          <span className="font-bold text-black">2. Precision in logic design is what enables open-ended expression.</span> It&apos;s hard to make AI not take things literally, but certain
          things need to be defined.
          <br />
          <span className="font-bold text-black">3. GPT-Image-1 has some distinct limitations: </span>
          (a) It cannot do <span className="font-bold text-black">additive masked image edits</span> without regenerating the
          entire image, (b) it cannot <span className="font-bold text-black">derive artistic style</span> from words without interpretation
          logic, and (c) it cannot <span className="font-bold text-black">apply artistic style</span> without modifying the image content.
          </p>

          <p className="text-sm text-neutral-700 mb-4 leading-relaxed italic">
          (I originally started off with asking GPT-Image-1 to determine the
          image style based on World Art News. I also asked it to keep updating
          images with masked, additive edits based on breaking World and Art
          news. Through trial and error, I learned that those things were not
          possible, and that my design had to be simplified.)
        </p>

        <p className="text-sm text-neutral-700 mb-4 leading-relaxed">
          Paintings from older prompt iterations are displayed below.
        </p>
        </div>

        {processItems.length === 0 ? (
          <p className="relative z-30 text-sm text-neutral-600">
            No earlier images to display.
          </p>
        ) : (
        <div className="relative z-10 mt-4">  
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {processItems.map((p) => {
              const src = p.image_url;
              const bust = `${src}${
                src.includes("?") ? "&" : "?"
              }v=${encodeURIComponent(p.id)}`;
              
              const stamp = p.created_at
                ? formatInTimeZone(
                    new Date(p.created_at),
                    tz,
                    "MMM d, yyyy • HH:mm 'ET'"
                  )
                : p.date; // fallback if there's no created_at

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
                    {stamp}
                  </p>
                </div>
              );
            })}
          </div>
          </div>
        )}
      </div>
    </main>
  );
}
