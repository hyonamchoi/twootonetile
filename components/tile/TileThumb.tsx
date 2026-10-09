/* eslint-disable @next/next/no-img-element */
import { useMemo } from 'react';
import { swatchDataUri } from '@/lib/swatch';
import type { Tile } from '@/lib/tiles';

/** 타일 이미지 주소: 업로드된 제품 이미지가 우선, 없으면 절차적 샘플 */
export function tileImageSrc(tile: Tile, px = 256): string | null {
  if (tile.imageUrl) return tile.imageUrl;
  if (tile.pattern) return swatchDataUri(tile.pattern, px);
  return null;
}

export default function TileThumb({
  tile,
  className = '',
  px = 256,
}: {
  tile: Tile;
  className?: string;
  px?: number;
}) {
  const src = useMemo(() => tileImageSrc(tile, px), [tile, px]);
  if (!src) return <div className={`bg-sand ${className}`} aria-hidden />;
  return <img src={src} alt={tile.name} draggable={false} loading="lazy" className={`object-cover ${className}`} />;
}
