import { readTileImage } from '@/lib/server/catalogIO';

export const runtime = 'nodejs';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const img = await readTileImage(id);
  if (!img) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(img.buf), {
    headers: {
      'Content-Type': img.mime,
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
