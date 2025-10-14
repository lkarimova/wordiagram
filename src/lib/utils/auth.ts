import { NextRequest, NextResponse } from 'next/server';

export function basicAuth(request: NextRequest): NextResponse | null {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASS;
  if (!user || !pass) return null; // disabled if not set

  const header = request.headers.get('authorization');
  if (!header || !header.startsWith('Basic ')) {
    return new NextResponse('Auth required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Secure"' },
    });
  }
  const base64 = header.replace('Basic ', '');
  const [u, p] = Buffer.from(base64, 'base64').toString().split(':');
  if (u !== user || p !== pass) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  return null;
}
