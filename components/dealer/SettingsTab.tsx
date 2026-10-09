'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api, btnPrimary, input } from './api';
import type { CatalogData } from './DealerConsole';

export default function SettingsTab({ data, onChange }: { data: CatalogData; onChange: () => Promise<void> }) {
  const s = data.settings;
  const [storeName, setStoreName] = useState(s.storeName);
  const [phone, setPhone] = useState(s.contactPhone ?? '');
  const [showPrice, setShowPrice] = useState(s.showPrice);
  const [feedUrl, setFeedUrl] = useState(s.feed?.url ?? '');
  const [hours, setHours] = useState(String(s.feed?.autoSyncHours ?? 24));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const embed = `<iframe src="${origin}/visualizer" width="100%" height="760" style="border:0" allow="camera" loading="lazy"></iframe>`;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      await api('/api/dealer/settings', {
        method: 'PUT',
        json: { storeName, contactPhone: phone, showPrice, feedUrl, autoSyncHours: Number(hours) || 0 },
      });
      await onChange();
      setMsg('저장했습니다.');
    } catch (e2) {
      setMsg(e2 instanceof Error ? e2.message : '저장하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid max-w-4xl gap-6 lg:grid-cols-2">
      <form onSubmit={save} className="space-y-3">
        <h2 className="text-sm font-semibold text-ink">매장 정보</h2>
        <input className={input} value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="매장명" maxLength={40} />
        <input className={input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="상담 전화번호 (선택)" maxLength={20} />
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} />
          소비자 화면에 ㎡당 가격 표시
        </label>

        <h2 className="pt-3 text-sm font-semibold text-ink">카탈로그 자동 동기화</h2>
        <p className="text-[12px] text-ink-faint">
          CSV 또는 JSON 파일 주소(https)를 등록하면 정해진 주기마다 품번 기준으로 신규·수정이 반영됩니다. 이미지 URL은 서버에 저장됩니다.
        </p>
        <input className={input} value={feedUrl} onChange={(e) => setFeedUrl(e.target.value)} placeholder="https://…/catalog.csv (비우면 해제)" />
        <label className="flex items-center gap-2 text-[13px]">
          <select className="rounded border border-line-strong bg-paper-raised px-2 py-1" value={hours} onChange={(e) => setHours(e.target.value)}>
            <option value="0">수동만</option>
            <option value="1">1시간마다</option>
            <option value="6">6시간마다</option>
            <option value="24">매일</option>
            <option value="168">매주</option>
          </select>
        </label>
        {s.feed?.lastSyncAt && (
          <p className="text-[12px] text-ink-soft">
            마지막 동기화 {new Date(s.feed.lastSyncAt).toLocaleString('ko-KR')} — {s.feed.lastResult}
          </p>
        )}
        <div className="flex items-center gap-3">
          <button className={btnPrimary} disabled={busy}>{busy ? '저장 중…' : '저장'}</button>
          {msg && <span className="text-[13px] text-ink-soft">{msg}</span>}
        </div>
      </form>

      <div className="space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-ink">iPad 매장 시연</h2>
          <p className="mt-1 text-[13px] text-ink-soft">
            iPad에서 이 콘솔에 로그인한 뒤 시연 모드를 열면 고객 응대용 전체 화면으로 동작합니다. 2분 동안 조작이 없으면 자동 초기화되고, 신청 건은 &lsquo;매장&rsquo;으로 표시됩니다.
          </p>
          <Link href="/showroom" className={`${btnPrimary} mt-2`}>시연 모드 열기</Link>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-ink">내 사이트에 넣기</h2>
          <p className="mt-1 text-[12px] text-ink-faint">아래 코드를 쇼핑몰이나 홈페이지에 붙여 넣으면 소비자 화면이 그대로 표시됩니다.</p>
          <textarea readOnly rows={4} className={`${input} mt-2 font-mono text-[12px]`} value={embed} onFocus={(e) => e.target.select()} />
        </div>
      </div>
    </div>
  );
}
