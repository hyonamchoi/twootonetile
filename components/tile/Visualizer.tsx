'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import CompareSlider from '../CompareSlider';
import { FREE_GENERATIONS, UNLIMITED_TRIAL } from '@/lib/constants';
import type { DemoRoom } from '@/lib/demoRooms';
import { fileToJpeg, fitToSize, nearestAspect, urlToJpeg } from '@/lib/image';
import { rasterizeToJpeg } from '@/lib/swatch';
import {
  GROUT_COLORS,
  MAX_SURFACES_PER_APPLY,
  isSlabSurface,
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
import ResultViewer, { type ViewerItem } from './ResultViewer';
import RoomPicker from './RoomPicker';
import TileControls from './TileControls';
import TilePicker from './TilePicker';
import TileThumb, { tileImageSrc } from './TileThumb';
import type { Configs, Room, Space, SurfaceConfig, Version } from './types';
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
  countertop: '1200x1200',
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

  /* 여러 공간: 활성 공간은 아래 개별 state가 원본이고, 나머지는 spaces에 보관한다 */
  const [pickKind, setPickKind] = useState('bathroom');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [adding, setAdding] = useState(false);

  /* 선택 */
  const [surface, setSurface] = useState<SurfaceId>('wall');
  const [configs, setConfigs] = useState<Configs>({});

  /* 결과 버전 */
  const [versions, setVersions] = useState<Version[]>([]);
  const [viewId, setViewId] = useState('original');
  const [compare, setCompare] = useState(false);
  const [cmpA, setCmpA] = useState('original');

  /* 생성 */
  const [busy, setBusy] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [genError, setGenError] = useState<string | null>(null);

  /* 로컬 저장 값 */
  const [freeRaw, setFreeRaw] = useLocalStorage('twotone_free_generations', String(FREE_GENERATIONS));
  const freeCount = Number(freeRaw);
  const [byokRaw, setByokRaw] = useLocalStorage('twotone_byok_mode', 'false');
  const byokMode = byokRaw === 'true';
  const [byokKey, setByokKey] = useLocalStorage('twotone_byok_key', '');
  const [favRaw, setFavRaw] = useLocalStorage('twotone_favorites', '[]');
  const [staff, setStaff] = useLocalStorage('twotone_staff', '');
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
  const [keyOpen, setKeyOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
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

  const liveSpace = useMemo<Space | null>(
    () => (room && activeId ? { id: activeId, roomKind, room, surface, configs, versions, viewId, compare, cmpA } : null),
    [activeId, roomKind, room, surface, configs, versions, viewId, compare, cmpA]
  );
  const allSpaces = useMemo(
    () => spaces.map((sp) => (sp.id === activeId && liveSpace ? liveSpace : sp)),
    [spaces, activeId, liveSpace]
  );

  // 견적·샘플 요청에는 시뮬레이션한 모든 공간의 선택을 담는다
  const leadItems = useMemo(
    () =>
      allSpaces.flatMap((sp) =>
        SURFACES.flatMap((s) => {
          const c = sp.configs[s.id];
          const t = c ? tileById.get(c.tileId) : undefined;
          return c && t ? [{ roomKind: sp.roomKind, surface: s.id, tile: t, config: c }] : [];
        })
      ),
    [allSpaces, tileById]
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
    setSpaces([]);
    setActiveId(null);
    setAdding(false);
    setRoomError(null);
    setLead(null);
    setMenuOpen(false);
    setViewerOpen(false);
    resetResults();
  }, [resetResults]);

  const loadSpace = (sp: Space) => {
    setRoom(sp.room);
    setRoomKind(sp.roomKind);
    setSurface(sp.surface);
    setConfigs(sp.configs);
    setVersions(sp.versions);
    setViewId(sp.viewId);
    setCompare(sp.compare);
    setCmpA(sp.cmpA);
    setGenError(null);
    setActiveId(sp.id);
    setAdding(false);
    setViewerOpen(false);
  };

  const switchSpace = (id: string) => {
    if (busy) return;
    if (id === activeId) return setAdding(false);
    const target = allSpaces.find((sp) => sp.id === id);
    if (!target) return;
    setSpaces(allSpaces);
    loadSpace(target);
  };

  const enterNewSpace = (r: Room, kind: string) => {
    const fresh: Space = {
      id: uid(),
      roomKind: kind,
      room: r,
      surface: DEFAULT_SURFACE[kind] ?? 'floor',
      configs: {},
      versions: [],
      viewId: 'original',
      compare: false,
      cmpA: 'original',
    };
    setSpaces([...allSpaces, fresh]);
    loadSpace(fresh);
  };

  const removeSpace = (id: string) => {
    if (busy) return;
    if (!window.confirm('이 공간의 선택과 결과가 삭제됩니다. 삭제할까요?')) return;
    const rest = allSpaces.filter((sp) => sp.id !== id);
    if (rest.length === 0) return resetAll();
    setSpaces(rest);
    if (id === activeId) loadSpace(rest[rest.length - 1]);
  };

  const startAdding = () => {
    const used = new Set(allSpaces.map((sp) => sp.roomKind));
    setPickKind(ROOM_KINDS.find((r) => !used.has(r.id))?.id ?? pickKind);
    setRoomError(null);
    setAdding(true);
  };

  const loadFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return setRoomError('이미지 파일(JPG, PNG, WebP)만 업로드할 수 있습니다.');
    if (file.size > 10 * 1024 * 1024) return setRoomError('파일 크기는 10MB를 초과할 수 없습니다.');
    setRoomLoading(true);
    setRoomError(null);
    try {
      const img = await fileToJpeg(file);
      enterNewSpace({ src: img.src, w: img.w, h: img.h, label: file.name }, pickKind);
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
      enterNewSpace({ src: img.src, w: img.w, h: img.h, label: d.label }, d.kind);
    } catch (e) {
      setRoomError(e instanceof Error ? e.message : '데모룸을 불러오지 못했습니다.');
    } finally {
      setRoomLoading(false);
    }
  };

  const handleSelect = (tile: Tile) => {
    setConfigs((prev) => {
      const old = prev[surface];
      // 새 면을 추가하는데 이미 최대 개수라면 무시 (선택 화면에서도 막지만 한 번 더 방어)
      if (!old && Object.keys(prev).length >= MAX_SURFACES_PER_APPLY) return prev;
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
    if (!UNLIMITED_TRIAL && !kiosk && !byokMode && freeCount <= 0) {
      setKeyOpen(true);
      return setGenError(
        `무료 체험 횟수(${FREE_GENERATIONS}회)를 모두 사용하셨습니다. 상단의 API 키 버튼에서 "내 API 키로 무제한 사용"을 켜고 개인 API 키를 등록해 주세요.`
      );
    }
    if (byokMode && !byokKey.trim()) {
      setKeyOpen(true);
      return setGenError('API 키가 입력되지 않았습니다. 상단의 API 키 입력란에 AI Studio 키를 입력해 주세요.');
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
          aspectRatio: nearestAspect(room.w / room.h),
          applications,
          byokKey: byokMode ? byokKey.trim() : null,
        }),
      });
      const body = (await res.json()) as { image?: string; error?: string };
      if (!res.ok || !body.image) throw new Error(body.error || '타일 적용에 실패했습니다.');

      // 결과 크기를 원본과 정확히 일치시킨다
      const fitted = await fitToSize(`data:image/png;base64,${body.image}`, room.w, room.h);
      const n = Math.max(0, ...versions.map((x) => parseInt(x.label.replace(/\D/g, ''), 10) || 0)) + 1;
      const v: Version = {
        id: uid(),
        label: `적용 ${n}`,
        image: fitted,
        sig,
        configs: structuredClone(configs),
      };
      setVersions((prev) => [...prev, v].slice(-8));
      setViewId(v.id);
      setCompare(false);
      if (!UNLIMITED_TRIAL && !kiosk && !byokMode) setFreeRaw(String(Math.max(0, freeCount - 1)));
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
          items: leadItems.map((i) => ({ roomKind: i.roomKind, surface: i.surface, tileId: i.tile.id, sizeId: i.config.sizeId })),
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

  const downloadVersion = (v: Version) => {
    const a = document.createElement('a');
    a.href = v.image;
    a.download = `tile_${roomKind}_${v.label.replace(/\s/g, '')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownload = () => {
    if (!current) return;
    downloadVersion(current);
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

  const spaceLabel = (sp: Space): string => {
    const base = ROOM_KINDS.find((r) => r.id === sp.roomKind)?.label ?? '공간';
    const same = allSpaces.filter((x) => x.roomKind === sp.roomKind);
    return same.length > 1 ? `${base} ${same.indexOf(sp) + 1}` : base;
  };

  const spaceTabs = room && (
    <div className="flex items-center gap-2 overflow-x-auto px-4 pt-3 md:px-6" role="tablist" aria-label="공간">
      {allSpaces.map((sp) => {
        const on = !adding && sp.id === activeId;
        const applied = Object.keys(sp.configs).length;
        return (
          <div
            key={sp.id}
            className={`flex shrink-0 items-center rounded-full border transition-colors ${
              on ? 'border-ink bg-ink text-paper' : 'border-line bg-paper-raised text-ink-soft hover:border-line-strong'
            }`}
          >
            <button
              role="tab"
              aria-selected={on}
              onClick={() => switchSpace(sp.id)}
              disabled={busy}
              className={`cursor-pointer font-semibold disabled:cursor-not-allowed ${kiosk ? 'py-2.5 pl-4 text-sm' : 'py-1.5 pl-3.5 text-xs'} ${
                allSpaces.length > 1 ? 'pr-1.5' : 'pr-3.5'
              }`}
            >
              {spaceLabel(sp)}
              {applied > 0 && <span className={`ml-1.5 ${on ? 'text-paper/70' : 'text-clay'}`}>●{applied}</span>}
            </button>
            {allSpaces.length > 1 && (
              <button
                onClick={() => removeSpace(sp.id)}
                disabled={busy}
                aria-label={`${spaceLabel(sp)} 공간 삭제`}
                className="cursor-pointer pr-3 text-[11px] opacity-60 hover:opacity-100 disabled:cursor-not-allowed"
              >
                ✕
              </button>
            )}
          </div>
        );
      })}
      <button
        onClick={startAdding}
        disabled={busy}
        className={`shrink-0 cursor-pointer rounded-full border border-dashed font-semibold transition-colors disabled:cursor-not-allowed ${
          adding ? 'border-clay bg-clay-soft text-clay' : 'border-line-strong text-ink-soft hover:border-ink hover:text-ink'
        } ${kiosk ? 'px-4 py-2.5 text-sm' : 'px-3.5 py-1.5 text-xs'}`}
      >
        + 다른 공간 추가
      </button>
    </div>
  );

  /** 선택한 결과(원본 포함)에 적용된 면·타일 조합 */
  const versionItems = (id: string) => {
    const v = versions.find((x) => x.id === id);
    if (!v) return [];
    return SURFACES.flatMap((s) => {
      const c = v.configs[s.id];
      const t = c ? tileById.get(c.tileId) : undefined;
      return c && t ? [{ surface: s, tile: t, config: c }] : [];
    });
  };

  const renderVersionDetail = (id: string) => {
    const items = versionItems(id);
    return (
      <div key={id} className="flex flex-nowrap items-center gap-x-4 gap-y-1.5 overflow-x-auto whitespace-nowrap lg:flex-wrap lg:whitespace-normal" aria-label={`${labelOf(id)} 적용 내역`}>
        <span className="shrink-0 text-[11px] font-bold text-ink">{labelOf(id)}</span>
        {id === 'original' ? (
          <span className="text-[11px] text-ink-faint">원본 사진 (변경 없음)</span>
        ) : items.length === 0 ? (
          <span className="text-[11px] text-ink-faint">적용 내역이 없습니다</span>
        ) : (
          items.map((i) => (
            <span key={i.surface.id} className="flex shrink-0 items-center gap-1.5 text-[11px] text-ink-soft">
              <TileThumb tile={i.tile} className="h-5 w-5 shrink-0 rounded border border-line" px={64} />
              <b className="font-semibold text-ink">{i.surface.label}</b>
              {i.tile.name}
              {!isSlabSurface(i.surface.id) && <span className="text-ink-faint">· {sizeLabel(i.config.sizeId)}</span>}
            </span>
          ))
        )}
      </div>
    );
  };

  const keyFull = byokMode
    ? byokKey.trim()
      ? '내 API 키 · 무제한'
      : 'API 키 입력'
    : UNLIMITED_TRIAL
      ? '테스트 모드'
      : `무료 ${freeCount}/${FREE_GENERATIONS}회`;
  const keyShort = byokMode ? (byokKey.trim() ? '무제한' : '키 입력') : UNLIMITED_TRIAL ? '테스트' : `${freeCount}/${FREE_GENERATIONS}`;

  const showRoom = Boolean(room) && !adding;

  // 전체 화면 뷰어에 넘길 항목 (원본 + 적용 결과, 각 결과의 적용 내역 포함)
  const viewerItems: ViewerItem[] = ['original', ...versions.map((v) => v.id)].flatMap((id) => {
    const src = imageOf(id);
    if (!src) return [];
    return [
      {
        id,
        label: labelOf(id),
        src,
        details: versionItems(id).map((i) => ({
          key: i.surface.id,
          surface: i.surface.label,
          name: i.tile.name,
          size: isSlabSurface(i.surface.id) ? undefined : sizeLabel(i.config.sizeId),
          thumb: tileImageSrc(i.tile, 64),
        })),
      },
    ];
  });

  const ratio = room ? room.w / room.h : 4 / 3;
  const shownA = compare ? imageOf(cmpA) : null;
  const shownB = imageOf(viewId);

  return (
    <div className="flex h-dvh flex-col bg-paper text-ink">
      {/* 상단 바 — 모바일에서는 주요 작업을 ⋮ 메뉴로 모아 한 줄로 유지 */}
      <header className="flex items-center gap-2 border-b border-line bg-paper-raised px-3 py-2 md:gap-3 md:px-6 md:py-2.5">
        {kiosk ? (
          <button onClick={resetAll} className={topBtn}>처음으로</button>
        ) : (
          <Link href="/" aria-label="나가기" className={`${topBtn} flex items-center gap-1`}>
            <span aria-hidden>←</span>
            <span className="hidden sm:inline">나가기</span>
          </Link>
        )}
        <h1 className={`shrink-0 font-display font-bold tracking-tight text-ink ${kiosk ? 'text-xl' : 'text-sm md:text-base'}`}>
          AI 시뮬레이터
        </h1>
        {kiosk && (
          <input
            value={staff}
            onChange={(e) => setStaff(e.target.value)}
            placeholder="응대 담당자"
            aria-label="응대 담당자"
            className="hidden w-32 rounded-xl border border-line bg-paper px-3 py-3 text-sm text-ink placeholder-ink-faint focus:border-clay focus:outline-none md:block"
          />
        )}

        <nav className="ml-auto hidden items-center gap-2 overflow-x-auto lg:flex" aria-label="주요 작업">
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

        {!kiosk && (
          <div className="relative max-lg:ml-auto">
            <button
              onClick={() => setKeyOpen((o) => !o)}
              aria-expanded={keyOpen}
              aria-label={`API 키 설정 (${keyFull})`}
              className={`${topBtn} flex items-center gap-1.5 ${byokMode && !byokKey.trim() ? 'border-alert/50 text-alert' : ''}`}
            >
              <span aria-hidden>🔑</span>
              <span className="sm:hidden">{keyShort}</span>
              <span className="hidden sm:inline">{keyFull}</span>
            </button>
            {keyOpen && (
              <>
                <button aria-label="API 키 설정 닫기" className="fixed inset-0 z-30 cursor-default" onClick={() => setKeyOpen(false)} />
                <div className="absolute right-0 top-full z-40 mt-2 w-80 max-w-[88vw] rounded-2xl border border-line bg-paper-raised p-4 shadow-deep animate-fade-in">
                  <ApiKeyPanel
                    byokMode={byokMode}
                    onToggle={() => setByokRaw(String(!byokMode))}
                    byokKey={byokKey}
                    onKey={setByokKey}
                    freeCount={freeCount}
                  />
                </div>
              </>
            )}
          </div>
        )}

        <div className={`relative ${kiosk ? 'max-lg:ml-auto' : ''}`}>
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
              <div className="absolute right-0 top-full z-40 mt-2 w-72 max-w-[88vw] rounded-2xl border border-line bg-paper-raised p-3 shadow-deep animate-fade-in">
                {/* 모바일 전용: 상단 바에서 옮겨 온 주요 작업 */}
                <div className="mb-2 flex flex-col gap-1 border-b border-line pb-2 text-sm lg:hidden">
                  <button
                    onClick={() => { setMenuOpen(false); openLead('quote'); }}
                    className="cursor-pointer rounded-lg bg-ink px-3 py-2.5 text-left font-bold text-paper hover:bg-clay"
                  >
                    견적 요청
                  </button>
                  <button onClick={() => { setMenuOpen(false); openLead('appointment'); }} className="cursor-pointer rounded-lg px-3 py-2.5 text-left font-semibold hover:bg-sand">
                    상담 예약
                  </button>
                  <button onClick={() => { setMenuOpen(false); openLead('sample'); }} className="cursor-pointer rounded-lg px-3 py-2.5 text-left font-semibold hover:bg-sand">
                    샘플 주문
                  </button>
                  <button onClick={() => { setMenuOpen(false); void handleShare(); }} className="cursor-pointer rounded-lg px-3 py-2.5 text-left font-semibold hover:bg-sand">
                    공유 링크 복사
                  </button>
                </div>
                <div className="flex flex-col gap-1 text-sm">
                  {room && (
                    <button
                      onClick={() => { resetAll(); }}
                      className="cursor-pointer rounded-lg px-3 py-2 text-left font-semibold hover:bg-sand"
                    >
                      모든 공간 초기화하고 처음부터
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
              </div>
            </>
          )}
        </div>
      </header>

      {/* 본문 — 모바일: [이미지 → 타일 선택(가장 넓게) → 적용 바(하단 고정)] / 넓은 화면: [선택 | 이미지 + 적용 바] */}
      <div
        className={`grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)_auto] ${
          showRoom ? 'grid-rows-[auto_minmax(0,1fr)_auto]' : 'grid-rows-[minmax(0,1fr)]'
        }`}
      >
        {/* 룸뷰 */}
        <section className="flex min-h-0 flex-col bg-sand/50 lg:col-start-2 lg:row-start-1">
          {spaceTabs}
          {!showRoom ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <RoomPicker
                kind={pickKind}
                onKind={setPickKind}
                onFile={loadFile}
                onDemo={loadDemo}
                loading={roomLoading}
                error={roomError}
                kiosk={kiosk}
                onCancel={room ? () => setAdding(false) : undefined}
              />
            </div>
          ) : (
            room && (
              <>
                <div
                  className="flex h-[26dvh] min-h-[150px] shrink-0 items-center justify-center p-2 md:p-5 lg:h-auto lg:min-h-0 lg:flex-1"
                  style={{ containerType: 'size' }}
                >
                  <div
                    onClick={() => {
                      if (!compare && !busy) setViewerOpen(true);
                    }}
                    className={`relative overflow-hidden rounded-xl border border-line bg-paper-raised shadow-deep lg:rounded-2xl ${compare ? '' : 'cursor-zoom-in'}`}
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

                    {/* 크게 보기 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewerOpen(true);
                      }}
                      aria-label="결과 이미지 크게 보기"
                      className="absolute right-2 top-2 z-10 flex cursor-pointer items-center gap-1 rounded-full bg-ink/70 px-3 py-1.5 text-[11px] font-bold text-paper backdrop-blur-sm transition-colors hover:bg-ink"
                    >
                      <span aria-hidden>⤢</span> 크게 보기
                    </button>

                    {/* 적용면 칩 (넓은 화면) */}
                    <ul className="absolute left-3 top-3 hidden max-w-[70%] flex-wrap gap-1.5 lg:flex">
                      {SURFACES.map((s) => {
                        const t = configs[s.id] ? tileById.get(configs[s.id]?.tileId ?? '') : undefined;
                        const on = surface === s.id;
                        return (
                          <li key={s.id}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSurface(s.id);
                              }}
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

                    {/* 모바일: 이미지 위에서 바로 원본/적용 결과 전환 */}
                    {versions.length > 0 && (
                      <div className="absolute inset-x-2 bottom-2 z-10 flex gap-1.5 overflow-x-auto lg:hidden" aria-label="적용 결과 전환">
                        {['original', ...versions.map((v) => v.id)].map((id) => (
                          <button
                            key={id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewId(id);
                            }}
                            aria-pressed={viewId === id}
                            className={`shrink-0 cursor-pointer rounded-full px-3 py-1.5 text-[11px] font-bold backdrop-blur-sm ${
                              viewId === id ? 'bg-paper text-ink' : 'bg-ink/70 text-paper'
                            }`}
                          >
                            {labelOf(id)}
                          </button>
                        ))}
                      </div>
                    )}

                    {pending && current && !busy && (
                      <p className="absolute bottom-12 left-1/2 w-max max-w-[92%] -translate-x-1/2 rounded-full bg-ink/80 px-4 py-1.5 text-center text-[11px] font-semibold text-paper backdrop-blur-sm lg:bottom-3">
                        변경 사항이 있어요. &lsquo;AI로 적용하기&rsquo;를 눌러 반영하세요
                      </p>
                    )}

                    {busy && (
                      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-ink/45 backdrop-blur-sm" aria-live="polite">
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

                {/* 결과 버전 스트립 (넓은 화면) */}
                {versions.length > 0 && (
                  <div className="hidden items-center gap-2 overflow-x-auto px-4 pb-2 md:px-6 lg:flex" aria-label="적용 결과 목록">
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

                {/* 선택한 결과의 적용 내역 */}
                {versions.length > 0 && (
                  <div className="mx-3 mb-1.5 mt-1.5 flex flex-col gap-1.5 rounded-xl border border-line bg-paper-raised px-3 py-2 lg:mx-6 lg:mb-2 lg:mt-0 lg:px-3.5 lg:py-2.5" aria-live="polite">
                    {compare && cmpA !== viewId && <div className="hidden lg:block">{renderVersionDetail(cmpA)}</div>}
                    {renderVersionDetail(viewId)}
                  </div>
                )}

                {genError && (
                  <div role="alert" className="mx-3 mb-1.5 flex items-start justify-between gap-3 rounded-xl border border-alert/30 bg-alert-soft p-3 text-xs leading-relaxed text-alert lg:mx-6 lg:mb-2">
                    <span>{genError}</span>
                    <button onClick={() => setGenError(null)} aria-label="오류 닫기" className="cursor-pointer text-alert/70 hover:text-alert">✕</button>
                  </div>
                )}
              </>
            )
          )}
        </section>

        {/* 타일 선택 패널 — 모바일에서 남는 공간을 가장 넓게 쓴다 */}
        <div
          className={`${showRoom ? 'flex' : 'hidden lg:flex'} min-h-0 flex-col border-t border-line lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:border-t-0`}
        >
          <TilePicker
            tiles={tiles}
            collections={data?.collections ?? []}
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

        {/* 적용 바 — 모바일에서는 화면 아래에 고정 */}
        {showRoom && (
          <div className="lg:col-start-2 lg:row-start-2">
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
          </div>
        )}
      </div>

      {viewerOpen && room && (
        <ResultViewer
          items={viewerItems}
          activeId={viewId}
          onActive={setViewId}
          onClose={() => setViewerOpen(false)}
          onDownload={(id) => {
            const v = versions.find((x) => x.id === id);
            if (v) downloadVersion(v);
          }}
          ratio={ratio}
        />
      )}

      {/* 방 종류 표시(접근성용) */}
      <p className="sr-only">현재 공간: {ROOM_KINDS.find((r) => r.id === roomKind)?.label}</p>

      {lead && (
        <LeadDialog
          type={lead}
          kiosk={kiosk}
          storeName={storeName}
          defaultStaff={staff}
          items={leadItems.map((i) => ({
            surface: i.surface,
            name: i.tile.name,
            sizeLabel: sizeLabel(i.config.sizeId),
            roomLabel: allSpaces.length > 1 ? ROOM_KINDS.find((r) => r.id === i.roomKind)?.label : undefined,
          }))}
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
