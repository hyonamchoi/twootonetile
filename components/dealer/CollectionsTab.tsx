'use client';

import { useState } from 'react';
import type { Collection } from '@/lib/tiles';
import { api, btn, btnPrimary, input } from './api';
import type { CatalogData } from './DealerConsole';

type Row = { id?: string; name: string; description: string; visible: boolean };

export default function CollectionsTab({ data, onChange }: { data: CatalogData; onChange: () => Promise<void> }) {
  const toRows = (cs: Collection[]): Row[] =>
    [...cs].sort((a, b) => a.order - b.order).map((c) => ({ id: c.id, name: c.name, description: c.description ?? '', visible: c.visible }));
  const [rows, setRows] = useState<Row[]>(() => toRows(data.collections));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const count = (id?: string) => (id ? data.tiles.filter((t) => t.collectionId === id && t.active).length : 0);
  const patch = (i: number, p: Partial<Row>) => setRows((r) => r.map((x, k) => (k === i ? { ...x, ...p } : x)));
  const move = (i: number, d: -1 | 1) =>
    setRows((r) => {
      const j = i + d;
      if (j < 0 || j >= r.length) return r;
      const n = [...r];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  async function save() {
    setBusy(true);
    setMsg('');
    try {
      await api('/api/dealer/collections', { method: 'PUT', json: { collections: rows } });
      await onChange();
      setMsg('저장했습니다.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '저장하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="max-w-3xl">
      <p className="text-sm text-ink-soft">
        소비자 화면과 iPad 시연에 보여 줄 컬렉션을 고르고 순서를 정합니다. 숨긴 컬렉션의 타일은 노출되지 않습니다.
      </p>
      <ul className="mt-4 space-y-2">
        {rows.map((r, i) => (
          <li key={r.id ?? `new-${i}`} className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-paper-raised p-3">
            <div className="flex flex-col">
              <button aria-label="위로" className="px-1 text-ink-soft hover:text-ink disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)}>▲</button>
              <button aria-label="아래로" className="px-1 text-ink-soft hover:text-ink disabled:opacity-30" disabled={i === rows.length - 1} onClick={() => move(i, 1)}>▼</button>
            </div>
            <div className="min-w-[200px] flex-1 space-y-1.5">
              <input className={input} value={r.name} onChange={(e) => patch(i, { name: e.target.value })} placeholder="컬렉션 이름" maxLength={60} />
              <input className={input} value={r.description} onChange={(e) => patch(i, { description: e.target.value })} placeholder="설명 (선택)" maxLength={200} />
            </div>
            <span className="text-[12px] text-ink-faint">{count(r.id)}종</span>
            <label className="flex items-center gap-1.5 text-[13px]">
              <input type="checkbox" checked={r.visible} onChange={(e) => patch(i, { visible: e.target.checked })} />
              노출
            </label>
            <button
              className="text-[13px] text-clay-deep underline"
              onClick={() => {
                if (window.confirm('이 컬렉션을 삭제할까요? 속한 타일은 미분류가 됩니다.')) setRows((x) => x.filter((_, k) => k !== i));
              }}
            >
              삭제
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center gap-2">
        <button className={btn} onClick={() => setRows((r) => [...r, { name: '', description: '', visible: true }])}>+ 컬렉션 추가</button>
        <button className={btnPrimary} onClick={save} disabled={busy}>{busy ? '저장 중…' : '저장'}</button>
        {msg && <span className="text-[13px] text-ink-soft">{msg}</span>}
      </div>
    </section>
  );
}
