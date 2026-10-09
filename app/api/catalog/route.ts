import { NextResponse } from 'next/server';
import { readDb } from '@/lib/server/db';
import { maybeAutoSync } from '@/lib/server/catalogIO';
import type { PublicCatalog } from '@/lib/tiles';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 소비자 화면용 공개 카탈로그: 노출 중인 컬렉션의 활성 타일만 내려준다. */
export async function GET() {
  void maybeAutoSync().catch(() => undefined);

  const db = await readDb();
  const visible = new Set(db.collections.filter((c) => c.visible).map((c) => c.id));
  const known = new Set(db.collections.map((c) => c.id));

  const tiles = db.tiles
    .filter((t) => t.active && (!t.collectionId || !known.has(t.collectionId) || visible.has(t.collectionId)))
    .map((t) => {
      const { imageSource: _imageSource, ...rest } = t;
      void _imageSource;
      return db.settings.showPrice ? rest : { ...rest, price: undefined };
    });

  const body: PublicCatalog = {
    tiles,
    collections: db.collections
      .filter((c) => c.visible)
      .sort((a, b) => a.order - b.order),
    settings: {
      storeName: db.settings.storeName,
      showPrice: db.settings.showPrice,
      contactPhone: db.settings.contactPhone,
    },
  };
  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
}
