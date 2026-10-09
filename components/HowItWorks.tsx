import Reveal from './Reveal';

const STEPS = [
  {
    no: '01',
    title: '공간 사진 업로드',
    desc: '바꾸고 싶은 욕실·주방·현관 사진을 올리거나 데모룸을 고르세요. 브라우저에서 자동으로 최적화됩니다.',
  },
  {
    no: '02',
    title: '타일과 시공 옵션 선택',
    desc: '바닥·벽·백스플래시·샤워 공간·상판별로 타일을 고르고, 크기·방향·줄눈 색을 바꿔 보세요. 마음에 드는 타일은 즐겨찾기에 담습니다.',
  },
  {
    no: '03',
    title: '결과 확인 후 상담',
    desc: '적용 결과를 비교하고 링크로 공유하세요. 마음에 들면 샘플을 주문하거나 상담을 예약할 수 있습니다.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="w-full border-t border-line">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-clay">How it works</p>
          <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-ink md:text-4xl">
            세 단계면 충분합니다
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <Reveal key={step.no} delay={i * 100}>
              <div className="flex h-full flex-col rounded-2xl border border-line bg-paper-raised p-7">
                <span className="font-display text-sm font-bold text-clay">{step.no}</span>
                <h3 className="font-display mt-5 text-xl font-bold text-ink">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">{step.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
