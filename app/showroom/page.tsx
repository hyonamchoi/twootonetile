import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Visualizer from '@/components/tile/Visualizer';
import { isDealer } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '매장 시연 — STUDIO TWOTONE',
  robots: { index: false },
};

/** iPad 매장 시연 모드. 매장 직원이 딜러 로그인을 한 기기에서만 열린다. */
export default async function ShowroomPage() {
  if (!(await isDealer())) redirect('/dealer?next=/showroom');
  return <Visualizer kiosk />;
}
