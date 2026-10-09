import { NextRequest, NextResponse } from 'next/server';
import { mutateDb, readDb } from '@/lib/server/db';
import { fail, readJson, requireDealer } from '@/lib/server/http';
import { assertPublicHttpsUrl } from '@/lib/server/netguard';

export const runtime = 'nodejs';

type Body = {
  storeName?: string;
  showPrice?: boolean;
  contactPhone?: string;
  feedUrl?: string;
  autoSyncHours?: number;
};

export async function GET() {
  const denied = await requireDealer();
  if (denied) return denied;
  return NextResponse.json((await readDb()).settings);
}

export async function PUT(req: NextRequest) {
  const denied = await requireDealer();
  if (denied) return denied;
  const b = await readJson<Body>(req);
  if (!b) return fail('요청 형식이 올바르지 않습니다.');

  const feedUrl = typeof b.feedUrl === 'string' ? b.feedUrl.trim() : undefined;
  if (feedUrl) {
    try {
      await assertPublicHttpsUrl(feedUrl);
    } catch (e) {
      return fail(e instanceof Error ? e.message : '피드 URL이 올바르지 않습니다.');
    }
  }

  const settings = await mutateDb((db) => {
    const s = db.settings;
    if (typeof b.storeName === 'string' && b.storeName.trim()) s.storeName = b.storeName.trim().slice(0, 40);
    if (typeof b.showPrice === 'boolean') s.showPrice = b.showPrice;
    if (typeof b.contactPhone === 'string') s.contactPhone = b.contactPhone.trim().slice(0, 20) || undefined;
    if (feedUrl !== undefined) {
      if (feedUrl === '') delete s.feed;
      else {
        const hours = Number.isFinite(b.autoSyncHours) ? Math.max(0, Math.min(168, Math.round(b.autoSyncHours as number))) : (s.feed?.autoSyncHours ?? 0);
        s.feed = { ...s.feed, url: feedUrl, autoSyncHours: hours };
      }
    }
    return structuredClone(s);
  });
  return NextResponse.json(settings);
}
