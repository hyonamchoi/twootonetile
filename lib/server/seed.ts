import type {
  ColorFamily,
  Collection,
  DealerSettings,
  Finish,
  Lead,
  SurfaceId,
  Tile,
  TilePatternKind,
} from '../tiles';

/**
 * 첫 실행 때 채워지는 데모 카탈로그.
 * 실제 제품이 아니라 절차적으로 그린 샘플이며, 딜러 콘솔에서 업로드·동기화로 교체한다.
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
    id: 'c-med',
    name: '지중해 젤리지',
    description: '손으로 빚은 듯한 유약 질감의 컬러 타일. 주방 백스플래시와 포인트 벽.',
    visible: true,
    order: 2,
  },
  {
    id: 'c-terrazzo',
    name: '테라조 리바이벌',
    description: '작은 칩이 박힌 테라조 패턴. 현관과 욕실 바닥에 개성을 더합니다.',
    visible: true,
    order: 3,
  },
  {
    id: 'c-hotel',
    name: '다크 호텔 바스',
    description: '짙은 톤과 골드 베인의 라인. 하이엔드 욕실을 위한 컬렉션.',
    visible: true,
    order: 4,
  },
  {
    id: 'c-pattern',
    name: '서브웨이 & 헤링본',
    description: '클래식 패턴 타일. 백스플래시와 샤워 공간에 어울립니다.',
    visible: true,
    order: 5,
  },
  {
    id: 'c-wood',
    name: '우드 룩 포세린',
    description: '나무 결 질감을 담은 내구성 좋은 포세린.',
    visible: true,
    order: 6,
  },
];

type Row = [
  sku: string,
  name: string,
  collectionId: string,
  kind: TilePatternKind,
  colors: string[],
  color: ColorFamily,
  finish: Finish,
  origin: string,
  sizes: string[],
  surfaces: SurfaceId[],
  price: number,
];

const ALL: SurfaceId[] = ['floor', 'wall', 'backsplash', 'shower'];
const WALLISH: SurfaceId[] = ['wall', 'backsplash', 'shower'];
const FLOORWALL: SurfaceId[] = ['floor', 'wall', 'shower'];

const ROWS: Row[] = [
  ['DEMO-M01', '카라라 화이트', 'c-milano', 'marble', ['#eeeeec', '#a7a9ad', '#7c7f85'], '화이트', '유광', '이탈리아', ['600x600', '600x1200', '800x800', '1200x1200'], ALL, 52000],
  ['DEMO-M02', '칼라카타 골드', 'c-milano', 'marble', ['#f1efe9', '#b79a63', '#8a7a62'], '화이트', '유광', '이탈리아', ['600x1200', '800x800', '1200x1200'], ALL, 68000],
  ['DEMO-M03', '그리지오 클라우드', 'c-milano', 'concrete', ['#b9b8b4'], '그레이', '무광', '이탈리아', ['600x600', '600x1200', '800x800'], FLOORWALL, 41000],
  ['DEMO-M04', '샌드 트래버틴', 'c-milano', 'marble', ['#e1d3bb', '#b9a483', '#d2c2a4'], '베이지', '반광', '이탈리아', ['300x600', '600x600', '600x1200'], ALL, 47000],
  ['DEMO-M05', '아이보리 콘크리트', 'c-milano', 'concrete', ['#d9d4c8'], '베이지', '무광', '이탈리아', ['600x600', '800x800'], FLOORWALL, 36000],
  ['DEMO-M06', '그레이 슬레이트', 'c-milano', 'concrete', ['#6f7276'], '그레이', '텍스처', '이탈리아', ['300x600', '600x600'], FLOORWALL, 38000],
  ['DEMO-Z01', '올리브 젤리지', 'c-med', 'zellige', ['#6f7f4c', '#4e5b35'], '블루·그린', '유광', '스페인', ['100x100', '200x200'], WALLISH, 59000],
  ['DEMO-Z02', '코발트 젤리지', 'c-med', 'zellige', ['#2c5aa0', '#1d3f78'], '블루·그린', '유광', '스페인', ['100x100', '200x200'], WALLISH, 59000],
  ['DEMO-Z03', '테라코타 젤리지', 'c-med', 'zellige', ['#c0663f', '#8f4a2c'], '브라운', '유광', '스페인', ['100x100', '200x200'], WALLISH, 59000],
  ['DEMO-Z04', '크림 젤리지', 'c-med', 'zellige', ['#ece3cf', '#cdbf9f'], '베이지', '유광', '스페인', ['100x100', '100x300', '200x200'], WALLISH, 55000],
  ['DEMO-Z05', '세이지 글레이즈', 'c-med', 'glaze', ['#a9b69a'], '블루·그린', '유광', '스페인', ['100x300', '200x200', '300x300'], WALLISH, 33000],
  ['DEMO-T01', '베이지 테라조', 'c-terrazzo', 'terrazzo', ['#e4dac8', '#b88b63', '#7e8c75', '#c8c1b4'], '멀티', '반광', '이탈리아', ['300x300', '600x600'], ['floor', 'wall'], 44000],
  ['DEMO-T02', '화이트 테라조', 'c-terrazzo', 'terrazzo', ['#efede8', '#4a4a4a', '#b7b3aa', '#9a7b5e'], '멀티', '반광', '이탈리아', ['300x300', '600x600', '800x800'], ['floor', 'wall'], 46000],
  ['DEMO-T03', '블러시 테라조', 'c-terrazzo', 'terrazzo', ['#e8d3cb', '#a8574a', '#f6efe6', '#8d8f7c'], '멀티', '반광', '이탈리아', ['300x300', '600x600'], ['floor', 'wall'], 49000],
  ['DEMO-H01', '블랙 마퀴나', 'c-hotel', 'marble', ['#1b1b1d', '#c7a95e', '#6e6a62'], '블랙', '유광', '이탈리아', ['600x1200', '800x800', '1200x1200'], ALL, 74000],
  ['DEMO-H02', '네로 앤티크', 'c-hotel', 'concrete', ['#303134'], '블랙', '무광', '이탈리아', ['600x600', '600x1200'], FLOORWALL, 45000],
  ['DEMO-H03', '에메랄드 마블', 'c-hotel', 'marble', ['#1f4a3e', '#c8d4c4', '#8aa597'], '블루·그린', '유광', '이탈리아', ['600x1200', '800x800'], ALL, 72000],
  ['DEMO-P01', '화이트 서브웨이', 'c-pattern', 'glaze', ['#f1f0ec'], '화이트', '유광', '한국', ['100x300', '300x600'], WALLISH, 22000],
  ['DEMO-P02', '그레이 서브웨이', 'c-pattern', 'glaze', ['#b4b6b8'], '그레이', '유광', '한국', ['100x300', '300x600'], WALLISH, 22000],
  ['DEMO-P03', '화이트 헤링본', 'c-pattern', 'herringbone', ['#ecebe6', '#cfcdc6'], '화이트', '반광', '이탈리아', ['100x300', '300x600'], ALL, 48000],
  ['DEMO-P04', '블랙 헥사곤', 'c-pattern', 'hex', ['#2a2a2c', '#d9d6cf', '#8b8982'], '멀티', '무광', '한국', ['100x100', '200x200'], ['floor', 'wall', 'shower'], 39000],
  ['DEMO-P05', '체크 블랙&화이트', 'c-pattern', 'check', ['#f2f0eb', '#2a2a2c'], '멀티', '반광', '한국', ['200x200', '300x300'], ['floor', 'wall'], 36000],
  ['DEMO-W01', '내추럴 오크', 'c-wood', 'wood', ['#b98f5e', '#6f4f2f'], '브라운', '텍스처', '이탈리아', ['200x200', '300x600', '600x1200'], ['floor', 'wall'], 43000],
  ['DEMO-W02', '애쉬 그레이', 'c-wood', 'wood', ['#a7a39a', '#6e6b64'], '그레이', '텍스처', '이탈리아', ['300x600', '600x1200'], ['floor', 'wall'], 43000],
  ['DEMO-W03', '월넛 브라운', 'c-wood', 'wood', ['#6e4a30', '#3d2918'], '브라운', '텍스처', '이탈리아', ['300x600', '600x1200'], ['floor', 'wall'], 46000],
];

export function seedTiles(): Tile[] {
  return ROWS.map((r, i) => ({
    id: `tile-${r[0].toLowerCase()}`,
    sku: r[0],
    brand: '샘플 타일(데모)',
    name: r[1],
    series: SEED_COLLECTIONS.find((c) => c.id === r[2])?.name,
    origin: r[7],
    finish: r[6],
    color: r[5],
    sizes: r[8],
    surfaces: r[9],
    price: r[10],
    pattern: { kind: r[3], colors: r[4], seed: 1000 + i * 37 },
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
