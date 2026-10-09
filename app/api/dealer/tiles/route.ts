import { NextRequest, NextResponse } from 'next/server';
import { importRows } from '@/lib/server/catalogIO';
import { fail, readJson, requireDealer } from '@/lib/server/http';

export const runtime = 'nodejs';

/** 타일 1개 등록/수정 (품번 기준 업서트). 이미지는 data URL 또는 https URL. */
export async function POST(req: NextRequest) {
  const denied = await requireDealer();
  if (denied) return denied;
  const body = await readJson<Record<string, unknown>>(req);
  if (!body) return fail('요청 형식이 올바르지 않습니다.');
  try {
    const r = await importRows([body]);
    if (r.failed > 0) return fail(r.messages[0] ?? '등록하지 못했습니다.');
    return NextResponse.json(r);
  } catch (e) {
    return fail(e instanceof Error ? e.message : '등록하지 못했습니다.');
  }
}
