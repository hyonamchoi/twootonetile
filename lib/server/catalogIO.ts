import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  COLOR_FAMILIES,
  SURFACE_IDS,
  type ColorFamily,
  type Finish,
  type MaterialId,
  type SurfaceId,
  type Tile,
} from '../tiles';
import { mutateDb, readDb, TILE_IMAGE_DIR } from './db';
import { safeFetch } from './netguard';

/* ───────── 한 줄(row) 정규화 ───────── */

const MAX_ROWS = 5000;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const ALIASES: Record<string, string> = {
  sku: 'sku', 품번: 'sku', 제품코드: 'sku', 상품코드: 'sku',
  brand: 'brand', 브랜드: 'brand',
  name: 'name', 제품명: 'name', 상품명: 'name',
  series: 'series', 시리즈: 'series',
  origin: 'origin', 원산지: 'origin',
  finish: 'finish', 마감: 'finish', 표면: 'finish',
  color: 'color', 색상: 'color', 컬러: 'color',
  sizes: 'sizes', size: 'sizes', 규격: 'sizes', 사이즈: 'sizes',
  surfaces: 'surfaces', 적용면: 'surfaces', 용도: 'surfaces',
  price: 'price', 가격: 'price', 단가: 'price',
  image: 'imageUrl', imageurl: 'imageUrl', 이미지: 'imageUrl', 이미지url: 'imageUrl',
  collection: 'collection', 컬렉션: 'collection',
  material: 'material', 소재: 'material', 재질: 'material', 분류: 'material',
  active: 'active', 노출: 'active',
};

type NormalizedTile = {
  sku: string;
  brand: string;
  name: string;
  series?: string;
  origin?: string;
  finish: Finish;
  color: ColorFamily;
  material: MaterialId;
  sizes: string[];
  surfaces: SurfaceId[];
  price?: number;
  imageUrl?: string;
  collection?: string;
  active: boolean;
};

function str(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.join(';');
  return String(v).trim();
}

function parseFinish(s: string): Finish {
  const t = s.toLowerCase();
  if (/유광|폴리싱|glos|polish/.test(t)) return '유광';
  if (/반광|새틴|satin|semi/.test(t)) return '반광';
  if (/텍스처|러프|구조|texture|rough|struct/.test(t)) return '텍스처';
  return '무광';
}

function parseMaterial(s: string): MaterialId {
  return /스톤|석영|퀄츠|quartz|stone|slab/i.test(s) ? 'stone' : 'tile';
}

function parseColor(s: string): ColorFamily {
  const exact = COLOR_FAMILIES.find((c) => c === s);
  if (exact) return exact;
  const t = s.toLowerCase();
  if (/white|화이트|흰|백색/.test(t)) return '화이트';
  if (/beige|ivory|cream|베이지|아이보리|크림|샌드/.test(t)) return '베이지';
  if (/gr[ae]y|그레이|회색|실버/.test(t)) return '그레이';
  if (/black|블랙|검정|검은/.test(t)) return '블랙';
  if (/brown|wood|oak|walnut|브라운|갈색|우드|오크|월넛/.test(t)) return '브라운';
  if (/blue|green|teal|블루|그린|청|녹|민트/.test(t)) return '블루·그린';
  return '멀티';
}

function parseSizes(s: string): string[] {
  const out = new Set<string>();
  for (const part of s.split(/[;|,\n]/)) {
    const m = part.trim().match(/^(\d{2,4})\s*[x×*]\s*(\d{2,4})(?:\s*mm)?$/i);
    if (m) {
      const w = Number(m[1]);
      const h = Number(m[2]);
      if (w >= 20 && h >= 20 && w <= 3000 && h <= 3000) out.add(`${w}x${h}`);
    }
  }
  return [...out];
}

// 상판은 대리석·스톤 계열에만 어울리므로 면 정보를 안 준 제품의 기본값에서는 뺀다
const DEFAULT_SURFACES = SURFACE_IDS.filter((id) => id !== 'countertop');

