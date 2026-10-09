import { NextResponse } from 'next/server';
import { readDb } from '@/lib/server/db';
import { requireDealer } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 딜러 콘솔용 전체 카탈로그(비활성·숨김 포함) */
export async function GET() {
  const denied = await requireDealer();
  if (denied) return denied;
  const db = await readDb();
  return NextResponse.json(
    { tiles: db.tiles, collections: db.collections, settings: db.settings },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
