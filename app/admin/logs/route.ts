import { NextRequest, NextResponse } from 'next/server';
import { basicAuth } from '@/lib/utils/auth';

export async function GET(request: NextRequest) {
  const auth = basicAuth(request);
  if (auth) return auth;
  return NextResponse.json({ logs: [] });
}
