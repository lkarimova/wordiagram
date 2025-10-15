export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (token !== process.env.CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }
  const kind = (url.searchParams.get("kind") ?? "both") as "world" | "art" | "both";

  // TODO: your update logic
  // await runUpdate({ kind });

  return new Response(JSON.stringify({ ok: true, kind }), { status: 200 });
}
