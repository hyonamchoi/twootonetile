'use client';

import { useState } from 'react';
import { LEAD_TYPE_LABEL, SURFACES, type LeadType } from '@/lib/tiles';

export type LeadFields = {
  name: string;
  phone: string;
  region: string;
  preferredDate: string;
  memo: string;
  staff: string;
};

export type LeadSummaryItem = { surface: string; name: string; sizeLabel: string };

type Props = {
  type: LeadType;
  items: LeadSummaryItem[];
  kiosk: boolean;
  defaultStaff: string;
  storeName: string;
  /** 성공하면 null, 실패하면 오류 메시지 */
  onSubmit: (fields: LeadFields) => Promise<string | null>;
  onClose: () => void;
};

const COPY: Record<LeadType, { title: string; desc: string; cta: string }> = {
  sample: {
    title: '샘플 주문',
    desc: '선택한 타일의 실물 샘플을 보내 드립니다. 받으실 분의 정보를 남겨 주세요.',
    cta: '샘플 신청하기',
  },
  appointment: {
    title: '상담 예약',
    desc: '매장 방문 또는 전화 상담 일정을 잡아 드립니다.',
    cta: '상담 예약하기',
  },
  quote: {
    title: '견적 요청',
    desc: '선택한 타일로 시공했을 때의 견적을 안내해 드립니다.',
    cta: '견적 요청하기',
  },
  showroom: { title: '문의 남기기', desc: '담당자가 연락드립니다.', cta: '문의 남기기' },
};

function today(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function LeadDialog({ type, items, kiosk, defaultStaff, storeName, onSubmit, onClose }: Props) {
  const copy = COPY[type];
  const [fields, setFields] = useState<LeadFields>({
    name: '',
    phone: '',
    region: '',
    preferredDate: '',
    memo: '',
    staff: defaultStaff,
  });
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const set = (k: keyof LeadFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFields((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) return setError('개인정보 수집·이용에 동의해 주세요.');
    setBusy(true);
    setError(null);
    const err = await onSubmit(fields);
    setBusy(false);
    if (err) setError(err);
    else setDone(true);
  };

  const input = `w-full rounded-xl border border-line bg-paper px-4 text-ink placeholder-ink-faint focus:border-clay focus:outline-none ${
    kiosk ? 'py-3.5 text-base' : 'py-2.5 text-sm'
  }`;
  const label = 'mb-1.5 block text-xs font-bold text-ink-soft';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={copy.title}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-paper-raised p-6 shadow-deep animate-fade-in sm:rounded-3xl md:p-8">
        {done ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-clay-soft text-2xl text-clay">✓</span>
            <h3 className="font-display text-2xl font-bold text-ink">접수되었습니다</h3>
            <p className="text-sm leading-relaxed text-ink-soft">
              {storeName} 담당자가 남기신 연락처로 안내드립니다.
            </p>
            <button
              onClick={onClose}
              className="mt-2 cursor-pointer rounded-full bg-ink px-8 py-3 text-sm font-semibold text-paper hover:bg-clay"
            >
              확인
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-2xl font-bold text-ink">{copy.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{copy.desc}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="닫기"
                className="cursor-pointer rounded-full p-2 text-ink-faint hover:text-ink"
              >
                ✕
              </button>
            </div>

            {items.length > 0 && (
              <ul className="rounded-xl border border-line bg-paper p-3 text-xs text-ink-soft">
                {items.map((it) => (
                  <li key={it.surface} className="flex justify-between gap-3 py-0.5">
                    <span>{SURFACES.find((s) => s.id === it.surface)?.label}</span>
                    <span className="truncate font-semibold text-ink">
                      {it.name} · {it.sizeLabel}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="lead-name">이름 *</label>
                <input id="lead-name" required maxLength={40} value={fields.name} onChange={set('name')} className={input} autoComplete="name" />
              </div>
              <div>
                <label className={label} htmlFor="lead-phone">연락처 *</label>
                <input
                  id="lead-phone"
                  required
                  inputMode="tel"
                  placeholder="010-0000-0000"
                  maxLength={20}
                  value={fields.phone}
                  onChange={set('phone')}
                  className={input}
                  autoComplete="tel"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="lead-region">{type === 'sample' ? '배송 주소(시·구)' : '지역'}</label>
                <input id="lead-region" maxLength={60} value={fields.region} onChange={set('region')} className={input} placeholder="예: 서울 강남구" />
              </div>
              {type === 'appointment' && (
                <div>
                  <label className={label} htmlFor="lead-date">희망일 *</label>
                  <input id="lead-date" type="date" required min={today()} value={fields.preferredDate} onChange={set('preferredDate')} className={input} />
                </div>
              )}
            </div>
            <div>
              <label className={label} htmlFor="lead-memo">요청 사항</label>
              <textarea id="lead-memo" rows={3} maxLength={500} value={fields.memo} onChange={set('memo')} className={input} placeholder="공사 예정 시기, 공간 크기 등 자유롭게 적어 주세요." />
            </div>
            {kiosk && (
              <div>
                <label className={label} htmlFor="lead-staff">응대 담당자</label>
                <input id="lead-staff" maxLength={30} value={fields.staff} onChange={set('staff')} className={input} />
              </div>
            )}

            <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-ink-soft">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#b0562f]" />
              <span>
                <b className="text-ink">[필수]</b> 개인정보 수집·이용에 동의합니다.
                <span className="mt-1 block text-ink-faint">
                  수집 항목: 이름, 연락처, 지역, 요청 사항 · 이용 목적: {copy.title} 처리 및 상담 안내 · 보유 기간: 목적 달성 시까지 (요청 시 즉시 파기)
                </span>
              </span>
            </label>

            {error && (
              <p role="alert" className="rounded-xl border border-clay/30 bg-clay-soft p-3 text-xs text-clay-deep">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className={`cursor-pointer rounded-2xl bg-ink py-4 text-base font-bold text-paper shadow-lift transition-colors hover:bg-clay disabled:cursor-not-allowed disabled:bg-sand disabled:text-ink-faint`}
            >
              {busy ? '접수 중…' : copy.cta}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export { LEAD_TYPE_LABEL };
