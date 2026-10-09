import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 text-xs text-ink-faint md:flex-row">
        <div className="flex flex-col items-center gap-2 md:flex-row md:gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="STUDIO TWOTONE" className="h-4 w-auto" />
          <span>© 2026 STUDIO TWOTONE. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dealer" className="font-semibold text-ink-soft transition-colors hover:text-clay">
            딜러 로그인
          </Link>
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-ink-soft transition-colors hover:text-clay"
          >
            무료 API 키 발급
          </a>
        </div>
      </div>
    </footer>
  );
}
