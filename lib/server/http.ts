import { NextResponse } from 'next/server';
import { isDealer } from './auth';

export function fail(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

/** 딜러 전용 라우트 상단에서 호출. 인증 실패 시 응답을 돌려준다. */
export async function requireDealer(): Promise<NextResponse | null> {
  return (await isDealer()) ? null : fail('딜러 로그인이 필요합니다.', 401);
}

export function clientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}
