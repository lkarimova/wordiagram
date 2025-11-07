export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import { listArchive } from "@/src/server/supabase";

const CUTOFF_DATE = "2025-11-06";

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

        <p className="text-sm text-neutral-600 mb-4">
          11/06/2025
          <br />
          I have been learning how to code for past 3 weeks. As someone that has
          never coded before, this was a fun and challenging first project. I
          learned what API&apos;s, GitHub, Vercel, Supabase were, and how to use
          Cursor, Claude and Chat GPT to build a project that uses backend to
          pull in live data, process it through prompt engineering, and render
          images representing meaning.
        </p>

        <p className="text-sm text-neutral-600 mb-4">
          <span className="font-bold">Main Challenges:</span>
          <br />
          Most of the work focused on backend challenges: making the prompt
          safe, building a logic that interprets headlines as symbols rather
          than literal text, and experimenting with clustering and update
          cadence to balance coherence with variation. Getting the AI engine to
          think metaphorically instead of descriptively was surprisingly
          difficult, since randomness is discouraged in most models, and I had
          to design a clear decision logic.
          <br />{" "}
          <br />
          1.{" "}
          <span className="font-bold">
            Balancing Autonomy vs. Control in Image Generation:
          </span>{" "}
          Getting GPT-Image-1 to produce consistent yet symbolic paintings was
          difficult, because it tended to either over-abstract (losing meaning)
          or over-literalize (turning into illustrations). I spent a lot of
          effort tuning prompts, negative prompts, and structural “locks” to
          find the right balance between freedom and compositional discipline.
          <br />
          2.{" "}
          <span className="font-bold">
            Creating a Dynamic Generation Logic for Breaking News:
          </span>{" "}
          Designing a stable pipeline that fetched live world news, semantically
          clustered headlines, and generated an image only when meaningful
          changes occurred was challenging. It included tuning thresholds
          (recency, cluster change, number of sources) so the system didn&apos;t
          over-generate, while still reacting to real global shifts.
          <br />
          3.{" "}
          <span className="font-bold">
            Prompt Composition, Safety &amp; Data Interpretation:
          </span>{" "}
          Linking world news clusters to symbolic visual motifs demanded
          experimentation: keyword-based clustering often felt too shallow,
          while embedding-based clustering introduced latency and complexity. I
          eventually built a semantic version to capture relationships between
          global headlines more meaningfully. I handled OpenAI safety rejections
          by sanitizing harsh language, abstracting violent or sensitive terms,
          and refining the symbolic prompt style.
        </p>

        <p className="text-sm text-neutral-600 mb-4">
          <span className="font-bold">Learnings:</span>
          <br />
          Through this process, I learned how sensitive generative systems are
          to framing, and how much creativity lies in constraint. It taught me
          that precision in logic design is what enables open-ended expression.
          <br />
          1. It&apos;s hard to make AI not take things literally, but certain
          things need to be defined.
          <br />
          2. Randomness is not encouraged, so decision logic becomes extremely
          important.
          <br />
          3. GPT-Image-1 has some distinct limitations:
          <br />
          - It cannot do additive masked image edits without regenerating the
          entire image
          <br />
          - It cannot derive artistic style from words without interpretation
          logic.
          <br />
          - It cannot apply an artistic style without modifying the content of
          the image.
          <br />
          I originally started off with asking GPT-Image-1 to determine the
          image style based on World Art News. I also asked it to keep updating
          images with masked, additive edits based on breaking World and Art
          news. Through trial and error, I learned that those things were not
          possible, and that my design had to be simplified.
        </p>

        <p className="text-sm text-neutral-600 mb-4">
          I hope you enjoy this project! Please feel free to{" "}
          <a
            href="mailto:lkarimova.design@gmail.com"
            className="underline hover:text-neutral-600"
          >
            contact
          </a>{" "}
          me with questions and feedback.
        </p>

        <p className="text-sm text-neutral-600 mb-4">
          Paintings from older prompt iterations are displayed below.
        </p>

        {processItems.length === 0 ? (
          <p className="text-sm text-neutral-600">
            No earlier images to display.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {processItems.map((p) => {
              const src = p.image_url;
              const bust = `${src}${
                src.includes("?") ? "&" : "?"
              }v=${encodeURIComponent(p.id)}`;
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
                    {p.date}
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
