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

/** 한 공간(욕실·주방 등)의 작업 상태 — 공간을 오가도 선택과 결과가 보존된다 */
export type Space = {
  id: string;
  roomKind: string;
  room: Room;
  surface: SurfaceId;
  configs: Configs;
  versions: Version[];
  viewId: string;
  compare: boolean;
  cmpA: string;
};
