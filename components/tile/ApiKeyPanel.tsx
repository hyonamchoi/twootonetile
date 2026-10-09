'use client';

import { FREE_GENERATIONS } from '@/lib/constants';

type Props = {
  byokMode: boolean;
  onToggle: () => void;
  byokKey: string;
  onKey: (v: string) => void;
  freeCount: number;
};

/** 무료 체험 횟수 · 개인 API 키(BYOK) 설정 */
export default function ApiKeyPanel({ byokMode, onToggle, byokKey, onKey, freeCount }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-ink-soft">
        {byokMode ? '내 API 키로 무제한 사용 중' : `무료 체험 ${FREE_GENERATIONS}회 중 ${freeCount}회 남음`}
      </p>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-ink">내 API 키로 무제한 사용</p>
          <p className="mt-0.5 text-xs text-ink-soft">무료 Gemini API 키를 등록하면 횟수 제한이 없습니다.</p>
        </div>
        <button
          onClick={onToggle}
          role="switch"
          aria-checked={byokMode}
          aria-label="내 API 키로 무제한 사용"
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-clay ${
            byokMode ? 'bg-clay' : 'bg-line-strong'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-paper-raised shadow transition ${
              byokMode ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
      {byokMode && (
        <div className="flex flex-col gap-2 border-t border-line pt-3">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="byok-key" className="font-semibold text-ink-soft">개인 Gemini API Key</label>
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="font-bold text-clay underline underline-offset-2">
              무료 발급
            </a>
          </div>
          <input
            id="byok-key"
            type="password"
            value={byokKey}
            onChange={(e) => onKey(e.target.value)}
            placeholder="AI Studio에서 복사한 API Key"
            className="w-full rounded-xl border border-line bg-paper-raised px-3 py-2.5 text-sm text-ink placeholder-ink-faint focus:border-clay focus:outline-none"
          />
          <p className="text-[10px] leading-relaxed text-ink-faint">
            ※ 키는 이 브라우저의 로컬 스토리지에만 보관되며 서버에 저장되지 않습니다.
          </p>
        </div>
      )}
    </div>
  );
}
