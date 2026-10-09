/** 인메모리 슬라이딩 윈도우가 아닌 단순 고정 윈도우 제한기. 단일 서버용 MVP. */

type Bucket = { count: number; resetAt: number };
const g = globalThis as unknown as { __reroomLimits?: Map<string, Bucket> };
const buckets = (g.__reroomLimits ??= new Map<string, Bucket>());

function sweep(now: number) {
  if (buckets.size < 2000) return;
  for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
}

function get(key: string, windowMs: number): Bucket {
  const now = Date.now();
  sweep(now);
  let b = buckets.get(key);
  if (!b || b.resetAt < now) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  return b;
}

/** 소비하지 않고 허용 여부만 확인 */
export function allowed(key: string, limit: number, windowMs: number): boolean {
  return get(key, windowMs).count < limit;
}

export function consume(key: string, windowMs: number) {
  get(key, windowMs).count += 1;
}

/** 확인과 소비를 한 번에 */
export function take(key: string, limit: number, windowMs: number): boolean {
  const b = get(key, windowMs);
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}
