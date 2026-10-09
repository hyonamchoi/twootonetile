import { promises as fs } from 'node:fs';
import path from 'node:path';
import { DESIGN_DIR, readDb } from '@/lib/server/db';

export const runtime = 'nodejs';

const MIME: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[a-f0-9]{16}$/.test(id)) return new Response('Not found', { status: 404 });
  const meta = (await readDb()).designs.find((d) => d.id === id);
  if (!meta) return new Response('Not found', { status: 404 });
  try {
    const buf = await fs.readFile(path.join(DESIGN_DIR, meta.file));
    return new Response(new Uint8Array(buf), {
      headers: {
        'Content-Type': MIME[meta.file.split('.').pop() ?? ''] ?? 'application/octet-stream',
        'Cache-Control': 'public, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
