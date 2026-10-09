import { NextRequest, NextResponse } from 'next/server';
import {
  COOKIE_OPTIONS,
  DEALER_COOKIE,
  authConfigured,
  authOpenInDev,
  checkPassword,
  isDealer,
  issueToken,
} from '@/lib/server/auth';
import { clientIp, fail, readJson } from '@/lib/server/http';
import { take } from '@/lib/server/ratelimit';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    authenticated: await isDealer(),
    configured: authConfigured(),
    openInDev: authOpenInDev(),
  });
}

export async function POST(req: NextRequest) {
  if (!authConfigured()) {
    return fail('서버에 DEALER_PASSWORD 환경변수가 설정되어 있지 않습니다.', 500);
  }
  if (!take(`login:${clientIp(req)}`, 10, 15 * 60_000)) {
    return fail('로그인 시도가 너무 많습니다. 15분 뒤 다시 시도해 주세요.', 429);
  }
  const body = await readJson<{ password?: string }>(req);
  if (!body?.password || !checkPassword(String(body.password))) {
    return fail('비밀번호가 올바르지 않습니다.', 401);
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(DEALER_COOKIE, issueToken(), COOKIE_OPTIONS);
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(DEALER_COOKIE, '', { ...COOKIE_OPTIONS, maxAge: 0 });
  return res;
}
