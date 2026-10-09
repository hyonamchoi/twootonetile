import { NextRequest, NextResponse } from 'next/server';
import { importRows, parseFeedText } from '@/lib/server/catalogIO';
import { fail, readJson, requireDealer } from '@/lib/server/http';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** CSV/JSON 텍스트로 카탈로그를 일괄 등록(품번 기준 업서트) */
export async function POST(req: NextRequest) {
  const denied = await requireDealer();
  if (denied) return denied;
  const body = await readJson<{ text?: string }>(req);
  if (!body?.text || typeof body.text !== 'string') return fail('가져올 파일 내용이 비어 있습니다.');
  if (body.text.length > 8 * 1024 * 1024) return fail('파일이 너무 큽니다. (최대 8MB)', 413);
  try {
    const rows = parseFeedText(body.text);
    if (rows.length === 0) return fail('가져올 행이 없습니다. 첫 줄에 헤더가 있는지 확인해 주세요.');
    return NextResponse.json(await importRows(rows));
  } catch (e) {
    return fail(e instanceof Error ? e.message : '파일을 읽지 못했습니다.');
  }
}
