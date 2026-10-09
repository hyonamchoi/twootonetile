// 타일 서비스 공용 타입 · 상수 (클라이언트 UI와 서버 프롬프트가 공유)

/* ───────── 적용면 ───────── */

export type SurfaceId = 'floor' | 'wall' | 'backsplash' | 'shower';

export type Surface = {
  id: SurfaceId;
  label: string;
  /** Gemini 프롬프트에 들어갈 영문 설명 */
  prompt: string;
};

export const SURFACES: Surface[] = [
  { id: 'floor', label: '바닥', prompt: 'the floor surface' },
  {
    id: 'wall',
    label: '벽',
    prompt: 'the main wall surfaces (walls only, never the ceiling)',
  },
  {
    id: 'backsplash',
    label: '백스플래시',
    prompt:
      'the kitchen backsplash: the wall band between the countertop and the upper cabinets or range hood',
  },
  {
    id: 'shower',
    label: '샤워 공간',
    prompt: 'the shower or bathtub enclosure walls (and the shower floor if visible)',
  },
];

export const SURFACE_IDS = SURFACES.map((s) => s.id) as SurfaceId[];

/* ───────── 공간 종류 ───────── */

export type RoomKind = {
  id: string;
  label: string;
  prompt: string;
};

export const ROOM_KINDS: RoomKind[] = [
  { id: 'bathroom', label: '욕실', prompt: 'bathroom' },
  { id: 'kitchen', label: '주방', prompt: 'kitchen' },
  { id: 'entrance', label: '현관', prompt: 'entrance hall' },
  { id: 'living', label: '거실', prompt: 'living room' },
  { id: 'balcony', label: '베란다', prompt: 'balcony / utility room' },
];

/* ───────── 타일 규격 (mm) ───────── */

export type TileSize = { id: string; w: number; h: number; label: string };

const size = (w: number, h: number, note = ''): TileSize => ({
  id: `${w}x${h}`,
  w,
  h,
  label: `${w}×${h}${note ? ` ${note}` : ''}`,
});

export const TILE_SIZES: TileSize[] = [
  size(100, 100, '모자이크'),
  size(100, 300, '서브웨이'),
  size(200, 200),
  size(300, 300),
  size(300, 600),
  size(400, 800),
  size(600, 600),
  size(600, 1200, '대형'),
  size(800, 800),
  size(1200, 1200, '슬랩'),
];

export function findSize(id: string): TileSize | undefined {
  return TILE_SIZES.find((s) => s.id === id);
}

/* ───────── 시공 패턴(방향) ───────── */

export type Layout = { id: string; label: string; prompt: string };

export const LAYOUTS: Layout[] = [
  {
    id: 'straight_h',
    label: '가로',
    prompt:
      'straight grid layout with the long side of each tile running horizontally and joints aligned',
  },
  {
    id: 'straight_v',
    label: '세로',
    prompt:
      'straight grid layout with the long side of each tile running vertically and joints aligned',
  },
  {
    id: 'running_bond',
    label: '엇갈림',
    prompt: 'running-bond (brick) layout with each row offset by half a tile',
  },
  {
    id: 'herringbone',
    label: '헤링본',
    prompt: 'herringbone layout with tiles interlocked in a zig-zag at right angles',
  },
  {
    id: 'diagonal',
    label: '대각선',
    prompt: 'diagonal layout with the tile grid rotated 45 degrees',
  },
];

export function findLayout(id: string): Layout | undefined {
  return LAYOUTS.find((l) => l.id === id);
}

/* ───────── 줄눈 ───────── */

export type GroutColor = { id: string; label: string; hex: string };

export const GROUT_COLORS: GroutColor[] = [
  { id: 'white', label: '화이트', hex: '#f2f0eb' },
  { id: 'ivory', label: '아이보리', hex: '#e4dccb' },
  { id: 'beige', label: '베이지', hex: '#c8b8a0' },
  { id: 'lightgray', label: '라이트 그레이', hex: '#c9c8c4' },
  { id: 'gray', label: '그레이', hex: '#8f8f8f' },
  { id: 'charcoal', label: '차콜', hex: '#4a4a4a' },
  { id: 'black', label: '블랙', hex: '#1f1f1f' },
];

