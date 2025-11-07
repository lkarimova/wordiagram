export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import { listArchive } from "@/src/server/supabase";
import { formatInTimeZone } from "date-fns-tz";
import { config } from "@/src/lib/config";

const CUTOFF_DATE = "2025-11-06";
const tz = config.timezone || "America/New_York";

export default async function ProcessPage() {
  const items = await listArchive(365); // or higher if you need deeper history
  const processItems = items.filter((i) => i.date < CUTOFF_DATE);

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-medium">My Process</h1>
          <Link href="/" className="underline">
            Back to today
          </Link>
        </div>

        <p className="text-base text-neutral-600 mb-4">
          <span className="text-black">11/06/2025</span>
          <br />{" "}
          <br />
          I have been learning how to code for past 3 weeks. As someone that has
          never coded before, this was a fun and challenging first project. I
          learned what API&apos;s, GitHub, Vercel, Supabase were, and how to use
          Cursor, Claude and Chat GPT to build a project that uses backend to
          <span className="font-bold">pull in live data, process it through prompt engineering, and render
          images representing meaning.</span> I hope you enjoy this project! Please feel free to{" "}
          <a
            href="mailto:lkarimova.design@gmail.com"
            className="font-bold underline underline-offset-2 hover:text-neutral-600"
          >
            contact
          </a>{" "}
          me with questions and feedback.
        </p>

        <p className="text-base text-neutral-600 mb-4">
          <span className="font-bold text-lg text-black">Challenges:</span>
          <br />
          Most of the work focused on backend challenges: making the prompt
          safe, building a logic that interprets headlines as symbols rather
          than literal text, and experimenting with clustering and update
          cadence to balance coherence with variation. Getting the AI engine to
          think metaphorically instead of descriptively was surprisingly
          difficult, since <span className="font-bold">randomness is discouraged in most models</span>, and I had
          to design a clear decision logic.
          <br />{" "}
          <br />
          1.{" "}
          <span className="font-bold text-black">
            Balancing Autonomy vs. Control in Image Generation:
          </span>{" "}
          Getting GPT-Image-1 to produce consistent yet symbolic paintings was
          difficult, because it tended to either over-abstract
          or over-literalize. I spent a lot of
          effort <span className="font-bold">tuning prompts, negative prompts, and structural “locks”</span> to
          find the right balance between freedom and compositional discipline.
          <br />
          2.{" "}
          <span className="font-bold text-black">
            Creating a Dynamic Generation Logic for Breaking News:
          </span>{" "}
          Designing a stable pipeline that generated an image only when meaningful
          changes occurred was challenging. I had to define what qualified as breaking news. It included <span className="font-bold">creating thresholds
          for news recency, news cluster change, and number of news sources so the system reacted to real global shifts</span> while not over-generating images.
          <br />
          3.{" "}
          <span className="font-bold text-black">
            Prompt Composition, Safety &amp; Data Interpretation:
          </span>{" "}
          Linking world news clusters semantically to symbolic visual motifs demanded
          experimentation. I started with <span className="font-bold">keyword-based clustering, but it felt too vague and generic</span>.
          I then tried <span className="font-bold">embedding-based clustering (using text-embedding-3-small) which introduced complexity, but gave much richer results</span>. This semantic version managed to capture relationships between
          global headlines more meaningfully. I had to <span className="font-bold">handle OpenAI safety rejections
          by sanitizing harsh language and abstracting violent or sensitive terms</span>. I also created <span className="font-bold">fallback heuristics for edge cases through post-processing</span>, such as breaking earthquake news showing up as magnitude numbers "M 5.0" without descriptors.
        </p>

        <p className="text-base text-neutral-600 mb-4">
          <span className="font-bold text-lg text-black">Learnings:</span>
          <br />
          Through this process, I learned how sensitive generative systems are
          to framing, and <span className="font-bold">how much creativity lies in constraint</span>. It taught me
          that <span className="font-bold">precision in logic design is what enables open-ended expression</span>.
          <br />{" "}
          <br />
          1. It&apos;s hard to make AI not take things literally, but certain
          things need to be defined.
          <br />
          2. Randomness is not encouraged, so decision logic becomes extremely
          important.
          <br />
          3. GPT-Image-1 has some distinct limitations<sup className="text-xs align-super">*</sup>:
          <br />
          <span className="block indent-8">
          - It cannot do additive masked image edits without regenerating the
          entire image
          </span>
          <br />
          <span className="block indent-8">
          - It cannot derive artistic style from words without interpretation
          logic.
          </span>
          <br />
          <span className="block indent-8">
          - It cannot apply an artistic style without modifying the content of
          the image.
          </span>
          </p>

          <p className="text-base text-neutral-600 mb-4">
          <sup className="text-xs align-super">*</sup>I originally started off with asking GPT-Image-1 to determine the
          image style based on World Art News. I also asked it to keep updating
          images with masked, additive edits based on breaking World and Art
          news. Through trial and error, I learned that those things were not
          possible, and that my design had to be simplified.
        </p>

        <p className="text-base text-neutral-600 mb-4">
          Paintings from older prompt iterations are displayed below.
        </p>

        {processItems.length === 0 ? (
          <p className="text-base text-neutral-600">
            No earlier images to display.
          </p>
        ) : (
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
        )}
      </div>
    </main>
  );
}
