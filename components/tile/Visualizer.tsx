'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import CompareSlider from '../CompareSlider';
import { FREE_GENERATIONS } from '@/lib/constants';
import type { DemoRoom } from '@/lib/demoRooms';
import { fileToJpeg, urlToJpeg } from '@/lib/image';
import { rasterizeToJpeg } from '@/lib/swatch';
import {
  GROUT_COLORS,
  ROOM_KINDS,
  SURFACES,
  TILE_SIZES,
  type LeadType,
  type SurfaceId,
  type Tile,
} from '@/lib/tiles';
import { useLocalStorage } from '@/lib/useLocalStorage';
import ApiKeyPanel from './ApiKeyPanel';
import LeadDialog, { type LeadFields } from './LeadDialog';
import RoomPicker from './RoomPicker';
import TileControls from './TileControls';
import TilePicker from './TilePicker';
import { tileImageSrc } from './TileThumb';
import type { Configs, Room, SurfaceConfig, Version } from './types';
import { useCatalog } from './useCatalog';

const LOADING_STATUSES = [
  '공간 구조 분석 중...',
  '타일 샘플 읽는 중...',
  '시공 패턴과 줄눈 배치 중...',
  '조명과 반사 맞추는 중...',
];

const DEFAULT_SURFACE: Record<string, SurfaceId> = {
  bathroom: 'wall',
  kitchen: 'backsplash',
  entrance: 'floor',
  living: 'floor',
  balcony: 'floor',
};

const DEFAULT_SIZE: Record<SurfaceId, string> = {
  floor: '600x600',
  wall: '300x600',
  backsplash: '100x300',
  shower: '300x600',
};

const IDLE_MS = 120_000;
const WARN_MS = 20_000;

function uid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
}

function sizeLabel(id: string): string {
  return TILE_SIZES.find((s) => s.id === id)?.label ?? id.replace('x', '×');
}

