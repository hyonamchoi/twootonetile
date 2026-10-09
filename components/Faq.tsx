import Reveal from './Reveal';

const FAQS = [
  {
    q: '결과가 실제 시공 모습과 똑같나요?',
    a: 'AI가 사진 위에 타일을 합성한 미리보기입니다. 색감·패턴·분위기를 비교하는 용도이며, 실제 타일 수량·줄눈 위치·재단은 시공 전 실측과 상담으로 확정됩니다. 최종 결정 전에 실물 샘플로 확인하는 것을 권장합니다.',
  },
  {
    q: '무료로 몇 번까지 써볼 수 있나요?',
    a: '누구나 5회까지 무료로 체험할 수 있습니다. 이후에는 시뮬레이터 메뉴에서 "내 API 키로 무제한 사용"을 켜고 Google AI Studio에서 발급받은 개인 API 키를 등록하면 제한 없이 이용할 수 있습니다.',
  },
  {
    q: '줄눈 색이나 타일 크기를 바꾸면 바로 반영되나요?',
    a: '옵션을 바꾼 뒤 "AI로 적용하기"를 누르면 새 결과가 만들어집니다. 이전 결과는 목록에 남아 있어 "비교" 기능으로 나란히 볼 수 있습니다.',
  },
  {
    q: '업로드한 사진은 어디에 저장되나요?',
    a: '시뮬레이션 요청 처리에는 서버에 저장되지 않습니다. 결과를 공유하거나 샘플·상담을 신청하면 해당 결과 이미지만 저장되어 담당 매장이 확인할 수 있습니다.',
  },
];

export default function Faq() {
  return (
    <section className="w-full border-t border-line bg-paper-raised">
      <div className="mx-auto max-w-3xl px-6 py-24">
        <Reveal>
          <p className="text-center text-xs font-semibold uppercase tracking-[0.24em] text-clay">FAQ</p>
          <h2 className="font-display mt-3 text-center text-3xl font-bold tracking-tight text-ink md:text-4xl">
            자주 묻는 질문
          </h2>
        </Reveal>

        <Reveal delay={100} className="mt-12 flex flex-col gap-3">
          {FAQS.map((faq) => (
            <details
              key={faq.q}
              className="group rounded-2xl border border-line bg-paper px-6 py-5 transition-colors open:border-line-strong"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
                {faq.q}
                <span className="text-lg font-light text-ink-faint transition-transform duration-300 group-open:rotate-45">+</span>
              </summary>
              <p className="mt-4 text-sm leading-relaxed text-ink-soft">{faq.a}</p>
            </details>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
