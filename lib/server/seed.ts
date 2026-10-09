import type {
  ColorFamily,
  Collection,
  DealerSettings,
  Finish,
  Lead,
  MaterialId,
  SurfaceId,
  Tile,
} from '../tiles';

/**
 * 첫 실행 때 채워지는 데모 카탈로그.
 * 출시 전 데모용으로 CC0 텍스처(ambientCG, public/tiles/)를 쓴다 — 출처는 public/tiles/CREDITS.md.
 * 실제 제품이 아니며, 타일 업체와 계약한 뒤 딜러 콘솔의 업로드·동기화로 교체한다.
 * 컬렉션 이름은 해외(이탈리아·스페인) 트렌드 방향성을 흉내 낸 데모용 이름이다.
 */

const NOW = '2026-10-01T00:00:00.000Z';

export const SEED_COLLECTIONS: Collection[] = [
  {
    id: 'c-milano',
    name: '밀라노 스톤 미니멀',
    description: '차분한 대리석·콘크리트 톤의 대형 포세린. 호텔 같은 욕실과 거실 바닥.',
    visible: true,
    order: 1,
  },
  {
    id: 'c-stone',
    name: '엔지니어드 스톤',
    description: '석영 기반 인조 스톤 슬랩. 주방 상판·백스플래시·샤워 벽까지 이음새 적게 마감합니다.',
    visible: true,
    order: 2,
  },
  {
    id: 'c-med',
    name: '지중해 패턴',
    description: '테라코타·아쿠아 헥사곤과 빅토리안 패턴. 주방 백스플래시와 포인트 벽에.',
    visible: true,
    order: 3,
  },
  {
    id: 'c-terrazzo',
    name: '테라조 리바이벌',
    description: '작은 칩이 박힌 테라조 패턴. 현관과 욕실 바닥에 개성을 더합니다.',
    visible: true,
    order: 4,
  },
  {
    id: 'c-hotel',
    name: '다크 호텔 바스',
    description: '짙은 톤과 베인의 라인. 하이엔드 욕실을 위한 컬렉션.',
    visible: true,
    order: 5,
  },
  {
    id: 'c-pattern',
    name: '클래식 패턴',
    description: '스퀘어·헥사곤·체크 등 클래식 패턴 타일. 백스플래시와 샤워 공간에 어울립니다.',
    visible: true,
    order: 6,
  },
  {
    id: 'c-wood',
    name: '우드 룩',
    description: '나무 결 질감의 바닥재 스타일.',
    visible: true,
    order: 7,
  },
];

type Row = [
  sku: string,
  name: string,
  collectionId: string,
  /** public/tiles/<image>.jpg */
  image: string,
  color: ColorFamily,
  finish: Finish,
  origin: string,
  sizes: string[],
  surfaces: SurfaceId[],
  price: number,
  material?: MaterialId,
];

const ALL: SurfaceId[] = ['floor', 'wall', 'backsplash', 'shower'];
const WALLISH: SurfaceId[] = ['wall', 'backsplash', 'shower'];
const FLOORWALL: SurfaceId[] = ['floor', 'wall', 'shower'];