export const GROUT_WIDTHS = [2, 3, 5] as const;

export const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/* ───────── 타일 · 컬렉션 ───────── */

export const FINISHES = ['무광', '반광', '유광', '텍스처'] as const;
export type Finish = (typeof FINISHES)[number];

export const COLOR_FAMILIES = [
  '화이트',
  '베이지',
  '그레이',
  '블랙',
  '브라운',
  '블루·그린',
  '멀티',
] as const;
export type ColorFamily = (typeof COLOR_FAMILIES)[number];

export type TilePatternKind =
  | 'marble'
  | 'terrazzo'
  | 'concrete'
  | 'glaze'
  | 'zellige'
  | 'herringbone'
  | 'hex'
  | 'wood'
  | 'check';

/** 이미지가 없는 샘플 타일을 그리기 위한 절차적 패턴 정의 */
export type TilePattern = {
  kind: TilePatternKind;
  colors: string[];
  seed: number;
};

export type Tile = {
  id: string;
  /** 딜러 품번 — 카탈로그 동기화의 업서트 키 */
  sku: string;
  brand: string;
  name: string;
  series?: string;
  origin?: string;
  finish: Finish;
  color: ColorFamily;
  /** 선택 가능한 규격 id 목록 (비어 있으면 전체 허용) */
  sizes: string[];
  surfaces: SurfaceId[];
  /** 원/㎡ (선택) */
  price?: number;
  /** 로컬에 저장된 제품 이미지 경로(/api/tile-images/..) */
  imageUrl?: string;
  /** 동기화 때 받아 온 원본 이미지 URL (중복 다운로드 방지용) */
  imageSource?: string;
  pattern?: TilePattern;
  collectionId?: string;
  active: boolean;
  updatedAt: string;
};

export type Collection = {
  id: string;
  name: string;
  description?: string;
  /** 소비자 화면에 노출할지 */
  visible: boolean;
  order: number;
};

/* ───────── 소비자 선택 · 리드 ───────── */

export type TileSelection = {
  surface: SurfaceId;
  tileId: string;
  sizeId: string;
  layoutId: string;
  groutHex: string;
  groutMm: number;
};

export type LeadType = 'sample' | 'appointment' | 'quote' | 'showroom';
export type LeadStatus = 'new' | 'contacted' | 'sampled' | 'won' | 'lost';

export const LEAD_TYPE_LABEL: Record<LeadType, string> = {
  sample: '샘플 주문',
  appointment: '상담 예약',
  quote: '견적 요청',
  showroom: '매장 방문',
};

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: '신규',
  contacted: '상담중',
  sampled: '샘플 발송',
  won: '계약',
  lost: '종료',
};

export const LEAD_STATUSES = Object.keys(LEAD_STATUS_LABEL) as LeadStatus[];

export type LeadItem = {
  surface: SurfaceId;
  tileId: string;
  sku: string;
  brand: string;
  name: string;
  sizeId: string;
};

export type Lead = {
  id: string;
  createdAt: string;
  updatedAt: string;
  type: LeadType;
  status: LeadStatus;
  source: 'web' | 'kiosk';
  name: string;
  phone: string;
  region?: string;
  preferredDate?: string;
  memo?: string;
  /** 매장 시연 시 응대한 영업 담당자 */
  staff?: string;
  roomKind?: string;
  items: LeadItem[];
  designId?: string;
  /** 개인정보 수집·이용 동의 시각 */
  consentAt: string;
  notes: { at: string; text: string }[];
};

/* ───────── 딜러 설정 ───────── */

export type FeedConfig = {
  url: string;
  /** 0이면 수동 동기화만 */
  autoSyncHours: number;
  lastSyncAt?: string;
  lastResult?: string;
};

export type DealerSettings = {
  storeName: string;
  showPrice: boolean;
  contactPhone?: string;
  feed?: FeedConfig;
};

/** 공개 카탈로그 API 응답 */
export type PublicCatalog = {
  tiles: Tile[];
  collections: Collection[];
  settings: Pick<DealerSettings, 'storeName' | 'showPrice' | 'contactPhone'>;
};

export function formatWon(n: number): string {
  return `₩${n.toLocaleString('ko-KR')}`;
}
