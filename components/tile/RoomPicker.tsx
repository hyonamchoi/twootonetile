/* eslint-disable @next/next/no-img-element */
'use client';

import { useRef, useState } from 'react';
import { DEMO_ROOMS, type DemoRoom } from '@/lib/demoRooms';
import { ROOM_KINDS } from '@/lib/tiles';

type Props = {
  kind: string;
  onKind: (id: string) => void;
  onFile: (file: File) => void;
  onDemo: (room: DemoRoom) => void;
  loading: boolean;
  error: string | null;
  kiosk: boolean;
};

/** 방 사진 업로드 또는 데모룸 선택 (시작 화면) */
export default function RoomPicker({ kind, onKind, onFile, onDemo, loading, error, kiosk }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onFile(f);
    e.target.value = '';
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 animate-fade-in">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-clay">Step 1</p>
        <h2 className={`font-display mt-2 font-bold tracking-tight text-ink ${kiosk ? 'text-4xl' : 'text-2xl md:text-3xl'}`}>
          바꾸고 싶은 공간을 보여 주세요
        </h2>
        <p className="mt-2 text-sm text-ink-soft">욕실·주방·현관 사진을 올리거나 데모룸으로 먼저 체험해 보세요.</p>
      </div>

      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="공간 종류">
        {ROOM_KINDS.map((r) => (
          <button
            key={r.id}
            onClick={() => onKind(r.id)}
            aria-pressed={kind === r.id}
            className={`cursor-pointer rounded-full border font-semibold transition-colors ${kiosk ? 'px-6 py-3 text-base' : 'px-4 py-2 text-sm'} ${
              kind === r.id ? 'border-ink bg-ink text-paper' : 'border-line bg-paper-raised text-ink-soft hover:border-line-strong'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), inputRef.current?.click())}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onFile(f);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
          drag ? 'scale-[0.99] border-clay bg-clay-soft' : 'border-line-strong bg-paper-raised hover:border-ink-faint'
        }`}
      >
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={pick} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={pick} />
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-ink-faint">
          <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="9" cy="9" r="1.8" fill="currentColor" />
          <path d="M4 17l5-5 4 4 3-3 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
        <p className="text-sm font-semibold text-ink">
          {loading ? '사진을 처리하는 중…' : '사진을 끌어다 놓거나 눌러서 업로드'}
        </p>
        <p className="text-xs text-ink-faint">JPG · PNG · WebP, 최대 10MB · 업로드 시 1024px로 자동 최적화</p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            cameraRef.current?.click();
          }}
          className="mt-1 cursor-pointer rounded-full border border-line-strong px-5 py-2 text-xs font-semibold text-ink hover:border-ink"
        >
          카메라로 촬영
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-clay/30 bg-clay-soft p-3 text-center text-xs text-clay-deep">
          {error}
        </p>
      )}

      <div>
        <p className="mb-3 text-center text-xs font-semibold text-ink-faint">또는 데모룸 선택</p>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {DEMO_ROOMS.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => onDemo(r)}
                disabled={loading}
                className="group block w-full cursor-pointer overflow-hidden rounded-xl border border-line bg-paper-raised text-left transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift disabled:opacity-50"
              >
                <img src={r.src} alt="" className="aspect-[4/3] w-full object-cover" draggable={false} />
                <span className={`block px-3 py-2 font-semibold text-ink ${kiosk ? 'text-base' : 'text-sm'}`}>{r.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
