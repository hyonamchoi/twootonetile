import type { Metadata } from 'next';
import Visualizer from '@/components/tile/Visualizer';

export const metadata: Metadata = {
  title: 'AI 시뮬레이터 — STUDIO TWOTONE',
  description: '내 욕실·주방 사진에 타일을 미리 깔아 보세요.',
};

export default async function VisualizerPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { collection } = await searchParams;
  return <Visualizer initialCollection={typeof collection === 'string' ? collection : undefined} />;
}
