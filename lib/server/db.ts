import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { type Db, SEED_COLLECTIONS, seedDb, seedTiles } from './seed';

/**
 * 파일 기반 JSON 저장소 (MVP).
 * - 로컬/단일 서버에서 동작한다. Vercel 같은 서버리스는 파일 쓰기가 유지되지 않으므로
 *   운영 전에는 Postgres 등으로 교체해야 한다. 이 파일의 mutate/read 인터페이스만 바꾸면 된다.
 * - 개발 서버에서 라우트별로 모듈이 따로 로드돼도 캐시가 갈라지지 않도록 globalThis에 보관한다.
 */

// 서버리스(Vercel)는 프로젝트 폴더가 읽기 전용이라 임시 폴더를 쓴다. 이 경우 데이터는 인스턴스가 바뀌면 사라진다.
export const DATA_DIR =
  process.env.DATA_DIR ||
  (process.env.VERCEL ? path.join(os.tmpdir(), 'reroom-data') : path.join(process.cwd(), 'data'));
const DB_FILE = path.join(DATA_DIR, 'db.json');

type Holder = { cache: Db | null; queue: Promise<unknown> };
const g = globalThis as unknown as { __reroomDb?: Holder };
const holder: Holder = (g.__reroomDb ??= { cache: null, queue: Promise.resolve() });

async function persist(db: Db) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), 'utf8');
  await fs.rename(tmp, DB_FILE);
}

/**
 * 예전 데모 시드(절차적 패턴, 이미지 없음)를 실제 텍스처 이미지 시드로 교체한다.
 * 딜러가 직접 올린 타일·리드·설정은 건드리지 않는다.
 */
function migrateLegacyDemoSeed(db: Db): boolean {
  const isLegacy = (t: Db['tiles'][number]) => t.sku.startsWith('DEMO-') && t.pattern && !t.imageUrl;
  if (!db.tiles.some(isLegacy)) return false;
  db.tiles = [...db.tiles.filter((t) => !isLegacy(t)), ...seedTiles()];
  for (const c of SEED_COLLECTIONS) {
    const i = db.collections.findIndex((x) => x.id === c.id);
    if (i >= 0) db.collections[i] = structuredClone(c);
    else db.collections.push(structuredClone(c));
  }
  return true;
}

async function load(): Promise<Db> {
  if (holder.cache) return holder.cache;
  try {
    holder.cache = JSON.parse(await fs.readFile(DB_FILE, 'utf8')) as Db;
    if (migrateLegacyDemoSeed(holder.cache)) await persist(holder.cache).catch(() => undefined);
  } catch {
    holder.cache = seedDb();
    // 저장소를 못 쓰는 환경에서도 시드 카탈로그로 계속 동작해야 한다
    await persist(holder.cache).catch((e) => console.warn('DB 파일을 저장하지 못해 메모리에서만 동작합니다:', e instanceof Error ? e.message : e));
  }
  return holder.cache;
}

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = holder.queue.then(job, job);
  holder.queue = run.catch(() => undefined);
  return run;
}

/** 읽기 전용 스냅샷 (수정해도 저장소에 영향 없음) */
export function readDb(): Promise<Db> {
  return enqueue(async () => structuredClone(await load()));
}

/** 직렬화된 쓰기. fn이 db를 직접 수정하면 끝난 뒤 디스크에 저장한다. */
export function mutateDb<T>(fn: (db: Db) => T | Promise<T>): Promise<T> {
  return enqueue(async () => {
    const db = await load();
    const result = await fn(db);
    await persist(db);
    return result;
  });
}

export const TILE_IMAGE_DIR = path.join(DATA_DIR, 'tile-images');
export const DESIGN_DIR = path.join(DATA_DIR, 'designs');
