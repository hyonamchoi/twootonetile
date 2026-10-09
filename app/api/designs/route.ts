import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { DESIGN_DIR, mutateDb, readDb } from '@/lib/server/db';
import { clientIp, fail, readJson } from '@/lib/server/http';
import { take } from '@/lib/server/ratelimit';
import { ROOM_KINDS, SURFACE_IDS, type SurfaceId } from '@/lib/tiles';

export const runtime = 'nodejs';

type Body = {
  image?: string;
  roomKindId?: string;
  items?: { surface?: string; tileId?: string; sizeId?: string }[];
};

/** 생성된 시뮬레이션 이미지를 저장하고 공유용 id를 돌려준다. */
export async function POST(req: NextRequest) {
  if (!take(`design:${clientIp(req)}`, 60, 24 * 3600_000)) {
    return fail('저장 한도를 초과했습니다. 내일 다시 시도해 주세요.', 429);
  }
  const body = await readJson<Body>(req);
  const m = body?.image?.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);
  if (!body || !m) return fail('이미지 형식이 올바르지 않습니다.');
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 6 * 1024 * 1024) return fail('이미지가 너무 큽니다.', 413);

  const db = await readDb();
  const items = (body.items ?? [])
    .slice(0, 4)
    .flatMap((it) => {
      const tile = db.tiles.find((t) => t.id === it.tileId);
      const surface = it.surface as SurfaceId;
      if (!tile || !SURFACE_IDS.includes(surface)) return [];
      return [{ surface, tileId: tile.id, name: tile.name, sku: tile.sku, sizeId: String(it.sizeId ?? '').slice(0, 12) }];
    });

  const id = randomUUID().replace(/-/g, '').slice(0, 16);
  const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
  const file = `${id}.${ext}`;
  await fs.mkdir(DESIGN_DIR, { recursive: true });
  await fs.writeFile(path.join(DESIGN_DIR, file), buf);

  const roomKind = ROOM_KINDS.find((r) => r.id === body.roomKindId)?.id;
  await mutateDb((d) => {
    d.designs.push({ id, createdAt: new Date().toISOString(), roomKind, file, items });
    // 디스크 보호: 오래된 디자인 파일은 최근 500개만 유지
    while (d.designs.length > 500) {
      const old = d.designs.shift();
      if (old) void fs.rm(path.join(DESIGN_DIR, old.file), { force: true });
    }
  });

  return NextResponse.json({ id });
}
