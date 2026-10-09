'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { Collection, DealerSettings, Lead, Tile } from '@/lib/tiles';
import { api, btn, btnPrimary, input } from './api';
import CatalogTab from './CatalogTab';
import CollectionsTab from './CollectionsTab';
import LeadsTab from './LeadsTab';
import SettingsTab from './SettingsTab';

export type CatalogData = { tiles: Tile[]; collections: Collection[]; settings: DealerSettings };

type Tab = 'leads' | 'catalog' | 'collections' | 'settings';
const TABS: { id: Tab; label: string }[] = [
  { id: 'leads', label: '고객 관리(CRM)' },
  { id: 'catalog', label: '카탈로그' },
  { id: 'collections', label: '노출 컬렉션' },
  { id: 'settings', label: '설정·시연' },
];

type AuthState = { authenticated: boolean; configured: boolean; openInDev: boolean } | null;

export default function DealerConsole({ next }: { next?: string }) {
  const [auth, setAuth] = useState<AuthState>(null);
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>('leads');
  const [data, setData] = useState<CatalogData | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadErr, setLoadErr] = useState('');

  const reload = useCallback(async () => {
    try {
      const [c, l] = await Promise.all([
        api<CatalogData>('/api/dealer/catalog'),
        api<{ leads: Lead[] }>('/api/dealer/leads'),
      ]);
      setData(c);
      setLeads(l.leads);
      setLoadErr('');
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : '불러오지 못했습니다.');
    }
  }, []);

  useEffect(() => {
    api<NonNullable<AuthState>>('/api/dealer/login')
      .then((a) => {
        setAuth(a);
        if (a.authenticated) void reload();
      })
      .catch(() => setAuth({ authenticated: false, configured: false, openInDev: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await api('/api/dealer/login', { method: 'POST', json: { password: pw } });
      if (next) {
        window.location.href = next;
        return;
      }
      setAuth({ authenticated: true, configured: true, openInDev: false });
      void reload();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : '로그인하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await api('/api/dealer/login', { method: 'DELETE' }).catch(() => {});
    setAuth((a) => (a ? { ...a, authenticated: false } : a));
    setData(null);
  }

  if (!auth) return <div className="p-10 text-sm text-ink-soft">불러오는 중…</div>;

  if (!auth.authenticated) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5">
        <Link href="/" className="mb-6 text-sm text-ink-soft hover:text-ink">← STUDIO TWOTONE</Link>
        <h1 className="text-2xl font-semibold text-ink">딜러 콘솔</h1>
        <p className="mt-1 text-sm text-ink-soft">매장 직원·딜러 전용입니다. 카탈로그, 고객 문의, iPad 시연을 관리합니다.</p>
        {!auth.configured ? (
          <p className="mt-6 rounded-lg bg-clay-soft p-3 text-[13px] text-clay-deep">
            서버에 <code>DEALER_PASSWORD</code> 환경변수가 설정되어 있지 않습니다. <code>.env.local</code>에 설정한 뒤 서버를 다시 시작해 주세요.
          </p>
        ) : (
          <form onSubmit={login} className="mt-6 space-y-3">
            <input
              type="password"
              autoFocus
              className={input}
              placeholder="딜러 비밀번호"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
            />
            {err && <p className="text-[13px] text-clay-deep">{err}</p>}
            <button className={`${btnPrimary} w-full`} disabled={busy || !pw}>
              {busy ? '확인 중…' : '로그인'}
            </button>
          </form>
        )}
      </main>
    );
  }

  const newLeads = leads.filter((l) => l.status === 'new').length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/" className="text-[13px] text-ink-soft hover:text-ink">← STUDIO TWOTONE</Link>
          <h1 className="text-xl font-semibold text-ink">
            {data?.settings.storeName ?? '딜러'} 콘솔
          </h1>
        </div>
        <div className="flex gap-2">
          <Link href="/showroom" className={btnPrimary}>iPad 시연 모드 열기</Link>
          <Link href="/visualizer" className={btn}>소비자 화면 보기</Link>
          {!auth.openInDev && <button className={btn} onClick={logout}>로그아웃</button>}
        </div>
      </header>

      <nav className="mt-5 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap border-b-2 px-3.5 py-2 text-sm font-medium transition ${
              tab === t.id ? 'border-clay text-ink' : 'border-transparent text-ink-soft hover:text-ink'
            }`}
          >
            {t.label}
            {t.id === 'leads' && newLeads > 0 && (
              <span className="ml-1.5 rounded-full bg-clay px-1.5 py-0.5 text-[11px] text-paper">{newLeads}</span>
            )}
          </button>
        ))}
      </nav>

      {loadErr && <p className="mt-4 text-sm text-clay-deep">{loadErr}</p>}

      <div className="mt-5">
        {tab === 'leads' && <LeadsTab leads={leads} onChange={reload} />}
        {tab === 'catalog' && data && <CatalogTab data={data} onChange={reload} />}
        {tab === 'collections' && data && <CollectionsTab data={data} onChange={reload} />}
        {tab === 'settings' && data && <SettingsTab data={data} onChange={reload} />}
        {!data && tab !== 'leads' && !loadErr && <p className="text-sm text-ink-soft">불러오는 중…</p>}
      </div>
    </main>
  );
}
