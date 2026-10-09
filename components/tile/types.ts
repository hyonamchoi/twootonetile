import type { SurfaceId } from '@/lib/tiles';

/** 한 적용면에 고른 타일과 시공 옵션 */
export type SurfaceConfig = {
  tileId: string;
  sizeId: string;
  layoutId: string;
  groutHex: string;
  groutMm: number;
};

export type Configs = Partial<Record<SurfaceId, SurfaceConfig>>;

export type Room = {
  src: string;
  w: number;
  h: number;
  label: string;
};

export type Version = {
  id: string;
  label: string;
  image: string;
  sig: string;
  configs: Configs;
  designId?: string;
};
