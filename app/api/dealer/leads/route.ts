import { NextResponse } from 'next/server';
import { readDb } from '@/lib/server/db';
import { requireDealer } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const denied = await requireDealer();
  if (denied) return denied;
  const db = await readDb();
  return NextResponse.json(
    { leads: db.leads },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