function parseSurfaces(s: string): SurfaceId[] {
  if (!s) return [...DEFAULT_SURFACES];
  const t = s.toLowerCase();
  const out: SurfaceId[] = [];
  if (/바닥|floor/.test(t)) out.push('floor');
  if (/벽|wall/.test(t)) out.push('wall');
  if (/백스|backsplash|주방벽/.test(t)) out.push('backsplash');
  if (/샤워|shower|욕조/.test(t)) out.push('shower');
  if (/상판|카운터|아일랜드|세면대|countertop|worktop|vanity/.test(t)) out.push('countertop');
  return out.length ? out : [...DEFAULT_SURFACES];
}

function parseActive(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  const t = str(v).toLowerCase();
  if (!t) return true;
  return !/^(0|false|n|no|아니오|미노출|숨김)$/.test(t);
}

function keyOf(k: string): string {
  return k.toLowerCase().replace(/[\s_\-()]/g, '');
}

export function normalizeRow(
  raw: Record<string, unknown>
): { tile: NormalizedTile } | { error: string } {
  const row: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    const mapped = ALIASES[keyOf(k)];
    if (mapped) row[mapped] = v;
  }
  const sku = str(row.sku);
  const name = str(row.name);
  if (!sku) return { error: '품번(sku)이 없습니다.' };
  if (!name) return { error: `${sku}: 제품명(name)이 없습니다.` };

  const priceDigits = str(row.price).replace(/[^\d]/g, '');
  const price = priceDigits ? Number(priceDigits) : undefined;
  const imageUrl = str(row.imageUrl);

  return {
    tile: {
      sku: sku.slice(0, 60),
      brand: (str(row.brand) || '브랜드 미지정').slice(0, 60),
      name: name.slice(0, 80),
      series: str(row.series).slice(0, 80) || undefined,
      origin: str(row.origin).slice(0, 30) || undefined,
      finish: parseFinish(str(row.finish)),
      color: parseColor(str(row.color)),
      material: parseMaterial(str(row.material)),
      sizes: parseSizes(str(row.sizes)),
      surfaces: parseSurfaces(str(row.surfaces)),
      price: price && price < 100_000_000 ? price : undefined,
      imageUrl: imageUrl || undefined,
      collection: str(row.collection).slice(0, 60) || undefined,
      active: parseActive(row.active),
    },
  };
}

/* ───────── CSV / JSON 파싱 ───────── */

export function parseCsv(text: string): Record<string, string>[] {
  const src = text.replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] ?? '';
  const delim = firstLine.includes('\t') && !firstLine.includes(',') ? '\t' : ',';

  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) {
      cur.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      cur.push(field);
      field = '';
      if (cur.some((c) => c.trim() !== '')) rows.push(cur);
      cur = [];
    } else field += ch;
  }
  cur.push(field);
  if (cur.some((c) => c.trim() !== '')) rows.push(cur);

  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const o: Record<string, string> = {};
    header.forEach((h, i) => {
      if (h) o[h] = (r[i] ?? '').trim();
    });
    return o;
  });
}

export function parseFeedText(text: string): Record<string, unknown>[] {
  const t = text.trim();
  if (t.startsWith('[') || t.startsWith('{')) {
    const data = JSON.parse(t) as unknown;
    const list = Array.isArray(data)
      ? data
      : ((data as Record<string, unknown>).tiles ??
        (data as Record<string, unknown>).items ??
        (data as Record<string, unknown>).products);
    if (!Array.isArray(list)) throw new Error('JSON에서 타일 배열(tiles/items/products)을 찾지 못했습니다.');
    return list.filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null);
  }
  return parseCsv(t);
}

/* ───────── 이미지 저장 ───────── */

type Sniffed = { ext: 'png' | 'jpg' | 'webp'; mime: string };

