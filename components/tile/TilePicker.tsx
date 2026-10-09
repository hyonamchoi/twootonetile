'use client';

import { useMemo, useState } from 'react';
import {
  COLOR_FAMILIES,
  FINISHES,
  MATERIALS,
  MAX_SURFACES_PER_APPLY,
  SURFACES,
  materialOf,
  formatWon,
  type Collection,
  type ColorFamily,
  type Finish,
  type MaterialId,
  type SurfaceId,
  type Tile,
} from '@/lib/tiles';
import TileThumb from './TileThumb';

type Props = {
  tiles: Tile[];
  collections: Collection[];
  showPrice: boolean;
  kiosk: boolean;
  surface: SurfaceId;
  onSurface: (s: SurfaceId) => void;
  /** 적용면별로 현재 고른 타일 id */
  chosen: Partial<Record<SurfaceId, string>>;
  onSelect: (tile: Tile) => void;
  favorites: Set<string>;
  onToggleFav: (id: string) => void;
  /** 랜딩 컬렉션 카드에서 넘어온 초기 컬렉션 */
  initialCollectionId?: string;
};

function Heart({ on }: { on: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 21s-7-4.35-9.5-9C.9 8.5 3 5 6.5 5c2 0 4 1 5.5 3 1.500-2 3.5-3 5.5-3C21 5 23.1 8.500 21.5 12 19 16.65 12 21 12 21z"
        fill={on ? '#0a0a0a' : 'none'}
        stroke={on ? '#0a0a0a' : 'currentColor'}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function TilePicker({
  tiles,
  collections,
  showPrice,
  kiosk,
  surface,
  onSurface,
  chosen,
  onSelect,
  favorites,
  onToggleFav,
  initialCollectionId,
}: Props) {
  const [query, setQuery] = useState('');
  const [collectionId, setCollectionId] = useState<string>(() =>
    initialCollectionId && collections.some((c) => c.id === initialCollectionId) ? initialCollectionId : 'all'
  );
  const [material, setMaterial] = useState<'all' | MaterialId>('all');
  const [colors, setColors] = useState<ColorFamily[]>([]);
  const [finishes, setFinishes] = useState<Finish[]>([]);
  const [onlyFav, setOnlyFav] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const selectedCount = Object.keys(chosen).length;
  // 이미 최대 개수를 골랐고 현재 면은 아직 안 골랐다면, 이 면의 타일은 고를 수 없다
  const locked = selectedCount >= MAX_SURFACES_PER_APPLY && !chosen[surface];

  const order = useMemo(() => new Map(collections.map((c) => [c.id, c.order])), [collections]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tiles
      .filter((t) => t.surfaces.includes(surface))
      .filter((t) => collectionId === 'all' || t.collectionId === collectionId)
      .filter((t) => material === 'all' || materialOf(t) === material)
      .filter((t) => colors.length === 0 || colors.includes(t.color))
      .filter((t) => finishes.length === 0 || finishes.includes(t.finish))
      .filter((t) => !onlyFav || favorites.has(t.id))
      .filter(
        (t) =>
          !q ||
          [t.name, t.sku, t.brand, t.series ?? '', t.origin ?? ''].some((v) => v.toLowerCase().includes(q))
      )
      .sort(
        (a, b) =>
          (order.get(a.collectionId ?? '') ?? 999) - (order.get(b.collectionId ?? '') ?? 999) ||
          a.name.localeCompare(b.name, 'ko')
      );
  }, [tiles, surface, collectionId, material, colors, finishes, onlyFav, favorites, query, order]);

  const activeFilters = colors.length + finishes.length + (onlyFav ? 1 : 0);
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const chip = (on: boolean) =>
    `cursor-pointer rounded-full border px-3 ${kiosk ? 'py-2 text-sm' : 'py-1.5 text-xs'} font-semibold transition-colors ${
      on ? 'border-ink bg-ink text-paper' : 'border-line bg-paper text-ink-soft hover:border-line-strong hover:text-ink'
    }`;

  return (
    <aside className="flex min-h-0 flex-1 flex-col border-line bg-paper-raised lg:w-[340px] lg:flex-none lg:border-r">
      <div className="border-b border-line px-5 pb-4 pt-5">
        {/* 적용면 선택 — 6열 격자에서 윗줄 3개·아랫줄 2개로 나눠 5개 버튼이 균형 있게 배치되도록 한다 */}
        <div className="grid grid-cols-6 gap-2" role="tablist" aria-label="적용면">
          {SURFACES.map((s, i) => {
            const on = surface === s.id;
            const done = Boolean(chosen[s.id]);
            return (
              <button
                key={s.id}
                role="tab"
                aria-selected={on}
                onClick={() => onSurface(s.id)}
                className={`flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border px-1 font-semibold transition-colors ${
                  i < 3 ? 'col-span-2' : 'col-span-3'
                } ${kiosk ? 'py-3.5 text-[15px]' : 'py-2.5 text-[13px]'} ${on ? 'border-ink bg-ink text-paper shadow-lift' : 'border-line bg-paper text-ink-soft hover:border-line-strong hover:text-ink'}`}
              >
                {done && <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-paper' : 'bg-clay'}`} />}
                {s.label}
              </button>
            );
          })}
        </div>

        <p className="mt-2 text-[11px] text-ink-faint" aria-live="polite">
          한 번에 최대 {MAX_SURFACES_PER_APPLY}곳까지 적용 ·{' '}
          <b className={selectedCount >= MAX_SURFACES_PER_APPLY ? 'text-ink' : 'text-ink-soft'}>
            선택 {selectedCount}/{MAX_SURFACES_PER_APPLY}
          </b>
        </p>

        {/* 소재: 타일 / 엔지니어드 스톤 */}
        <div className="mt-3 flex gap-1.5" role="group" aria-label="소재">
          {[{ id: 'all' as const, label: '전체' }, ...MATERIALS].map((m) => (
            <button key={m.id} onClick={() => setMaterial(m.id)} className={chip(material === m.id)}>
              {m.label}
            </button>
          ))}
        </div>

        {/* 검색 · 필터 · 즐겨찾기 · 보기 방식 */}
        <div className="mt-3 flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="제품 검색 (이름·품번·브랜드)"
            aria-label="제품 검색"
            className={`min-w-0 flex-1 rounded-xl border border-line bg-paper px-3 text-ink placeholder-ink-faint focus:border-clay focus:outline-none ${
              kiosk ? 'py-3 text-base' : 'py-2 text-sm'
            }`}
          />
          <button
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            className={`relative cursor-pointer rounded-xl border px-3 text-xs font-semibold transition-colors ${kiosk ? 'py-3' : 'py-2.5'} ${
              showFilters || activeFilters ? 'border-ink text-ink' : 'border-line text-ink-soft hover:border-line-strong'
            }`}
          >
            필터{activeFilters > 0 && <span className="ml-1 text-clay">{activeFilters}</span>}
          </button>
          <button
            onClick={() => setOnlyFav((v) => !v)}
            aria-pressed={onlyFav}
            aria-label="즐겨찾기만 보기"
            className={`cursor-pointer rounded-xl border px-2.5 transition-colors ${kiosk ? 'py-3' : 'py-2.5'} ${
              onlyFav ? 'border-clay bg-clay-soft text-clay' : 'border-line text-ink-soft hover:border-line-strong'
            }`}
          >
            <Heart on={onlyFav} />
          </button>
          <button
            onClick={() => setView((v) => (v === 'grid' ? 'list' : 'grid'))}
            aria-label={view === 'grid' ? '목록으로 보기' : '격자로 보기'}
            className={`cursor-pointer rounded-xl border border-line px-2.5 text-ink-soft transition-colors hover:border-line-strong ${kiosk ? 'py-3' : 'py-2.5'}`}
          >
            {view === 'grid' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="4" y="4" width="6.5" height="6.5" stroke="currentColor" strokeWidth="2" />
                <rect x="13.5" y="4" width="6.5" height="6.5" stroke="currentColor" strokeWidth="2" />
                <rect x="4" y="13.5" width="6.5" height="6.5" stroke="currentColor" strokeWidth="2" />
                <rect x="13.5" y="13.5" width="6.5" height="6.5" stroke="currentColor" strokeWidth="2" />
              </svg>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="mt-3 flex flex-col gap-3 rounded-xl border border-line bg-paper p-3">
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-faint">색상</p>
              <div className="flex flex-wrap gap-1.5">
                {COLOR_FAMILIES.map((c) => (
                  <button key={c} onClick={() => setColors((l) => toggle(l, c))} className={chip(colors.includes(c))}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-faint">마감</p>
              <div className="flex flex-wrap gap-1.5">
                {FINISHES.map((f) => (
                  <button key={f} onClick={() => setFinishes((l) => toggle(l, f))} className={chip(finishes.includes(f))}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            {activeFilters > 0 && (
              <button
                onClick={() => {
                  setColors([]);
                  setFinishes([]);
                  setOnlyFav(false);
                }}
                className="cursor-pointer self-start text-xs font-semibold text-clay underline underline-offset-2"
              >
                필터 초기화
              </button>
            )}
          </div>
        )}

        {/* 컬렉션(트렌드) 바로가기 */}
        {collections.length > 0 && (
          <div className="-mx-5 mt-3 flex gap-1.5 overflow-x-auto px-5 pb-1" role="group" aria-label="컬렉션">
            <button onClick={() => setCollectionId('all')} className={`${chip(collectionId === 'all')} shrink-0`}>
              전체
            </button>
            {collections.map((c) => (
              <button
                key={c.id}
                onClick={() => setCollectionId(c.id)}
                title={c.description}
                className={`${chip(collectionId === c.id)} shrink-0`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 타일 목록 */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {locked && (
          <p role="status" className="mb-3 rounded-xl border border-line-strong bg-sand p-3 text-xs leading-relaxed text-ink-soft">
            이미 {MAX_SURFACES_PER_APPLY}곳을 선택했어요. 다른 면의 &lsquo;제거&rsquo;를 누르면 이 면을 고를 수 있습니다.
          </p>
        )}
        {visible.length === 0 ? (
          <p className="py-12 text-center text-sm text-ink-faint">
            조건에 맞는 타일이 없습니다.
            <br />
            필터를 바꿔 보세요.
          </p>
        ) : view === 'grid' ? (
          <ul className="grid grid-cols-3 gap-2.5">
            {visible.map((t) => {
              const on = chosen[surface] === t.id;
              return (
                <li key={t.id} className="relative">
                  <button
                    onClick={() => onSelect(t)}
                    disabled={locked}
                    title={`${t.name} · ${t.brand}`}
                    aria-pressed={on}
                    className={`block w-full cursor-pointer overflow-hidden rounded-lg border-2 transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                      on ? 'border-clay shadow-lift' : 'border-transparent hover:border-line-strong'
                    }`}
                  >
                    <TileThumb tile={t} className="aspect-square w-full" />
                  </button>
                  <button
                    onClick={() => onToggleFav(t.id)}
                    aria-label={favorites.has(t.id) ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                    aria-pressed={favorites.has(t.id)}
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-paper-raised/90 text-ink-soft backdrop-blur-sm hover:text-clay"
                  >
                    <Heart on={favorites.has(t.id)} />
                  </button>
                  <p className="mt-1 truncate text-[11px] font-medium text-ink-soft">{t.name}</p>
                </li>
              );
            })}
          </ul>
        ) : (
          <ul className="flex flex-col gap-2">
            {visible.map((t) => {
              const on = chosen[surface] === t.id;
              return (
                <li key={t.id} className="relative">
                  <button
                    onClick={() => onSelect(t)}
                    disabled={locked}
                    aria-pressed={on}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border p-2 pr-10 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      on ? 'border-clay bg-clay-soft' : 'border-line bg-paper hover:border-line-strong'
                    }`}
                  >
                    <TileThumb tile={t} className="h-14 w-14 shrink-0 rounded-lg" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink">{t.name}</span>
                      <span className="block truncate text-xs text-ink-soft">
                        {t.brand} · {t.finish}
                      </span>
                      {showPrice && t.price ? (
                        <span className="block text-xs text-ink-faint">{formatWon(t.price)}/㎡</span>
                      ) : null}
                    </span>
                  </button>
                  <button
                    onClick={() => onToggleFav(t.id)}
                    aria-label={favorites.has(t.id) ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                    aria-pressed={favorites.has(t.id)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-ink-soft hover:text-clay"
                  >
                    <Heart on={favorites.has(t.id)} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
