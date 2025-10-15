// lib/utils/auth.ts
import { NextRequest, NextResponse } from "next/server";

export function basicAuth(req: NextRequest): NextResponse | null {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASS;

  if (!user || !pass) {
    return NextResponse.json("Unauthorized", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Logs"' },
    });
  }

  const header = req.headers.get("authorization") || "";
  if (!header.startsWith("Basic ")) {
    return NextResponse.json("Unauthorized", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Logs"' },
    });
  }

  const b64 = header.slice(6).trim();
  const decoded =
    typeof (globalThis as any).atob === "function"
      ? (globalThis as any).atob(b64)
      : Buffer.from(b64, "base64").toString("utf8");

  const idx = decoded.indexOf(":");
  const givenUser = decoded.slice(0, idx);
  const givenPass = decoded.slice(idx + 1);

  if (givenUser !== user || givenPass !== pass) {
    return NextResponse.json("Unauthorized", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Logs"' },
    });
  }

  return null;
}