const ROWS: Row[] = [
  ['DEMO-M01', '카라라 화이트', 'c-milano', 'carrara', '화이트', '유광', '이탈리아', ['600x600', '600x1200', '800x800', '1200x1200'], ALL, 52000],
  ['DEMO-M02', '칼라카타 골드', 'c-milano', 'calacatta', '베이지', '유광', '이탈리아', ['600x1200', '800x800', '1200x1200'], ALL, 68000],
  ['DEMO-M03', '그리지오 클라우드', 'c-milano', 'cloud-concrete', '그레이', '무광', '이탈리아', ['600x600', '600x1200', '800x800'], FLOORWALL, 41000],
  ['DEMO-M04', '샌드 트래버틴', 'c-milano', 'travertine-sand', '베이지', '반광', '이탈리아', ['300x600', '600x600', '600x1200'], ALL, 47000],
  ['DEMO-M05', '아이보리 솔리드', 'c-milano', 'ivory-solid', '베이지', '무광', '이탈리아', ['600x600', '800x800'], FLOORWALL, 36000],
  ['DEMO-M06', '그레이 슬레이트', 'c-milano', 'slate-dark', '그레이', '텍스처', '이탈리아', ['300x600', '600x600'], FLOORWALL, 38000],
  ['DEMO-Z01', '테라코타 헥사', 'c-med', 'hex-terracotta', '브라운', '무광', '스페인', ['100x100', '200x200'], WALLISH, 59000],
  ['DEMO-Z02', '아쿠아 헥사', 'c-med', 'hex-aqua', '블루·그린', '유광', '스페인', ['100x100', '200x200'], WALLISH, 59000],
  ['DEMO-Z03', '빅토리안 패턴', 'c-med', 'victorian', '멀티', '반광', '스페인', ['200x200', '300x300'], ['floor', 'wall'], 62000],
  ['DEMO-Z04', '네이비 헥사', 'c-med', 'hex-navy', '블루·그린', '유광', '스페인', ['100x100', '200x200'], WALLISH, 57000],
  ['DEMO-T01', '베이지 테라조', 'c-terrazzo', 'terrazzo-beige', '멀티', '반광', '이탈리아', ['300x300', '600x600'], ['floor', 'wall'], 44000],
  ['DEMO-T02', '화이트 테라조', 'c-terrazzo', 'terrazzo-white', '화이트', '반광', '이탈리아', ['300x300', '600x600', '800x800'], ['floor', 'wall'], 46000],
  ['DEMO-T03', '웜 테라조', 'c-terrazzo', 'terrazzo-warm', '멀티', '반광', '이탈리아', ['300x300', '600x600'], ['floor', 'wall'], 49000],
  ['DEMO-T04', '믹스 테라조', 'c-terrazzo', 'terrazzo-mix', '멀티', '반광', '이탈리아', ['300x300', '600x600'], ['floor', 'wall'], 49000],
  ['DEMO-T05', '컬러 테라조', 'c-terrazzo', 'terrazzo-color', '멀티', '반광', '이탈리아', ['300x300', '600x600'], ['floor', 'wall'], 52000],
  ['DEMO-H01', '블랙 마퀴나', 'c-hotel', 'marquina-black', '블랙', '유광', '이탈리아', ['600x1200', '800x800', '1200x1200'], ALL, 74000],
  ['DEMO-H02', '네로 앤티크', 'c-hotel', 'nero-concrete', '블랙', '무광', '이탈리아', ['600x600', '600x1200'], FLOORWALL, 45000],
  ['DEMO-H03', '포레스트 마블', 'c-hotel', 'forest-marble', '블루·그린', '유광', '이탈리아', ['600x1200', '800x800'], ALL, 72000],
  ['DEMO-H04', '다크 오닉스', 'c-hotel', 'onyx-dark', '브라운', '유광', '이탈리아', ['600x1200', '800x800', '1200x1200'], ALL, 79000],
  ['DEMO-P01', '화이트 스퀘어', 'c-pattern', 'square-white', '화이트', '유광', '한국', ['100x300', '300x600'], WALLISH, 22000],
  ['DEMO-P02', '블랙 스퀘어', 'c-pattern', 'square-black', '블랙', '유광', '한국', ['100x300', '300x600'], WALLISH, 22000],
  ['DEMO-P03', '화이트 헥사곤', 'c-pattern', 'hex-white', '화이트', '반광', '이탈리아', ['100x100', '200x200'], ALL, 48000],
  ['DEMO-P04', '블랙 헥사곤', 'c-pattern', 'hex-black', '블랙', '무광', '한국', ['100x100', '200x200'], FLOORWALL, 39000],
  ['DEMO-P05', '체크 블랙&베이지', 'c-pattern', 'check-bw', '멀티', '반광', '한국', ['200x200', '300x300'], ['floor', 'wall'], 36000],
  ['DEMO-W01', '내추럴 오크', 'c-wood', 'oak-natural', '브라운', '텍스처', '이탈리아', ['200x200', '300x600', '600x1200'], ['floor', 'wall'], 43000],
  ['DEMO-W02', '라이트 오크', 'c-wood', 'oak-light', '브라운', '텍스처', '이탈리아', ['300x600', '600x1200'], ['floor', 'wall'], 43000],
  ['DEMO-W03', '월넛 브라운', 'c-wood', 'walnut', '브라운', '텍스처', '이탈리아', ['300x600', '600x1200'], ['floor', 'wall'], 46000],
  ['DEMO-W04', '스모크 오크', 'c-wood', 'oak-smoked', '그레이', '텍스처', '이탈리아', ['300x600', '600x1200'], ['floor', 'wall'], 46000],
  ['DEMO-S01', '아틱 화이트 퀄츠', 'c-stone', 'stone-arctic', '화이트', '유광', '한국', ['600x1200', '1200x1200'], ALL, 120000, 'stone'],
  ['DEMO-S02', '미드나잇 블랙 퀄츠', 'c-stone', 'stone-midnight', '블랙', '유광', '한국', ['600x1200', '1200x1200'], ALL, 128000, 'stone'],
  ['DEMO-S03', '슬레이트 블루 퀄츠', 'c-stone', 'stone-slate-blue', '블루·그린', '유광', '한국', ['600x1200', '1200x1200'], WALLISH, 128000, 'stone'],
  ['DEMO-S04', '샌드 베이지 퀄츠', 'c-stone', 'stone-sand', '베이지', '반광', '한국', ['600x1200', '1200x1200'], ALL, 118000, 'stone'],
  ['DEMO-S05', '모카 토프 퀄츠', 'c-stone', 'stone-mocha', '브라운', '무광', '한국', ['600x1200', '1200x1200'], ALL, 118000, 'stone'],
  ['DEMO-S06', '클라우드 그레이 퀄츠', 'c-stone', 'stone-cloud', '그레이', '반광', '한국', ['600x1200', '1200x1200'], ALL, 118000, 'stone'],
  ['DEMO-S07', '솔트&페퍼 퀄츠', 'c-stone', 'stone-pepper', '그레이', '무광', '한국', ['600x1200', '1200x1200'], WALLISH, 112000, 'stone'],
];

