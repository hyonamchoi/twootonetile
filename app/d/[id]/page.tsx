import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { readDb } from '@/lib/server/db';
import { ROOM_KINDS, SURFACES } from '@/lib/tiles';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

async function load(id: string) {
  if (!/^[a-f0-9]{16}$/.test(id)) return null;
  const db = await readDb();
  const design = db.designs.find((d) => d.id === id);
  return design ? { design, store: db.settings.storeName } : null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const found = await load(id);
  if (!found) return { title: '공유된 디자인' };
  return {
    title: `타일 시뮬레이션 — ${found.store}`,
    description: found.design.items.map((i) => i.name).join(', ') || '타일 시뮬레이션 결과',
    openGraph: { images: [{ url: `/api/designs/${id}` }] },
    robots: { index: false },
  };
}

/** 공유 링크로 열리는 시뮬레이션 결과 페이지 */
export default async function SharedDesign({ params }: Params) {
  const { id } = await params;
  const found = await load(id);
  if (!found) notFound();
  const { design, store } = found;
  const room = ROOM_KINDS.find((r) => r.id === design.roomKind)?.label;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-clay">{store}</p>
        <h1 className="font-display mt-2 text-3xl font-bold tracking-tight text-ink">
          {room ? `${room} 타일 시뮬레이션` : '타일 시뮬레이션'}
        </h1>
      </header>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/designs/${id}`} alt="타일을 적용한 공간" className="w-full rounded-2xl border border-line shadow-deep" />

      {design.items.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-ink">사용한 타일</h2>
          <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-paper-raised">
            {design.items.map((it) => (
              <li key={it.surface} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                <span className="text-ink-soft">{SURFACES.find((s) => s.id === it.surface)?.label}</span>
                <span className="text-right font-semibold text-ink">
                  {it.name}
                  <span className="ml-2 text-xs font-normal text-ink-faint">
                    {it.sku} · {it.sizeId.replace('x', '×')}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link
        href="/visualizer"
        className="self-start rounded-full bg-ink px-8 py-3.5 text-sm font-semibold text-paper shadow-lift transition-colors hover:bg-clay"
      >
        내 공간에도 적용해 보기
      </Link>
    </main>
  );
}
