import { NextRequest, NextResponse } from 'next/server';
import { deleteTile } from '@/lib/server/catalogIO';
import { mutateDb } from '@/lib/server/db';
import { fail, readJson, requireDealer } from '@/lib/server/http';

export const runtime = 'nodejs';

type Patch = { active?: boolean; collectionId?: string | null; price?: number | null };

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireDealer();
  if (denied) return denied;
  const { id } = await ctx.params;
  const p = await readJson<Patch>(req);
  if (!p) return fail('요청 형식이 올바르지 않습니다.');

  const result = await mutateDb((db) => {
    const t = db.tiles.find((x) => x.id === id);
    if (!t) return 'notfound' as const;
    if (typeof p.active === 'boolean') t.active = p.active;
    if (p.collectionId !== undefined) {
      if (p.collectionId === null || p.collectionId === '') delete t.collectionId;
      else if (db.collections.some((c) => c.id === p.collectionId)) t.collectionId = p.collectionId;
      else return 'badcollection' as const;
    }
    if (p.price !== undefined) {
      if (p.price === null) delete t.price;
      else if (Number.isFinite(p.price) && p.price >= 0 && p.price < 100_000_000) t.price = Math.round(p.price);
    }
    t.updatedAt = new Date().toISOString();
    return 'ok' as const;
  });

  if (result === 'notfound') return fail('타일을 찾을 수 없습니다.', 404);
  if (result === 'badcollection') return fail('컬렉션이 올바르지 않습니다.');
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireDealer();
  if (denied) return denied;
  const { id } = await ctx.params;
  return (await deleteTile(id)) ? NextResponse.json({ ok: true }) : fail('타일을 찾을 수 없습니다.', 404);
}