function sniffImage(b: Buffer): Sniffed | null {
  if (b.length > 12 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47)
    return { ext: 'png', mime: 'image/png' };
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff)
    return { ext: 'jpg', mime: 'image/jpeg' };
  if (b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP')
    return { ext: 'webp', mime: 'image/webp' };
  return null;
}

async function fetchImageBuffer(src: string): Promise<Buffer> {
  const m = src.match(/^data:image\/(?:png|jpeg|webp);base64,(.+)$/);
  if (m) {
    const buf = Buffer.from(m[1], 'base64');
    if (buf.length > MAX_IMAGE_BYTES) throw new Error('이미지가 4MB를 초과합니다.');
    return buf;
  }
  const { buf } = await safeFetch(src, { maxBytes: MAX_IMAGE_BYTES });
  return buf;
}

async function removeTileImages(id: string) {
  try {
    const files = await fs.readdir(TILE_IMAGE_DIR);
    await Promise.all(
      files.filter((f) => f.startsWith(`${id}.`)).map((f) => fs.rm(path.join(TILE_IMAGE_DIR, f), { force: true }))
    );
  } catch {
    /* 폴더가 아직 없으면 무시 */
  }
}

async function writeTileImage(id: string, buf: Buffer, s: Sniffed) {
  await fs.mkdir(TILE_IMAGE_DIR, { recursive: true });
  await removeTileImages(id);
  await fs.writeFile(path.join(TILE_IMAGE_DIR, `${id}.${s.ext}`), buf);
}

export async function readTileImage(id: string): Promise<{ buf: Buffer; mime: string } | null> {
  if (!/^[a-zA-Z0-9-]+$/.test(id)) return null;
  for (const [ext, mime] of [['jpg', 'image/jpeg'], ['png', 'image/png'], ['webp', 'image/webp']] as const) {
    try {
      return { buf: await fs.readFile(path.join(TILE_IMAGE_DIR, `${id}.${ext}`)), mime };
    } catch {
      /* 다음 확장자 */
    }
  }
  return null;
}

export async function deleteTile(id: string): Promise<boolean> {
  const removed = await mutateDb((db) => {
    const before = db.tiles.length;
    db.tiles = db.tiles.filter((t) => t.id !== id);
    return db.tiles.length < before;
  });
  if (removed) await removeTileImages(id);
  return removed;
}

/* ───────── 가져오기(업서트) ───────── */

export type ImportResult = {
  created: number;
  updated: number;
  failed: number;
  messages: string[];
};

async function pool<T, R>(items: T[], size: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    })
  );
  return out;
}