export function seedTiles(): Tile[] {
  return ROWS.map((r) => ({
    id: `tile-${r[0].toLowerCase()}`,
    sku: r[0],
    brand: '샘플 타일(데모)',
    name: r[1],
    series: SEED_COLLECTIONS.find((c) => c.id === r[2])?.name,
    origin: r[6],
    finish: r[5],
    color: r[4],
    material: r[10] ?? 'tile',
    sizes: r[7],
    surfaces: r[8],
    price: r[9],
    imageUrl: `/tiles/${r[3]}.jpg`,
    collectionId: r[2],
    active: true,
    updatedAt: NOW,
  }));
}

export const SEED_SETTINGS: DealerSettings = {
  storeName: '타일 쇼룸 (데모)',
  showPrice: true,
};

export type DesignMeta = {
  id: string;
  createdAt: string;
  roomKind?: string;
  /** 확장자 포함 파일명 */
  file: string;
  items: { surface: SurfaceId; tileId: string; name: string; sku: string; sizeId: string }[];
};

export type Db = {
  version: 1;
  tiles: Tile[];
  collections: Collection[];
  leads: Lead[];
  designs: DesignMeta[];
  settings: DealerSettings;
};

export function seedDb(): Db {
  return {
    version: 1,
    tiles: seedTiles(),
    collections: structuredClone(SEED_COLLECTIONS),
    leads: [],
    designs: [],
    settings: structuredClone(SEED_SETTINGS),
  };
}
