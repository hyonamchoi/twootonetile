'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PublicCatalog } from '@/lib/tiles';

/** 공개 카탈로그를 불러오는 훅. reload()로 다시 받을 수 있다. */
export function useCatalog() {
  const [data, setData] = useState<PublicCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    fetch('/api/catalog', { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<PublicCatalog>) : Promise.reject(new Error('카탈로그를 불러오지 못했습니다.'))))
      .then((d) => {
        if (!alive) return;
        setData(d);
        setError(null);
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : '카탈로그를 불러오지 못했습니다.');
      });
    return () => {
      alive = false;
    };
  }, [tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading: !data && !error, reload };
}
