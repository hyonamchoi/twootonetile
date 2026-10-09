/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useRef, useState } from 'react';
import CompareSlider from '../CompareSlider';

export type ViewerDetail = { key: string; surface: string; name: string; size?: string; thumb: string | null };

export type ViewerItem = {
  id: string;
  label: string;
  src: string;
  details: ViewerDetail[];
};

type Props = {
  items: ViewerItem[];
  activeId: string;
  onActive: (id: string) => void;
  onClose: () => void;
  onDownload: (id: string) => void;
  /** 원본 가로/세로 비율 */
  ratio: number;
};

/**
 * 결과 이미지를 화면 가득 크게 보는 뷰어.
 * - 이미지를 자르지 않고(contain) 전체를 보여 준다
 * - 좌우 스와이프·방향키·하단 칩으로 원본/적용 결과를 넘겨 본다
 * - '원본과 비교'로 슬라이더 비교, 적용 내역(면·타일)을 이미지 아래에 함께 표시
 */
export default function ResultViewer({ items, activeId, onActive, onClose, onDownload, ratio }: Props) {
  const [compare, setCompare] = useState(false);
  const [zoom, setZoom] = useState(false); // 확대: 높이에 맞춰 키우고 좌우로 밀어서 본다
  const touch = useRef<{ x: number; y: number } | null>(null);

  const index = Math.max(0, items.findIndex((i) => i.id === activeId));
  const active = items[index];
  const original = items[0];
  const canCompare = Boolean(active && original && active.id !== original.id);
  const showCompare = compare && canCompare;
  const showZoom = zoom && !showCompare;

  const go = (delta: number) => {
    const next = items[index + delta];
    if (next) onActive(next.id);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && !showCompare && !showZoom) go(-1);
      else if (e.key === 'ArrowRight' && !showCompare && !showZoom) go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // go 는 매 렌더 새로 만들어지지만 index/items/showCompare 가 바뀔 때만 다시 등록하면 충분하다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, items, showCompare, showZoom, onClose]);

  if (!active) return null;

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    if (!start || showCompare || showZoom) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
  };

  const iconBtn =
    'flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-paper/10 text-paper transition-colors hover:bg-paper/20 disabled:cursor-not-allowed disabled:opacity-30';

  return (
    <div className="fixed inset-0 z-[70] flex h-dvh flex-col bg-ink text-paper animate-fade-in" role="dialog" aria-modal="true" aria-label="결과 이미지 크게 보기">
      {/* 상단 바 */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        <button onClick={onClose} aria-label="닫기" className={iconBtn}>
          <span aria-hidden className="text-lg leading-none">✕</span>
        </button>
        <p className="min-w-0 flex-1 truncate text-center text-sm font-bold">
          {active.label}
          <span className="ml-2 text-xs font-normal text-paper/60">
            {index + 1} / {items.length}
          </span>
        </p>
        <button
          onClick={() => {
            setCompare(false);
            setZoom((z) => !z);
          }}
          aria-pressed={showZoom}
          className={`h-10 shrink-0 cursor-pointer rounded-full px-4 text-xs font-bold transition-colors ${showZoom ? 'bg-paper text-ink' : 'bg-paper/10 text-paper hover:bg-paper/20'}`}
        >
          {showZoom ? '맞춤' : '확대'}
        </button>
        <button
          onClick={() => onDownload(active.id)}
          disabled={active.id === original.id}
          aria-label="이미지 다운로드"
          className={iconBtn}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* 이미지 */}
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-2 md:px-14"
        style={{ containerType: 'size' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {showZoom && (
          <div className="absolute inset-0 overflow-auto overscroll-contain">
            <img
              src={active.src}
              alt={active.label}
              draggable={false}
              className="h-full max-w-none select-none"
              style={{ aspectRatio: String(ratio), minWidth: '100%', objectFit: 'cover' }}
            />
          </div>
        )}
        <div
          className={`relative overflow-hidden rounded-lg bg-paper/5 ${showZoom ? 'hidden' : ''}`}
          style={{ aspectRatio: String(ratio), width: `min(100cqw, calc(100cqh * ${ratio}))` }}
        >
          {showCompare ? (
            <CompareSlider
              beforeSrc={original.src}
              afterSrc={active.src}
              beforeAlt="원본"
              afterAlt={active.label}
              beforeLabel="원본"
              afterLabel={active.label}
              aspectRatio={String(ratio)}
              sizes="100vw"
              className="rounded-none! border-0! shadow-none!"
            />
          ) : (
            <img src={active.src} alt={active.label} draggable={false} className="h-full w-full select-none object-contain" />
          )}
        </div>

        {/* 좌우 이동 (넓은 화면) */}
        {!showCompare && !showZoom && items.length > 1 && (
          <>
            <button onClick={() => go(-1)} disabled={index === 0} aria-label="이전 이미지" className={`${iconBtn} absolute left-2 top-1/2 hidden -translate-y-1/2 md:flex`}>
              <span aria-hidden>‹</span>
            </button>
            <button onClick={() => go(1)} disabled={index === items.length - 1} aria-label="다음 이미지" className={`${iconBtn} absolute right-2 top-1/2 hidden -translate-y-1/2 md:flex`}>
              <span aria-hidden>›</span>
            </button>
          </>
        )}
      </div>

      {/* 하단: 적용 내역 + 이미지 선택 */}
      <div className="flex flex-col gap-2.5 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <div className="flex min-h-[1.75rem] items-center gap-x-4 gap-y-1.5 overflow-x-auto whitespace-nowrap md:flex-wrap md:whitespace-normal" aria-live="polite">
          {active.id === original.id ? (
            <span className="text-xs text-paper/60">원본 사진 (변경 없음)</span>
          ) : active.details.length === 0 ? (
            <span className="text-xs text-paper/60">적용 내역이 없습니다</span>
          ) : (
            active.details.map((d) => (
              <span key={d.key} className="flex shrink-0 items-center gap-2 text-xs text-paper/80">
                {d.thumb && <img src={d.thumb} alt="" className="h-6 w-6 shrink-0 rounded border border-paper/20 object-cover" draggable={false} />}
                <b className="font-semibold text-paper">{d.surface}</b>
                {d.name}
                {d.size && <span className="text-paper/50">· {d.size}</span>}
              </span>
            ))
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto" role="tablist" aria-label="결과 이미지">
            {items.map((it) => {
              const on = it.id === active.id;
              return (
                <button
                  key={it.id}
                  role="tab"
                  aria-selected={on}
                  onClick={() => onActive(it.id)}
                  className={`shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 transition-colors ${on ? 'border-paper' : 'border-transparent opacity-60 hover:opacity-100'}`}
                >
                  <img src={it.src} alt="" className="h-12 w-[4.5rem] object-cover" draggable={false} />
                  <span className="block bg-paper/10 px-1 py-0.5 text-center text-[10px] font-semibold">{it.label}</span>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => {
              setZoom(false);
              setCompare((c) => !c);
            }}
            disabled={!canCompare}
            aria-pressed={showCompare}
            className={`shrink-0 cursor-pointer rounded-full border px-4 py-2.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
              showCompare ? 'border-paper bg-paper text-ink' : 'border-paper/40 text-paper hover:border-paper'
            }`}
          >
            원본과 비교
          </button>
        </div>
      </div>
    </div>
  );
}
