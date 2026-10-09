'use client';

import { useMemo, useState } from 'react';
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABEL,
  LEAD_TYPE_LABEL,
  ROOM_KINDS,
  SURFACES,
  type Lead,
  type LeadStatus,
} from '@/lib/tiles';
import { api, btn, btnPrimary, input } from './api';

const STATUS_STYLE: Record<LeadStatus, string> = {
  new: 'bg-clay text-paper',
  contacted: 'bg-sand text-ink',
  sampled: 'bg-sand text-ink',
  won: 'bg-emerald-700 text-white',
  lost: 'bg-line text-ink-soft',
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function LeadsTab({ leads, onChange }: { leads: Lead[]; onChange: () => Promise<void> }) {
  const [filter, setFilter] = useState<LeadStatus | 'all'>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: leads.length };
    LEAD_STATUSES.forEach((s) => (c[s] = leads.filter((l) => l.status === s).length));
    return c;
  }, [leads]);

  const shown = leads.filter((l) => filter === 'all' || l.status === filter);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setErr('');
    try {
      await fn();
      await onChange();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '처리하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    const head = ['접수일', '유형', '상태', '이름', '연락처', '지역', '희망일', '담당', '선택 타일', '메모'];
    const rows = leads.map((l) => [
      l.createdAt,
      LEAD_TYPE_LABEL[l.type],
      LEAD_STATUS_LABEL[l.status],
      l.name,
      l.phone,
      l.region ?? '',
      l.preferredDate ?? '',
      l.staff ?? '',
      l.items.map((i) => `${i.brand} ${i.name}(${i.sku})`).join(' / '),
      l.memo ?? '',
    ]);
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = '﻿' + [head, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section>
      <div className="flex flex-wrap items-center gap-2">
        {(['all', ...LEAD_STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full border px-3 py-1 text-[13px] transition ${
              filter === s ? 'border-ink bg-ink text-paper' : 'border-line-strong bg-paper-raised text-ink-soft hover:text-ink'
            }`}
          >
            {s === 'all' ? '전체' : LEAD_STATUS_LABEL[s]} {counts[s]}
          </button>
        ))}
        <button className={`${btn} ml-auto`} onClick={exportCsv} disabled={!leads.length}>CSV 내보내기</button>
      </div>
      {err && <p className="mt-3 text-sm text-clay-deep">{err}</p>}

      {shown.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-line-strong p-10 text-center text-sm text-ink-soft">
          아직 접수된 문의가 없습니다. 소비자 화면이나 iPad 시연에서 샘플·상담·견적을 신청하면 여기에 쌓입니다.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {shown.map((l) => {
            const open = openId === l.id;
            return (
              <li key={l.id} className="rounded-xl border border-line bg-paper-raised">
                <button
                  className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-left"
                  onClick={() => setOpenId(open ? null : l.id)}
                >
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[l.status]}`}>
                    {LEAD_STATUS_LABEL[l.status]}
                  </span>
                  <span className="text-sm font-medium text-ink">{l.name}</span>
                  <span className="text-[13px] text-ink-soft">{l.phone}</span>
                  <span className="rounded bg-sand px-1.5 py-0.5 text-[11px] text-ink-soft">{LEAD_TYPE_LABEL[l.type]}</span>
                  {l.source === 'kiosk' && <span className="rounded bg-sand px-1.5 py-0.5 text-[11px] text-ink-soft">매장</span>}
                  <span className="ml-auto text-[12px] text-ink-faint">{fmt(l.createdAt)}</span>
                </button>

                {open && (
                  <div className="space-y-4 border-t border-line px-4 py-4 text-[13px]">
                    <dl className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                      {l.region && <div><dt className="inline text-ink-faint">지역 </dt><dd className="inline">{l.region}</dd></div>}
                      {l.preferredDate && <div><dt className="inline text-ink-faint">희망일 </dt><dd className="inline">{l.preferredDate}</dd></div>}
                      {l.roomKind && <div><dt className="inline text-ink-faint">공간 </dt><dd className="inline">{l.roomKind}</dd></div>}
                      {l.staff && <div><dt className="inline text-ink-faint">응대 담당 </dt><dd className="inline">{l.staff}</dd></div>}
                      {l.memo && <div className="sm:col-span-2"><dt className="inline text-ink-faint">요청사항 </dt><dd className="inline">{l.memo}</dd></div>}
                    </dl>

                    {l.items.length > 0 && (
                      <div>
                        <p className="mb-1 text-ink-faint">선택한 타일</p>
                        <ul className="space-y-1">
                          {l.items.map((i, k) => (
                            <li key={k}>
                              <span className="text-ink-soft">
                                {i.roomKind ? `${ROOM_KINDS.find((r) => r.id === i.roomKind)?.label ?? i.roomKind} · ` : ''}
                                {SURFACES.find((s) => s.id === i.surface)?.label ?? i.surface}
                              </span>{' '}
                              {i.brand} {i.name} <span className="text-ink-faint">({i.sku}, {i.sizeId})</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {l.designId && (
                      <a href={`/d/${l.designId}`} target="_blank" rel="noreferrer" className="inline-block text-clay underline">
                        고객이 만든 시공 이미지 보기
                      </a>
                    )}

                    <div>
                      <p className="mb-1 text-ink-faint">상태 변경</p>
                      <div className="flex flex-wrap gap-1.5">
                        {LEAD_STATUSES.map((s) => (
                          <button
                            key={s}
                            disabled={busy || l.status === s}
                            onClick={() => run(() => api(`/api/dealer/leads/${l.id}`, { method: 'PATCH', json: { status: s } }))}
                            className={`rounded-full border px-2.5 py-1 text-[12px] ${
                              l.status === s ? 'border-ink bg-ink text-paper' : 'border-line-strong hover:bg-sand'
                            }`}
                          >
                            {LEAD_STATUS_LABEL[s]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="mb-1 text-ink-faint">상담 메모</p>
                      {l.notes.length > 0 && (
                        <ul className="mb-2 space-y-1">
                          {l.notes.map((n, k) => (
                            <li key={k}><span className="text-ink-faint">{fmt(n.at)}</span> {n.text}</li>
                          ))}
                        </ul>
                      )}
                      <form
                        className="flex gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!note.trim()) return;
                          const text = note;
                          setNote('');
                          void run(() => api(`/api/dealer/leads/${l.id}`, { method: 'PATCH', json: { note: text } }));
                        }}
                      >
                        <input className={input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="통화 내용, 샘플 발송 등을 기록" maxLength={500} />
                        <button className={btnPrimary} disabled={busy || !note.trim()}>추가</button>
                      </form>
                    </div>

                    <div className="flex items-center justify-between text-[12px] text-ink-faint">
                      <span>개인정보 수집·이용 동의: {fmt(l.consentAt)}</span>
                      <button
                        className="text-clay-deep underline"
                        onClick={() => {
                          if (window.confirm(`${l.name} 님의 문의를 삭제할까요?`)) {
                            void run(() => api(`/api/dealer/leads/${l.id}`, { method: 'DELETE' }));
                          }
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