export async function importRows(rawRows: Record<string, unknown>[]): Promise<ImportResult> {
  const result: ImportResult = { created: 0, updated: 0, failed: 0, messages: [] };
  const note = (m: string) => {
    if (result.messages.length < 20) result.messages.push(m);
  };

  if (rawRows.length > MAX_ROWS) throw new Error(`한 번에 ${MAX_ROWS}개까지만 가져올 수 있습니다.`);

  const parsed: NormalizedTile[] = [];
  rawRows.forEach((r, i) => {
    const n = normalizeRow(r);
    if ('error' in n) {
      result.failed++;
      note(`${i + 1}행: ${n.error}`);
    } else parsed.push(n.tile);
  });

  // 같은 품번이 여러 번 나오면 마지막 줄만 반영
  const bySku = new Map<string, NormalizedTile>();
  parsed.forEach((t) => bySku.set(t.sku, t));
  const tiles = [...bySku.values()];

  // 이미지는 네트워크 작업이라 DB 락 밖에서 먼저 받아 둔다 (이미 받은 원본이면 건너뜀)
  const existing = (await readDb()).tiles;
  const bySkuExisting = new Map(existing.map((t) => [t.sku, t]));
  const images = new Map<string, { buf: Buffer; sniff: Sniffed; source: string }>();
  await pool(
    tiles.filter((t) => t.imageUrl && bySkuExisting.get(t.sku)?.imageSource !== t.imageUrl),
    4,
    async (t) => {
      try {
        const buf = await fetchImageBuffer(t.imageUrl as string);
        const sniff = sniffImage(buf);
        if (!sniff) throw new Error('PNG/JPG/WebP 이미지가 아닙니다.');
        images.set(t.sku, { buf, sniff, source: t.imageUrl as string });
      } catch (e) {
        note(`${t.sku}: 이미지를 가져오지 못했습니다 (${e instanceof Error ? e.message : '오류'})`);
      }
    }
  );

  await mutateDb(async (db) => {
    const now = new Date().toISOString();
    const collectionId = (name?: string): string | undefined => {
      if (!name) return undefined;
      let c = db.collections.find((x) => x.name === name);
      if (!c) {
        c = {
          id: `c-${randomUUID().slice(0, 8)}`,
          name,
          visible: true,
          order: db.collections.reduce((m, x) => Math.max(m, x.order), 0) + 1,
        };
        db.collections.push(c);
      }
      return c.id;
    };

    for (const t of tiles) {
      const cur = db.tiles.find((x) => x.sku === t.sku);
      const img = images.get(t.sku);
      const base: Tile = cur ?? {
        id: `tile-${randomUUID().slice(0, 8)}`,
        sku: t.sku,
        brand: t.brand,
        name: t.name,
        finish: t.finish,
        color: t.color,
        material: t.material,
        sizes: [],
        surfaces: [],
        active: true,
        updatedAt: now,
      };
      Object.assign(base, {
        brand: t.brand,
        name: t.name,
        series: t.series,
        origin: t.origin,
        finish: t.finish,
        color: t.color,
        material: t.material,
        sizes: t.sizes,
        surfaces: t.surfaces,
        price: t.price,
        active: t.active,
        updatedAt: now,
      });
      const cid = collectionId(t.collection);
      if (cid) base.collectionId = cid;
      if (img) {
        await writeTileImage(base.id, img.buf, img.sniff);
        base.imageUrl = `/api/tile-images/${base.id}?v=${Date.now()}`;
        base.imageSource = img.source;
        delete base.pattern;
      }
      if (!cur) {
        db.tiles.push(base);
        result.created++;
      } else result.updated++;
    }
  });

  return result;
}

/* ───────── 피드 동기화 ───────── */

const sg = globalThis as unknown as { __twotoneSyncing?: boolean };

export async function runSync(): Promise<{ ok: boolean; message: string }> {
  if (sg.__twotoneSyncing) return { ok: false, message: '이미 동기화가 진행 중입니다.' };
  sg.__twotoneSyncing = true;
  const finish = async (ok: boolean, message: string) => {
    await mutateDb((db) => {
      if (db.settings.feed) {
        db.settings.feed.lastSyncAt = new Date().toISOString();
        db.settings.feed.lastResult = message;
      }
    });
    return { ok, message };
  };
  try {
    const feed = (await readDb()).settings.feed;
    if (!feed?.url) return { ok: false, message: '피드 URL이 설정되지 않았습니다.' };
    const { buf } = await safeFetch(feed.url, { maxBytes: 8 * 1024 * 1024, timeoutMs: 30000 });
    const rows = parseFeedText(buf.toString('utf8'));
    const r = await importRows(rows);
    return finish(true, `신규 ${r.created} · 수정 ${r.updated} · 실패 ${r.failed}`);
  } catch (e) {
    return finish(false, `동기화 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}`);
  } finally {
    sg.__twotoneSyncing = false;
  }
}

/** 소비자 카탈로그 조회 때 주기가 지났으면 백그라운드로 한 번 동기화한다. */
export async function maybeAutoSync(): Promise<void> {
  const feed = (await readDb()).settings.feed;
  if (!feed?.url || !feed.autoSyncHours || sg.__twotoneSyncing) return;
  const last = feed.lastSyncAt ? Date.parse(feed.lastSyncAt) : 0;
  if (Date.now() - last < feed.autoSyncHours * 3600_000) return;
  void runSync();
}
