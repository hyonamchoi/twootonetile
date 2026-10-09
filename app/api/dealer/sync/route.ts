import { NextResponse } from 'next/server';
import { runSync } from '@/lib/server/catalogIO';
import { requireDealer } from '@/lib/server/http';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** 설정된 피드 URL에서 지금 바로 카탈로그를 동기화 */
export async function POST() {
  const denied = await requireDealer();
  if (denied) return denied;
  return NextResponse.json(await runSync());
}
