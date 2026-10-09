import Link from 'next/link';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" aria-label="STUDIO TWOTONE 홈" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="STUDIO TWOTONE" className="h-[18px] w-auto md:h-5" />
        </Link>

        <nav className="flex items-center gap-6 text-sm font-medium text-ink-soft">
          <a href="#collections" className="hidden transition-colors hover:text-ink sm:block">
            컬렉션
          </a>
          <a href="#how-it-works" className="hidden transition-colors hover:text-ink sm:block">
            사용 방법
          </a>
          <a href="#for-dealers" className="hidden transition-colors hover:text-ink sm:block">
            딜러·시공업체
          </a>
          <Link
            href="/visualizer"
            className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-paper transition-all duration-200 hover:bg-clay"
          >
            시뮬레이터 시작
          </Link>
        </nav>
      </div>
    </header>
  );
}
