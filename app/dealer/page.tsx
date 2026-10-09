import type { Metadata } from 'next';
import DealerConsole from '@/components/dealer/DealerConsole';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '딜러 콘솔 — STUDIO TWOTONE',
  robots: { index: false },
};

export default async function DealerPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  // 오픈 리다이렉트 방지: 같은 사이트의 경로만 허용
  const safeNext = next && /^\/[A-Za-z0-9/_-]*$/.test(next) ? next : undefined;
  return <DealerConsole next={safeNext} />;
}
