'use client';

import { useState } from 'react';
import {
  GROUT_COLORS,
  GROUT_WIDTHS,
  HEX_RE,
  LAYOUTS,
  TILE_SIZES,
  formatWon,
  isSlabSurface,
  type Surface,
  type Tile,
} from '@/lib/tiles';
import TileThumb from './TileThumb';
import type { SurfaceConfig } from './types';

type Props = {
  surface: Surface;
  tile: Tile | null;
  config: SurfaceConfig | null;
  showPrice: boolean;
  kiosk: boolean;
  busy: boolean;
  canApply: boolean;
  pending: boolean;
  hasVersions: boolean;
  compare: boolean;
  onChange: (patch: Partial<SurfaceConfig>) => void;
  onRemove: () => void;
  onToggleCompare: () => void;
  onApply: () => void;
};

type PopKey = 'layout' | 'grout' | 'size' | null;

function sizeLabel(id: string): string {
  return TILE_SIZES.find((s) => s.id === id)?.label ?? id.replace('x', '×');
}

export default function TileControls({
  surface,
  tile,
  config,
  showPrice,
  kiosk,
  busy,
  canApply,
  pending,
  hasVersions,
  compare,
  onChange,
  onRemove,
  onToggleCompare,
  onApply,
}: Props) {
  const [open, setOpen] = useState<PopKey>(null);
  const toggle = (k: Exclude<PopKey, null>) => setOpen((o) => (o === k ? null : k));
  const enabled = Boolean(tile && config);
  const slab = isSlabSurface(surface.id); // 상판: 이음새 없는 슬랩이라 크기·방향·줄눈 옵션이 없다

  const btn = (active = false, disabled = false) =>
    `flex cursor-pointer items-center gap-1.5 rounded-xl border font-semibold transition-colors ${
      kiosk ? 'px-4 py-3 text-sm' : 'px-3 py-2 text-xs'
    } ${disabled ? 'cursor-not-allowed opacity-40' : ''} ${
      active ? 'border-ink bg-ink text-paper' : 'border-line bg-paper text-ink hover:border-line-strong'
    }`;

  const sizeIds = tile ? (tile.sizes.length ? tile.sizes : TILE_SIZES.map((s) => s.id)) : [];
  const groutName = config
    ? (GROUT_COLORS.find((g) => g.hex.toLowerCase() === config.groutHex.toLowerCase())?.label ?? '사용자 지정')
    : '';

  return (
    <div className="relative border-t border-line bg-paper-raised px-4 py-3 md:px-6">
      {/* 팝오버 */}
      {open && enabled && config && tile && (
        <>
          <button aria-label="닫기" className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(null)} />
          <div className="absolute bottom-full right-4 z-20 mb-2 w-[min(92vw,360px)] rounded-2xl border border-line bg-paper-raised p-4 shadow-deep animate-fade-in md:right-6">
            {open === 'layout' && (
              <>
                <p className="mb-2 text-xs font-bold text-ink-faint">시공 방향 · 패턴</p>
                <div className="flex flex-wrap gap-1.5">
                  {LAYOUTS.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => onChange({ layoutId: l.id })}
                      className={`cursor-pointer rounded-full border px-3.5 py-2 text-xs font-semibold ${
                        config.layoutId === l.id ? 'border-clay bg-clay-soft text-clay-deep' : 'border-line text-ink-soft hover:border-line-strong'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </>
            )}
            {open === 'grout' && (
              <>
                <p className="mb-2 text-xs font-bold text-ink-faint">줄눈 색상</p>
                <div className="flex flex-wrap gap-2">
                  {GROUT_COLORS.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => onChange({ groutHex: g.hex })}
                      title={g.label}
                      aria-label={g.label}
                      aria-pressed={config.groutHex.toLowerCase() === g.hex.toLowerCase()}
                      className={`h-9 w-9 cursor-pointer rounded-full border-2 ${
                        config.groutHex.toLowerCase() === g.hex.toLowerCase() ? 'border-clay' : 'border-line'
                      }`}
                      style={{ backgroundColor: g.hex }}
                    />
                  ))}
                  <label
                    title="직접 선택"
                    className="relative flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-line-strong text-xs text-ink-soft"
                  >
                    +
                    <input
                      type="color"
                      value={HEX_RE.test(config.groutHex) ? config.groutHex : '#c9c8c4'}
                      onChange={(e) => onChange({ groutHex: e.target.value })}
                      className="absolute inset-0 cursor-pointer opacity-0"
                      aria-label="줄눈 색상 직접 선택"
                    />
                  </label>
                </div>
                <p className="mb-2 mt-4 text-xs font-bold text-ink-faint">줄눈 두께</p>
                <div className="flex gap-1.5">
                  {GROUT_WIDTHS.map((w) => (
                    <button
                      key={w}
                      onClick={() => onChange({ groutMm: w })}
                      className={`cursor-pointer rounded-full border px-4 py-2 text-xs font-semibold ${
                        config.groutMm === w ? 'border-clay bg-clay-soft text-clay-deep' : 'border-line text-ink-soft hover:border-line-strong'
                      }`}
                    >
                      {w}mm
                    </button>
                  ))}
                </div>
              </>
            )}
            {open === 'size' && (
              <>
                <p className="mb-2 text-xs font-bold text-ink-faint">타일 크기 (mm)</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {sizeIds.map((id) => (
                    <button
                      key={id}
                      onClick={() => onChange({ sizeId: id })}
                      className={`cursor-pointer rounded-xl border px-3 py-2.5 text-left text-xs font-semibold ${
                        config.sizeId === id ? 'border-clay bg-clay-soft text-clay-deep' : 'border-line text-ink-soft hover:border-line-strong'
                      }`}
                    >
                      {sizeLabel(id)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}

      <div className="relative z-20 flex flex-wrap items-center gap-3">
        {/* 선택한 타일 */}
        <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
          {tile && config ? (
            <>
              <TileThumb tile={tile} className="h-12 w-12 shrink-0 rounded-lg border border-line" />
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold text-ink-faint">
                  {surface.label} · {tile.brand}
                </p>
                <p className={`truncate font-bold text-ink ${kiosk ? 'text-lg' : 'text-sm'}`}>{tile.name}</p>
                <p className="truncate text-[11px] text-ink-soft">
                  {slab ? '이음새 없는 슬랩 마감' : `${sizeLabel(config.sizeId)} · 줄눈 ${groutName} ${config.groutMm}mm`}
                  {showPrice && tile.price ? ` · ${formatWon(tile.price)}/㎡` : ''}
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-ink-soft">
              왼쪽 목록에서 <b className="text-ink">{surface.label}</b>에 적용할 {slab ? '스톤·소재를' : '타일을'} 선택하세요.
            </p>
          )}
        </div>

        {/* 컨트롤 */}
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={onRemove} disabled={!enabled} className={btn(false, !enabled)}>
            제거
          </button>
          {!slab && (
            <>
              <button onClick={() => toggle('layout')} disabled={!enabled} className={btn(open === 'layout', !enabled)}>
                방향
              </button>
              <button onClick={() => toggle('grout')} disabled={!enabled} className={btn(open === 'grout', !enabled)}>
                줄눈
              </button>
              <button onClick={() => toggle('size')} disabled={!enabled} className={btn(open === 'size', !enabled)}>
                크기
              </button>
            </>
          )}
          <button onClick={onToggleCompare} disabled={!hasVersions} className={btn(compare, !hasVersions)}>
            비교
          </button>
          <button
            onClick={onApply}
            disabled={!canApply}
            className={`cursor-pointer rounded-xl font-bold transition-all ${kiosk ? 'px-6 py-3 text-base' : 'px-5 py-2.5 text-sm'} ${
              canApply
                ? 'bg-clay text-paper shadow-lift hover:bg-clay-deep active:scale-95'
                : 'cursor-not-allowed bg-sand text-ink-faint'
            }`}
          >
            {busy ? '적용 중…' : pending ? 'AI로 적용하기' : '적용 완료'}
          </button>
        </div>
      </div>
    </div>
  );
}