export default function Visualizer({
  kiosk = false,
  initialCollection,
}: {
  kiosk?: boolean;
  initialCollection?: string;
}) {
  const { data, error: catalogError, loading, reload } = useCatalog();
  const tiles = useMemo(() => data?.tiles ?? [], [data]);
  const tileById = useMemo(() => new Map(tiles.map((t) => [t.id, t])), [tiles]);
  const storeName = data?.settings.storeName ?? '타일 쇼룸';
  const showPrice = data?.settings.showPrice ?? false;

  /* 공간 */
  const [room, setRoom] = useState<Room | null>(null);
  const [roomKind, setRoomKind] = useState('bathroom');
  const [roomLoading, setRoomLoading] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);

  /* 선택 */
  const [surface, setSurface] = useState<SurfaceId>('wall');
  const [configs, setConfigs] = useState<Configs>({});

  /* 결과 버전 */
  const [versions, setVersions] = useState<Version[]>([]);
  const [viewId, setViewId] = useState('original');
  const [compare, setCompare] = useState(false);
  const [cmpA, setCmpA] = useState('original');
  const versionCount = useRef(0);

  /* 생성 */
  const [busy, setBusy] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [genError, setGenError] = useState<string | null>(null);

  /* 로컬 저장 값 */
  const [freeRaw, setFreeRaw] = useLocalStorage('reroom_free_generations', String(FREE_GENERATIONS));
  const freeCount = Number(freeRaw);
  const [byokRaw, setByokRaw] = useLocalStorage('reroom_byok_mode', 'false');
  const byokMode = byokRaw === 'true';
  const [byokKey, setByokKey] = useLocalStorage('reroom_byok_key', '');
  const [favRaw, setFavRaw] = useLocalStorage('reroom_favorites', '[]');
  const [staff, setStaff] = useLocalStorage('reroom_staff', '');
  const favorites = useMemo(() => {
    try {
      const arr = JSON.parse(favRaw) as unknown;
      return new Set(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : []);
    } catch {
      return new Set<string>();
    }
  }, [favRaw]);

  /* UI */
  const [lead, setLead] = useState<LeadType | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; link?: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, link?: string) => {
    setToast({ msg, link });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), link ? 8000 : 3000);
  }, []);

  /* ───────── 파생 값 ───────── */

  const sig = useMemo(() => JSON.stringify(SURFACES.map((s) => configs[s.id] ?? null)), [configs]);
  const configCount = Object.keys(configs).length;
  const pending = configCount > 0 && !versions.some((v) => v.sig === sig);
  const canApply = Boolean(room) && !busy && pending;

  const chosen = useMemo(() => {
    const o: Partial<Record<SurfaceId, string>> = {};
    for (const s of SURFACES) if (configs[s.id]) o[s.id] = configs[s.id]?.tileId;
    return o;
  }, [configs]);

  const activeConfig = configs[surface] ?? null;
  const activeTile = activeConfig ? (tileById.get(activeConfig.tileId) ?? null) : null;
  const surfaceDef = SURFACES.find((s) => s.id === surface) ?? SURFACES[0];

  const leadItems = useMemo(
    () =>
      SURFACES.flatMap((s) => {
        const c = configs[s.id];
        const t = c ? tileById.get(c.tileId) : undefined;
        return c && t ? [{ surface: s.id, tile: t, config: c }] : [];
      }),
    [configs, tileById]
  );

  const imageOf = (id: string): string | null =>
    id === 'original' ? (room?.src ?? null) : (versions.find((v) => v.id === id)?.image ?? null);
  const labelOf = (id: string): string =>
    id === 'original' ? '원본' : (versions.find((v) => v.id === id)?.label ?? '');

  const current = versions.find((v) => v.id === viewId) ?? null;

  /* ───────── 상태 변경 ───────── */

  const resetResults = useCallback(() => {
    setVersions([]);
    setViewId('original');
    setCompare(false);
    setCmpA('original');
    setGenError(null);
  }, []);

  const resetAll = useCallback(() => {
    setRoom(null);
    setConfigs({});
    setRoomError(null);
    setLead(null);
    setMenuOpen(false);
    resetResults();
  }, [resetResults]);

  const loadFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return setRoomError('이미지 파일(JPG, PNG, WebP)만 업로드할 수 있습니다.');
    if (file.size > 10 * 1024 * 1024) return setRoomError('파일 크기는 10MB를 초과할 수 없습니다.');
    setRoomLoading(true);
    setRoomError(null);
    try {
      const img = await fileToJpeg(file);
      setRoom({ src: img.src, w: img.w, h: img.h, label: file.name });
      setSurface(DEFAULT_SURFACE[roomKind] ?? 'floor');
      resetResults();
    } catch (e) {
      setRoomError(e instanceof Error ? e.message : '사진을 처리하지 못했습니다.');
    } finally {
      setRoomLoading(false);
    }
  };

  const loadDemo = async (d: DemoRoom) => {
    setRoomLoading(true);
    setRoomError(null);
    try {
      const img = await urlToJpeg(d.src);
      setRoom({ src: img.src, w: img.w, h: img.h, label: d.label });
      setRoomKind(d.kind);
      setSurface(DEFAULT_SURFACE[d.kind] ?? 'floor');
      resetResults();
    } catch (e) {
      setRoomError(e instanceof Error ? e.message : '데모룸을 불러오지 못했습니다.');
    } finally {
      setRoomLoading(false);
    }
  };

  const handleSelect = (tile: Tile) => {
    setConfigs((prev) => {
      const old = prev[surface];
      const allowed = (id: string) => tile.sizes.length === 0 || tile.sizes.includes(id);
      const sizeId =
        old && allowed(old.sizeId)
          ? old.sizeId
          : allowed(DEFAULT_SIZE[surface])
            ? DEFAULT_SIZE[surface]
            : (tile.sizes[0] ?? DEFAULT_SIZE[surface]);
      return {
        ...prev,
        [surface]: {
          tileId: tile.id,
          sizeId,
          layoutId: old?.layoutId ?? 'straight_h',
          groutHex: old?.groutHex ?? GROUT_COLORS[3].hex,
          groutMm: old?.groutMm ?? 3,
        },
      };
    });
  };

  const patchConfig = (patch: Partial<SurfaceConfig>) =>
    setConfigs((prev) => (prev[surface] ? { ...prev, [surface]: { ...(prev[surface] as SurfaceConfig), ...patch } } : prev));

  const removeConfig = () =>
    setConfigs((prev) => {
      const next = { ...prev };
      delete next[surface];
      return next;
    });

  const toggleFav = (id: string) => {
    const next = new Set(favorites);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setFavRaw(JSON.stringify([...next]));
  };

  const toggleCompare = () => {
    if (compare) return setCompare(false);
    if (versions.length === 0) return;
    const latest = versions[versions.length - 1].id;
    setViewId(viewId === 'original' ? latest : viewId);
    setCmpA('original');
    setCompare(true);
  };

  /* ───────── AI 적용 ───────── */

  const handleApply = async () => {
    if (!room) return setGenError('먼저 공간 사진을 올리거나 데모룸을 선택해 주세요.');
    if (!kiosk && !byokMode && freeCount <= 0) {
      return setGenError(
        `무료 체험 횟수(${FREE_GENERATIONS}회)를 모두 사용하셨습니다. 메뉴에서 "내 API 키로 무제한 사용"을 켜고 개인 API 키를 등록해 주세요.`
      );
    }
    if (byokMode && !byokKey.trim()) {
      return setGenError('API 키가 입력되지 않았습니다. 메뉴에서 AI Studio 키를 입력해 주세요.');
    }

    setBusy(true);
    setGenError(null);
    setLoadingStep(0);
    const interval = setInterval(() => setLoadingStep((p) => (p + 1) % LOADING_STATUSES.length), 2500);

    try {
      const applications = await Promise.all(
        SURFACES.flatMap((s) => {
          const c = configs[s.id];
          const t = c ? tileById.get(c.tileId) : undefined;
          const src = t ? tileImageSrc(t, 512) : null;
          if (!c || !t || !src) return [];
          return [rasterizeToJpeg(src, 512).then((swatch) => ({ surface: s.id, ...c, swatch }))];
        })
      );
      if (applications.length === 0) throw new Error('적용할 타일을 먼저 선택해 주세요.');

      const res = await fetch('/api/tile-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: room.src,
          roomKindId: roomKind,
          applications,
          byokKey: byokMode ? byokKey.trim() : null,
        }),
      });
      const body = (await res.json()) as { image?: string; error?: string };
      if (!res.ok || !body.image) throw new Error(body.error || '타일 적용에 실패했습니다.');

      versionCount.current += 1;
      const v: Version = {
        id: uid(),
        label: `적용 ${versionCount.current}`,
        image: `data:image/png;base64,${body.image}`,
        sig,
        configs: structuredClone(configs),
      };
      setVersions((prev) => [...prev, v].slice(-8));
      setViewId(v.id);
      setCompare(false);
      if (!kiosk && !byokMode) setFreeRaw(String(Math.max(0, freeCount - 1)));
    } catch (e) {
      setGenError(e instanceof Error ? e.message : '타일 적용 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      clearInterval(interval);
      setBusy(false);
    }
  };

  /* ───────── 공유 · 리드 ───────── */

  const ensureDesign = async (v: Version): Promise<string | null> => {
    if (v.designId) return v.designId;
    const res = await fetch('/api/designs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: v.image,
        roomKindId: roomKind,
        items: SURFACES.flatMap((s) => {
          const c = v.configs[s.id];
          return c ? [{ surface: s.id, tileId: c.tileId, sizeId: c.sizeId }] : [];
        }),
      }),
    });
    const body = (await res.json()) as { id?: string };
    if (!res.ok || !body.id) return null;
    const id = body.id;
    setVersions((prev) => prev.map((x) => (x.id === v.id ? { ...x, designId: id } : x)));
    return id;
  };

  const handleShare = async () => {
    if (!current) return showToast('먼저 타일을 적용해 결과를 만든 뒤 공유할 수 있습니다.');
    const id = await ensureDesign(current);
    if (!id) return showToast('공유 링크를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.');
    const link = `${window.location.origin}/d/${id}`;
    try {
      await navigator.clipboard.writeText(link);
      showToast('공유 링크를 복사했습니다.', link);
    } catch {
      showToast('아래 링크를 복사해 공유하세요.', link);
    }
  };

  const openLead = (type: LeadType) => {
    if (type === 'sample' && leadItems.length === 0) return showToast('샘플을 받을 타일을 먼저 선택해 주세요.');
    setLead(type);
  };

  const submitLead = async (type: LeadType, f: LeadFields): Promise<string | null> => {
    try {
      const designId = current ? await ensureDesign(current).catch(() => null) : null;
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          source: kiosk ? 'kiosk' : 'web',
          ...f,
          consent: true,
          roomKind,
          designId: designId ?? undefined,
          items: leadItems.map((i) => ({ surface: i.surface, tileId: i.tile.id, sizeId: i.config.sizeId })),
        }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) return body.error ?? '접수하지 못했습니다.';
      if (kiosk && f.staff) setStaff(f.staff);
      return null;
    } catch {
      return '네트워크 오류로 접수하지 못했습니다. 다시 시도해 주세요.';
    }
  };

  const handleDownload = () => {
    if (!current) return;
    const a = document.createElement('a');
    a.href = current.image;
    a.download = `tile_${roomKind}_${current.label.replace(/\s/g, '')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setMenuOpen(false);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
    setMenuOpen(false);
  };

  /* ───────── 매장 시연(키오스크) 유휴 초기화 ───────── */

  const lastActive = useRef(0);
  const [idleLeft, setIdleLeft] = useState<number | null>(null);
  const hasWork = Boolean(room) || configCount > 0;

  useEffect(() => {
    if (!kiosk) return;
    lastActive.current = Date.now();
    const bump = () => {
      lastActive.current = Date.now();
      setIdleLeft((p) => (p === null ? p : null));
    };
    const events = ['pointerdown', 'keydown', 'touchstart'] as const;
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const timer = setInterval(() => {
      if (!hasWork) return;
      const idle = Date.now() - lastActive.current;
      if (idle >= IDLE_MS + WARN_MS) {
        resetAll();
        lastActive.current = Date.now();
        setIdleLeft(null);
      } else if (idle >= IDLE_MS) {
        setIdleLeft(Math.ceil((IDLE_MS + WARN_MS - idle) / 1000));
      }
    }, 1000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      clearInterval(timer);
    };
  }, [kiosk, hasWork, resetAll]);

  /* ───────── 렌더 ───────── */

  const topBtn = `shrink-0 cursor-pointer rounded-xl border border-line bg-paper font-semibold text-ink transition-colors hover:border-line-strong ${
    kiosk ? 'px-5 py-3 text-sm' : 'px-3.5 py-2 text-xs'
  }`;

  if (loading || catalogError) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-paper text-center">
        {catalogError ? (
          <>
            <p className="text-sm text-ink-soft">{catalogError}</p>
            <button onClick={reload} className="cursor-pointer rounded-full bg-ink px-6 py-2.5 text-sm font-semibold text-paper hover:bg-clay">
              다시 시도
            </button>
          </>
        ) : (
          <p className="text-sm text-ink-soft" aria-live="polite">타일 카탈로그를 불러오는 중…</p>
        )}
      </div>
    );
  }

  const ratio = room ? room.w / room.h : 4 / 3;
  const shownA = compare ? imageOf(cmpA) : null;
  const shownB = imageOf(viewId);

  return (
    <div className="flex h-dvh flex-col bg-paper text-ink">
      {/* 상단 바 */}
      <header className="flex items-center gap-3 border-b border-line bg-paper-raised px-4 py-2.5 md:px-6">
        {kiosk ? (
          <button onClick={resetAll} className={topBtn}>처음으로</button>
        ) : (
          <Link href="/" className={`${topBtn} flex items-center gap-1`}>
            <span aria-hidden>←</span> 나가기
          </Link>
        )}
        {kiosk && (
          <input
            value={staff}
            onChange={(e) => setStaff(e.target.value)}
            placeholder="응대 담당자"
            aria-label="응대 담당자"
            className="hidden w-32 rounded-xl border border-line bg-paper px-3 py-3 text-sm text-ink placeholder-ink-faint focus:border-clay focus:outline-none md:block"
          />
        )}

        <nav className="ml-auto flex items-center gap-2 overflow-x-auto" aria-label="주요 작업">
          <button onClick={handleShare} className={topBtn}>공유</button>
          <button onClick={() => openLead('appointment')} className={topBtn}>상담 예약</button>
          <button onClick={() => openLead('sample')} className={topBtn}>샘플 주문</button>
          <button
            onClick={() => openLead('quote')}
            className={`shrink-0 cursor-pointer rounded-xl bg-ink font-bold text-paper transition-colors hover:bg-clay ${kiosk ? 'px-6 py-3 text-sm' : 'px-4 py-2 text-xs'}`}
          >
            견적 요청
          </button>
        </nav>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="메뉴"
            aria-expanded={menuOpen}
            className={`${topBtn} px-3`}
          >
            ⋮
          </button>
          {menuOpen && (
            <>
              <button aria-label="메뉴 닫기" className="fixed inset-0 z-30 cursor-default" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full z-40 mt-2 w-72 rounded-2xl border border-line bg-paper-raised p-3 shadow-deep animate-fade-in">
                <div className="flex flex-col gap-1 text-sm">
                  {room && (
                    <button
                      onClick={() => { resetAll(); }}
                      className="cursor-pointer rounded-lg px-3 py-2 text-left font-semibold hover:bg-sand"
                    >
                      다른 공간 사진으로 변경
                    </button>
                  )}
                  {current && (
                    <button onClick={handleDownload} className="cursor-pointer rounded-lg px-3 py-2 text-left font-semibold hover:bg-sand">
                      결과 이미지 다운로드
                    </button>
                  )}
                  <button onClick={toggleFullscreen} className="cursor-pointer rounded-lg px-3 py-2 text-left font-semibold hover:bg-sand">
                    전체 화면
                  </button>
                  {data?.settings.contactPhone && (
                    <a href={`tel:${data.settings.contactPhone}`} className="rounded-lg px-3 py-2 font-semibold hover:bg-sand">
                      매장 전화 {data.settings.contactPhone}
                    </a>
                  )}
                </div>
                {!kiosk && (
                  <div className="mt-2 border-t border-line pt-3">
                    <ApiKeyPanel
                      byokMode={byokMode}
                      onToggle={() => setByokRaw(String(!byokMode))}
                      byokKey={byokKey}
                      onKey={setByokKey}
                      freeCount={freeCount}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </header>

      {/* 본문 */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* 중앙 룸뷰 (모바일에서는 위쪽) */}
        <section className="order-first flex h-[48dvh] min-h-0 shrink-0 flex-col bg-sand/50 lg:order-last lg:h-auto lg:flex-1">
          {!room ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <RoomPicker
                kind={roomKind}
                onKind={setRoomKind}
                onFile={loadFile}
                onDemo={loadDemo}
                loading={roomLoading}
                error={roomError}
                kiosk={kiosk}
              />
            </div>
          ) : (
            <>
              <div
                className="flex min-h-0 flex-1 items-center justify-center p-3 md:p-5"
                style={{ containerType: 'size' }}
              >
                <div
                  className="relative overflow-hidden rounded-2xl border border-line bg-paper-raised shadow-deep"
                  style={{ aspectRatio: `${room.w} / ${room.h}`, width: `min(100cqw, calc(100cqh * ${ratio}))` }}
                >
                  {compare && shownA && shownB ? (
                    <CompareSlider
                      beforeSrc={shownA}
                      afterSrc={shownB}
                      beforeAlt={labelOf(cmpA)}
                      afterAlt={labelOf(viewId)}
                      beforeLabel={labelOf(cmpA)}
                      afterLabel={labelOf(viewId)}
                      aspectRatio={`${room.w} / ${room.h}`}
                      sizes="(max-width: 1024px) 100vw, 70vw"
                      className="rounded-none! border-0! shadow-none!"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={shownB ?? room.src} alt="타일을 적용한 공간" draggable={false} className="h-full w-full object-cover" />
                  )}

                  {/* 적용면 칩 */}
                  <ul className="absolute left-3 top-3 flex max-w-[85%] flex-wrap gap-1.5">
                    {SURFACES.map((s) => {
                      const t = configs[s.id] ? tileById.get(configs[s.id]?.tileId ?? '') : undefined;
                      const on = surface === s.id;
                      return (
                        <li key={s.id}>
                          <button
                            onClick={() => setSurface(s.id)}
                            className={`cursor-pointer rounded-full px-3 py-1.5 text-[11px] font-bold backdrop-blur-sm transition-colors ${
                              t ? 'bg-ink/80 text-paper' : 'bg-paper-raised/85 text-ink-soft'
                            } ${on ? 'ring-2 ring-clay' : ''}`}
                          >
                            {s.label}
                            {t ? ` · ${t.name}` : ''}
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                  {pending && current && !busy && (
                    <p className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-ink/80 px-4 py-1.5 text-[11px] font-semibold text-paper backdrop-blur-sm">
                      변경 사항이 있어요. &lsquo;AI로 적용하기&rsquo;를 눌러 반영하세요
                    </p>
                  )}

                  {busy && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink/45 backdrop-blur-sm" aria-live="polite">
                      <div className="flex items-center gap-2">
                        {[0, 150, 300].map((d) => (
                          <span key={d} className="h-2.5 w-2.5 animate-bounce rounded-full bg-paper" style={{ animationDelay: `${d}ms` }} />
                        ))}
                      </div>
                      <p className="text-sm font-semibold text-paper">{LOADING_STATUSES[loadingStep]}</p>
                      <p className="text-xs text-paper/70">약 10~20초 걸립니다</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 결과 버전 스트립 */}
              {versions.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto px-4 pb-2 md:px-6" aria-label="적용 결과 목록">
                  {['original', ...versions.map((v) => v.id)].map((id) => {
                    const src = imageOf(id);
                    return (
                      <button
                        key={id}
                        onClick={() => setViewId(id)}
                        aria-pressed={viewId === id}
                        className={`shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 ${viewId === id ? 'border-clay' : 'border-transparent hover:border-line-strong'}`}
                        title={labelOf(id)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {src && <img src={src} alt={labelOf(id)} className="h-12 w-16 object-cover" draggable={false} />}
                        <span className="block bg-paper-raised px-1 py-0.5 text-[10px] font-semibold text-ink-soft">{labelOf(id)}</span>
                      </button>
                    );
                  })}
                  {compare && (
                    <div className="ml-2 flex shrink-0 items-center gap-1.5 text-xs text-ink-soft">
                      기준
                      <select
                        value={cmpA}
                        onChange={(e) => setCmpA(e.target.value)}
                        className="rounded-lg border border-line bg-paper px-2 py-1.5 text-xs font-semibold text-ink"
                        aria-label="비교 기준 이미지"
                      >
                        {['original', ...versions.map((v) => v.id)].map((id) => (
                          <option key={id} value={id}>{labelOf(id)}</option>
                        ))}
                      </select>
                      결과
                      <select
                        value={viewId}
                        onChange={(e) => setViewId(e.target.value)}
                        className="rounded-lg border border-line bg-paper px-2 py-1.5 text-xs font-semibold text-ink"
                        aria-label="비교 결과 이미지"
                      >
                        {['original', ...versions.map((v) => v.id)].map((id) => (
                          <option key={id} value={id}>{labelOf(id)}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {genError && (
                <div role="alert" className="mx-4 mb-2 flex items-start justify-between gap-3 rounded-xl border border-clay/30 bg-clay-soft p-3 text-xs leading-relaxed text-clay-deep md:mx-6">
                  <span>{genError}</span>
                  <button onClick={() => setGenError(null)} aria-label="오류 닫기" className="cursor-pointer text-clay-deep/70 hover:text-clay-deep">✕</button>
                </div>
              )}

              <TileControls
                surface={surfaceDef}
                tile={activeTile}
                config={activeConfig}
                showPrice={showPrice}
                kiosk={kiosk}
                busy={busy}
                canApply={canApply}
                pending={pending}
                hasVersions={versions.length > 0}
                compare={compare}
                onChange={patchConfig}
                onRemove={removeConfig}
                onToggleCompare={toggleCompare}
                onApply={handleApply}
              />
            </>
          )}
        </section>

        {/* 타일 선택 패널 (모바일에서는 아래쪽) */}
        <TilePicker
          tiles={tiles}
          collections={data?.collections ?? []}
          storeName={storeName}
          showPrice={showPrice}
          kiosk={kiosk}
          surface={surface}
          onSurface={setSurface}
          chosen={chosen}
          onSelect={handleSelect}
          favorites={favorites}
          onToggleFav={toggleFav}
          initialCollectionId={initialCollection}
        />
      </div>

      {/* 방 종류 표시(접근성용) */}
      <p className="sr-only">현재 공간: {ROOM_KINDS.find((r) => r.id === roomKind)?.label}</p>

      {lead && (
        <LeadDialog
          type={lead}
          kiosk={kiosk}
          storeName={storeName}
          defaultStaff={staff}
          items={leadItems.map((i) => ({ surface: i.surface, name: i.tile.name, sizeLabel: sizeLabel(i.config.sizeId) }))}
          onSubmit={(f) => submitLead(lead, f)}
          onClose={() => setLead(null)}
        />
      )}

      {toast && (
        <div role="status" className="fixed bottom-6 left-1/2 z-50 flex max-w-[92vw] -translate-x-1/2 flex-col items-center gap-1 rounded-2xl bg-ink px-5 py-3 text-center text-sm font-semibold text-paper shadow-deep animate-fade-in">
          {toast.msg}
          {toast.link && <span className="select-all break-all text-xs font-normal text-paper/70">{toast.link}</span>}
        </div>
      )}

      {kiosk && idleLeft !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 p-6 backdrop-blur-sm" role="alertdialog" aria-live="assertive">
          <div className="max-w-sm rounded-3xl bg-paper-raised p-8 text-center shadow-deep">
            <p className="font-display text-xl font-bold text-ink">계속 사용하시겠어요?</p>
            <p className="mt-2 text-sm text-ink-soft">{idleLeft}초 뒤 처음 화면으로 돌아갑니다.</p>
            <button
              onClick={() => { lastActive.current = Date.now(); setIdleLeft(null); }}
              className="mt-5 cursor-pointer rounded-full bg-ink px-8 py-3 text-sm font-semibold text-paper hover:bg-clay"
            >
              계속하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
