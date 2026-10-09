'use client';

import { useMemo, useRef, useState } from 'react';
import TileThumb from '@/components/tile/TileThumb';
import { COLOR_FAMILIES, FINISHES, SURFACES, TILE_SIZES, formatWon, type Tile } from '@/lib/tiles';
import { api, btn, btnPrimary, input } from './api';
import type { CatalogData } from './DealerConsole';

const TEMPLATE_CSV =
  '﻿품번,브랜드,제품명,시리즈,원산지,마감,색상,규격,적용면,가격,이미지URL,컬렉션,노출\r\n' +
  'DEMO-001,샘플브랜드,카라라 화이트,카라라,이탈리아,유광,화이트,600x1200;300x600,바닥;벽;샤워,68000,https://example.com/carrara.jpg,모던 마블,Y\r\n';

type ImportResult = { created: number; updated: number; failed: number; messages: string[] };

function fileToDataUrl(f: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error('이미지를 읽지 못했습니다.'));
    r.readAsDataURL(f);
  });
}

export default function CatalogTab({ data, onChange }: { data: CatalogData; onChange: () => Promise<void> }) {
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const shown = useMemo(() => {
    const k = q.trim().toLowerCase();
    return data.tiles.filter(
      (t) => !k || `${t.sku} ${t.brand} ${t.name} ${t.series ?? ''}`.toLowerCase().includes(k)
    );
  }, [data.tiles, q]);

  async function run(fn: () => Promise<string | void>) {
    setBusy(true);
    setMsg('');
    try {
      const m = await fn();
      await onChange();
      if (m) setMsg(m);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '처리하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }

  const importFile = (f: File) =>
    run(async () => {
      const text = await f.text();
      const r = await api<ImportResult>('/api/dealer/import', { method: 'POST', json: { text } });
      return `신규 ${r.created}건, 수정 ${r.updated}건, 실패 ${r.failed}건${r.messages.length ? ` — ${r.messages.slice(0, 3).join(' / ')}` : ''}`;
    });

  const sync = () =>
    run(async () => {
      const r = await api<{ ok: boolean; message: string }>('/api/dealer/sync', { method: 'POST' });
      return r.message;
    });

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tile-catalog-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const patch = (t: Tile, p: Record<string, unknown>) =>
    run(() => api(`/api/dealer/tiles/${t.id}`, { method: 'PATCH', json: p }).then(() => undefined));

  return (
    <section>
      <div className="flex flex-wrap items-center gap-2">
        <input className={`${input} max-w-xs`} placeholder="품번·브랜드·제품명 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="text-[13px] text-ink-soft">
          전체 {data.tiles.length}종 · 노출 {data.tiles.filter((t) => t.active).length}종
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          <button className={btn} onClick={() => setAdding((v) => !v)}>+ 타일 직접 등록</button>
          <button className={btn} onClick={() => fileRef.current?.click()} disabled={busy}>CSV/JSON 가져오기</button>
          <button className={btn} onClick={downloadTemplate}>CSV 양식 받기</button>
          <button className={btnPrimary} onClick={sync} disabled={busy || !data.settings.feed?.url} title={data.settings.feed?.url ? '' : '설정 탭에서 피드 URL을 먼저 등록하세요'}>
            지금 동기화
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.json,text/csv,application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void importFile(f);
          }}
        />
      </div>
      <p className="mt-2 text-[12px] text-ink-faint">
        품번 기준으로 신규 등록·수정되고, 없는 컬렉션은 자동으로 만들어집니다. 피드 자동 동기화는 설정 탭에서 등록합니다.
        {data.settings.feed?.lastSyncAt && ` 마지막 동기화: ${new Date(data.settings.feed.lastSyncAt).toLocaleString('ko-KR')} (${data.settings.feed.lastResult ?? ''})`}
      </p>
      {msg && <p className="mt-2 rounded-lg bg-sand px-3 py-2 text-[13px] text-ink">{msg}</p>}

      {adding && (
        <AddTile
          collections={data.collections}
          onDone={async (m) => {
            setAdding(false);
            await onChange();
            setMsg(m);
          }}
        />
      )}

      <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-paper-raised">
        <table className="w-full min-w-[760px] text-left text-[13px]">
          <thead className="border-b border-line text-ink-faint">
            <tr>
              <th className="px-3 py-2 font-normal">타일</th>
              <th className="px-3 py-2 font-normal">품번</th>
              <th className="px-3 py-2 font-normal">컬렉션</th>
              <th className="px-3 py-2 font-normal">가격(㎡)</th>
              <th className="px-3 py-2 font-normal">노출</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {shown.map((t) => (
              <tr key={t.id} className="border-b border-line last:border-0">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2.5">
                    <TileThumb tile={t} px={96} className="h-10 w-10 rounded" />
                    <div>
                      <div className="font-medium text-ink">{t.name}</div>
                      <div className="text-[12px] text-ink-soft">{t.brand} · {t.finish} · {t.color}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 text-ink-soft">{t.sku}</td>
                <td className="px-3 py-2">
                  <select
                    className="rounded border border-line-strong bg-paper-raised px-1.5 py-1"
                    value={t.collectionId ?? ''}
                    disabled={busy}
                    onChange={(e) => patch(t, { collectionId: e.target.value || null })}
                  >
                    <option value="">미분류</option>
                    {data.collections.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <PriceCell tile={t} disabled={busy} onSave={(v) => patch(t, { price: v })} />
                </td>
                <td className="px-3 py-2">
                  <input type="checkbox" checked={t.active} disabled={busy} onChange={(e) => patch(t, { active: e.target.checked })} aria-label="노출" />
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    className="text-clay-deep underline"
                    onClick={() => {
                      if (window.confirm(`${t.name} (${t.sku})을 삭제할까요?`)) {
                        void run(() => api(`/api/dealer/tiles/${t.id}`, { method: 'DELETE' }).then(() => undefined));
                      }
                    }}
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-ink-soft">표시할 타일이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PriceCell({ tile, disabled, onSave }: { tile: Tile; disabled: boolean; onSave: (v: number | null) => void }) {
  const [v, setV] = useState(tile.price ? String(tile.price) : '');
  return (
    <input
      className="w-24 rounded border border-line-strong bg-paper-raised px-1.5 py-1"
      inputMode="numeric"
      placeholder="-"
      title={tile.price ? formatWon(tile.price) : ''}
      value={v}
      disabled={disabled}
      onChange={(e) => setV(e.target.value.replace(/[^\d]/g, ''))}
      onBlur={() => {
        const n = v ? Number(v) : null;
        if (n !== (tile.price ?? null)) onSave(n);
      }}
    />
  );
}

function AddTile({
  collections,
  onDone,
}: {
  collections: CatalogData['collections'];
  onDone: (msg: string) => Promise<void>;
}) {
  const [f, setF] = useState({
    sku: '', brand: '', name: '', series: '', origin: '', finish: FINISHES[0] as string,
    color: COLOR_FAMILIES[0] as string, price: '', collection: '',
  });
  const [sizes, setSizes] = useState<string[]>([]);
  const [surfaces, setSurfaces] = useState<string[]>(SURFACES.map((s) => s.id));
  const [image, setImage] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await api('/api/dealer/tiles', {
        method: 'POST',
        json: {
          ...f,
          sizes: sizes.join(';'),
          surfaces: surfaces.join(';'),
          image,
          collection: collections.find((c) => c.id === f.collection)?.name ?? '',
        },
      });
      await onDone(`${f.name} 등록을 완료했습니다.`);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : '등록하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3 rounded-xl border border-line bg-paper-raised p-4">
      <div className="grid gap-2 sm:grid-cols-3">
        <input className={input} placeholder="품번 *" value={f.sku} onChange={(e) => set('sku', e.target.value)} required />
        <input className={input} placeholder="브랜드" value={f.brand} onChange={(e) => set('brand', e.target.value)} />
        <input className={input} placeholder="제품명 *" value={f.name} onChange={(e) => set('name', e.target.value)} required />
        <input className={input} placeholder="시리즈" value={f.series} onChange={(e) => set('series', e.target.value)} />
        <input className={input} placeholder="원산지" value={f.origin} onChange={(e) => set('origin', e.target.value)} />
        <input className={input} placeholder="가격(원/㎡)" inputMode="numeric" value={f.price} onChange={(e) => set('price', e.target.value.replace(/[^\d]/g, ''))} />
        <select className={input} value={f.finish} onChange={(e) => set('finish', e.target.value)}>
          {FINISHES.map((x) => <option key={x}>{x}</option>)}
        </select>
        <select className={input} value={f.color} onChange={(e) => set('color', e.target.value)}>
          {COLOR_FAMILIES.map((x) => <option key={x}>{x}</option>)}
        </select>
        <select className={input} value={f.collection} onChange={(e) => set('collection', e.target.value)}>
          <option value="">컬렉션 없음</option>
          {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <span className="mr-1 text-[13px] text-ink-faint">규격</span>
        {TILE_SIZES.map((s) => (
          <label key={s.id} className={`cursor-pointer rounded-full border px-2.5 py-1 text-[12px] ${sizes.includes(s.id) ? 'border-ink bg-ink text-paper' : 'border-line-strong'}`}>
            <input type="checkbox" className="hidden" checked={sizes.includes(s.id)} onChange={() => setSizes((a) => toggle(a, s.id))} />
            {s.label}
          </label>
        ))}
        <span className="text-[12px] text-ink-faint">(선택하지 않으면 전체 허용)</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <span className="mr-1 text-[13px] text-ink-faint">적용면</span>
        {SURFACES.map((s) => (
          <label key={s.id} className={`cursor-pointer rounded-full border px-2.5 py-1 text-[12px] ${surfaces.includes(s.id) ? 'border-ink bg-ink text-paper' : 'border-line-strong'}`}>
            <input type="checkbox" className="hidden" checked={surfaces.includes(s.id)} onChange={() => setSurfaces((a) => toggle(a, s.id))} />
            {s.label}
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <input
          type="file"
          accept="image/*"
          className="text-[13px]"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 4 * 1024 * 1024) {
              setErr('이미지는 4MB 이하만 등록할 수 있습니다.');
              return;
            }
            setImage(await fileToDataUrl(file));
          }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {image && <img src={image} alt="미리보기" className="h-12 w-12 rounded object-cover" />}
      </div>
      {err && <p className="text-[13px] text-clay-deep">{err}</p>}
      <button className={btnPrimary} disabled={busy}>{busy ? '등록 중…' : '등록'}</button>
    </form>
  );
}
