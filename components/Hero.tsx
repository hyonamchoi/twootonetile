/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { tileImageSrc } from './tile/TileThumb';
import { materialOf, type Tile } from '@/lib/tiles';
import Reveal from './Reveal';
import CompareSlider from './CompareSlider';

const STATS = [
  { value: '5가지', label: '적용면 · 바닥/벽/백스플래시/샤워/상판' },
  { value: '2종', label: '소재 · 타일 / 엔지니어드 스톤' },
  { value: '10회', label: '무료 체험' },
];

export default function Hero({ tiles }: { tiles: Tile[] }) {
  // 타일 5종 + 엔지니어드 스톤 3종을 섞어 보여 준다
  const withImage = tiles.filter((t) => tileImageSrc(t));
  const sample = [
    ...withImage.filter((t) => materialOf(t) === 'tile').slice(0, 5),
    ...withImage.filter((t) => materialOf(t) === 'stone').slice(0, 3),
  ];

  return (
    <section id="top" className="relative w-full overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[840px] -translate-x-1/2 rounded-full bg-clay-soft opacity-60 blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-14 md:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14">
          <Reveal className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <p className="mb-6 flex items-center gap-2 rounded-full border border-line bg-paper-raised px-4 py-1.5 text-xs font-medium tracking-wide text-ink-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-clay" />
              AI 타일 · 엔지니어드 스톤 시뮬레이터
            </p>

            <h1 className="font-display max-w-3xl text-4xl font-light leading-[1.3] tracking-tight text-ink md:text-5xl md:leading-[1.25]">
              시공하기 전에,
              <br />
              우리 집에 <em className="not-italic font-bold text-ink">타일</em>과 <em className="not-italic font-bold text-ink">스톤</em>을
              <br className="hidden md:block" /> 먼저 깔아 보다
            </h1>

            <p className="mt-7 max-w-xl text-base leading-relaxed text-ink-soft md:text-lg">
              욕실·주방 사진을 올리고 마음에 드는 타일이나 엔지니어드 스톤을 고르세요. 바닥, 벽,
              백스플래시, 샤워 공간, 주방·욕실 상판에 크기와 줄눈 색까지 바꿔 가며 미리 확인할 수 있습니다.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
              <Link
                href="/visualizer"
                className="rounded-full bg-ink px-8 py-4 text-sm font-semibold text-paper shadow-lift transition-all duration-300 hover:-translate-y-0.5 hover:bg-clay"
              >
                무료로 시뮬레이션 해보기
              </Link>
              <a
                href="#collections"
                className="rounded-full border border-line-strong bg-paper-raised px-8 py-4 text-sm font-semibold text-ink transition-all duration-300 hover:border-ink"
              >
                컬렉션 둘러보기
              </a>
            </div>

            <dl className="mt-12 flex items-center divide-x divide-line">
              {STATS.map((stat) => (
                <div key={stat.label} className="px-5 first:pl-0 sm:px-8">
                  <dd className="font-display text-xl font-bold text-ink md:text-2xl">{stat.value}</dd>
                  <dt className="mt-1 max-w-[9rem] text-[11px] leading-snug tracking-wide text-ink-faint">{stat.label}</dt>
                </div>
              ))}
            </dl>
          </Reveal>

          <Reveal delay={100} className="w-full">
            <CompareSlider
              beforeSrc="/living_room_before.png"
              afterSrc="/living_room_after.png"
              beforeAlt="시공 전 공간"
              afterAlt="AI로 새로 디자인한 공간"
              beforeLabel="시공 전"
              afterLabel="시공 후"
              aspectRatio="1 / 1"
              sizes="(max-width: 1024px) 100vw, 560px"
              priority
              autoSweep
            />
            <p className="mt-4 text-center text-xs text-ink-faint lg:text-left">
              좌우로 드래그해서 시공 전·후를 비교해 보세요.
            </p>
          </Reveal>
        </div>

        {sample.length > 0 && (
          <Reveal delay={150} className="mx-auto mt-20 w-full max-w-4xl">
            <ul className="grid grid-cols-4 gap-3 md:gap-4" aria-label="타일 샘플">
              {sample.map((t, i) => (
                <li
                  key={t.id}
                  className={`overflow-hidden rounded-2xl border border-line bg-paper-raised shadow-lift ${i % 3 === 1 ? 'md:translate-y-4' : ''}`}
                >
                  <img src={tileImageSrc(t, 320) ?? ''} alt={t.name} className="aspect-square w-full object-cover" />
                  <p className="truncate px-3 py-2 text-left text-[11px] font-semibold text-ink-soft">{t.name}</p>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-center text-xs text-ink-faint">
              데모용 샘플 이미지입니다. 타일 업체와 계약하면 실제 제품 이미지로 교체됩니다.
            </p>
          </Reveal>
        )}
      </div>
    </section>
  );
}
