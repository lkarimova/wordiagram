// src/lib/utils/auth.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * Returns a 401 response if Basic Auth fails; returns null if:
 *  - creds are correct, or
 *  - BASIC_AUTH_USER/PASS are missing (auth disabled)
 */
export function basicAuth(req: NextRequest): NextResponse | null {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASS;

  // Auth “off” when creds are not set
  if (!user || !pass) return null;

  const header = req.headers.get("authorization");
  if (!header?.startsWith("Basic ")) {
    return new NextResponse("Unauthorized", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Restricted"' },
    });
  }

  try {
    const base64 = header.slice(6);
    const [u, p] = Buffer.from(base64, "base64").toString().split(":");
    if (u === user && p === pass) return null;
  } catch {
    /* fall through */
  }

  return new NextResponse("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Restricted"' },
  });
}
