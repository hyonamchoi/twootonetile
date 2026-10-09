import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { mutateDb } from '@/lib/server/db';
import { fail, readJson, requireDealer } from '@/lib/server/http';

export const runtime = 'nodejs';

type Item = { id?: string; name?: string; description?: string; visible?: boolean };

/** 컬렉션 일괄 저장: 순서(배열 순서), 이름, 설명, 노출 여부. 새 항목은 id 없이 보낸다. */
export async function PUT(req: NextRequest) {
  const denied = await requireDealer();
  if (denied) return denied;
  const body = await readJson<{ collections?: Item[] }>(req);
  const list = body?.collections;
  if (!Array.isArray(list) || list.length > 200) return fail('컬렉션 목록이 올바르지 않습니다.');

  const saved = await mutateDb((db) => {
    const next = list
      .filter((c) => typeof c.name === 'string' && c.name.trim())
      .map((c, i) => ({
        id: c.id && db.collections.some((x) => x.id === c.id) ? c.id : `c-${randomUUID().slice(0, 8)}`,
        name: String(c.name).trim().slice(0, 60),
        description: String(c.description ?? '').trim().slice(0, 200) || undefined,
        visible: c.visible !== false,
        order: i + 1,
      }));
    const ids = new Set(next.map((c) => c.id));
    // 삭제된 컬렉션에 속한 타일은 미분류로 돌린다
    db.tiles.forEach((t) => {
      if (t.collectionId && !ids.has(t.collectionId)) delete t.collectionId;
    });
    db.collections = next;
    return next;
  });
  return NextResponse.json({ collections: saved });
}
