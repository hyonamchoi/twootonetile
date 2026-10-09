import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { mutateDb } from '@/lib/server/db';
import { clientIp, fail, readJson } from '@/lib/server/http';
import { take } from '@/lib/server/ratelimit';
import { SURFACE_IDS, type Lead, type LeadItem, type LeadType, type SurfaceId } from '@/lib/tiles';

export const runtime = 'nodejs';

type Body = {
  type?: string;
  source?: string;
  name?: string;
  phone?: string;
  region?: string;
  preferredDate?: string;
  memo?: string;
  staff?: string;
  roomKind?: string;
  designId?: string;
  consent?: boolean;
  items?: { surface?: string; tileId?: string; sizeId?: string }[];
};

const TYPES: LeadType[] = ['sample', 'appointment', 'quote', 'showroom'];
const clean = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

/** 소비자의 샘플 주문·상담 예약·견적 요청을 리드(CRM)로 저장한다. */
export async function POST(req: NextRequest) {
  if (!take(`lead:${clientIp(req)}`, 10, 3600_000)) {
    return fail('요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.', 429);
  }
  const b = await readJson<Body>(req);
  if (!b) return fail('요청 형식이 올바르지 않습니다.');

  if (b.consent !== true) return fail('개인정보 수집·이용에 동의해 주세요.');
  const type = TYPES.find((t) => t === b.type);
  if (!type) return fail('요청 유형이 올바르지 않습니다.');

  const name = clean(b.name, 40);
  if (!name) return fail('이름을 입력해 주세요.');
  const phone = clean(b.phone, 20).replace(/[^\d]/g, '');
  if (!/^0\d{8,10}$/.test(phone)) return fail('연락처를 올바르게 입력해 주세요. (예: 010-1234-5678)');

  const preferredDate = clean(b.preferredDate, 10);
  if (preferredDate && !/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) return fail('희망일 형식이 올바르지 않습니다.');
  if (type === 'appointment' && !preferredDate) return fail('희망 방문일을 선택해 주세요.');

  const lead = await mutateDb((db): Lead | string => {
    const items: LeadItem[] = [];
    for (const it of (b.items ?? []).slice(0, 8)) {
      const tile = db.tiles.find((t) => t.id === it.tileId);
      const surface = it.surface as SurfaceId;
      if (!tile || !SURFACE_IDS.includes(surface)) continue;
      items.push({
        surface,
        tileId: tile.id,
        sku: tile.sku,
        brand: tile.brand,
        name: tile.name,
        sizeId: clean(it.sizeId, 12),
      });
    }
    if (type === 'sample' && items.length === 0) return '샘플을 받을 타일을 먼저 선택해 주세요.';

    const designId = clean(b.designId, 16);
    const now = new Date().toISOString();
    const created: Lead = {
      id: randomUUID().slice(0, 12),
      createdAt: now,
      updatedAt: now,
      type,
      status: 'new',
      source: b.source === 'kiosk' ? 'kiosk' : 'web',
      name,
      phone,
      region: clean(b.region, 60) || undefined,
      preferredDate: preferredDate || undefined,
      memo: clean(b.memo, 500) || undefined,
      staff: clean(b.staff, 30) || undefined,
      roomKind: clean(b.roomKind, 20) || undefined,
      items,
      designId: designId && db.designs.some((d) => d.id === designId) ? designId : undefined,
      consentAt: now,
      notes: [],
    };
    db.leads.unshift(created);
    return created;
  });

  if (typeof lead === 'string') return fail(lead);
  return NextResponse.json({ id: lead.id });
}
