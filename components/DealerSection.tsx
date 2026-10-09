import Link from 'next/link';
import Reveal from './Reveal';

const FEATURES = [
  {
    title: '카탈로그 자동 동기화',
    desc: 'CSV·JSON 업로드 또는 피드 URL 연동으로 품번 기준 자동 등록·갱신. 제품 이미지도 함께 가져옵니다.',
  },
  {
    title: '노출 컬렉션 선택',
    desc: '취급하는 컬렉션만 골라 고객 화면에 노출하고, 순서와 설명을 직접 편집합니다.',
  },
  {
    title: 'iPad 매장 시연',
    desc: '큰 버튼의 시연 모드. 고객이 가져온 사진으로 현장에서 보여 주고, 일정 시간 뒤 자동 초기화됩니다.',
  },
  {
    title: '리드·CRM',
    desc: '샘플 주문·상담 예약·견적 요청을 한곳에 모아 상태를 관리하고, 고객이 본 타일과 결과 이미지를 함께 확인합니다.',
  },
];

export default function DealerSection() {
  return (
    <section id="for-dealers" className="w-full border-t border-line bg-ink text-paper">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-clay-soft">For dealers</p>
          <h2 className="font-display mt-3 max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">
            타일 도소매·시공업체를 위한 상담 도구
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-paper/70 md:text-base">
            고객이 결과를 보고 결정하면 상담이 짧아집니다. 매장과 온라인에서 같은 AI 시뮬레이터로 고객을 맞이하세요.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 80}>
              <div className="h-full rounded-2xl border border-paper/15 bg-paper/5 p-6">
                <h3 className="font-display text-lg font-bold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-paper/70">{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={200} className="mt-10 flex flex-wrap gap-3">
          <Link href="/dealer" className="rounded-full bg-paper px-8 py-3.5 text-sm font-semibold text-ink transition-colors hover:bg-clay-soft">
            딜러 콘솔 열기
          </Link>
          <Link href="/showroom" className="rounded-full border border-paper/30 px-8 py-3.5 text-sm font-semibold text-paper transition-colors hover:border-paper">
            iPad 매장 시연 모드
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
