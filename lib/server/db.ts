import { promises as fs } from 'node:fs';
import path from 'node:path';
import { type Db, seedDb } from './seed';

/**
 * 파일 기반 JSON 저장소 (MVP).
 * - 로컬/단일 서버에서 동작한다. Vercel 같은 서버리스는 파일 쓰기가 유지되지 않으므로
 *   운영 전에는 Postgres 등으로 교체해야 한다. 이 파일의 mutate/read 인터페이스만 바꾸면 된다.
 * - 개발 서버에서 라우트별로 모듈이 따로 로드돼도 캐시가 갈라지지 않도록 globalThis에 보관한다.
 */

export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
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

async function load(): Promise<Db> {
  if (holder.cache) return holder.cache;
  try {
    holder.cache = JSON.parse(await fs.readFile(DB_FILE, 'utf8')) as Db;
  } catch {
    holder.cache = seedDb();
    await persist(holder.cache);
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
