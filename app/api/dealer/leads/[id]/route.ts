import { NextRequest, NextResponse } from 'next/server';
import { mutateDb } from '@/lib/server/db';
import { fail, readJson, requireDealer } from '@/lib/server/http';
import { LEAD_STATUSES, type LeadStatus } from '@/lib/tiles';

export const runtime = 'nodejs';

type Patch = { status?: string; note?: string };

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireDealer();
  if (denied) return denied;
  const { id } = await ctx.params;
  const p = await readJson<Patch>(req);
  if (!p) return fail('요청 형식이 올바르지 않습니다.');

  const status = LEAD_STATUSES.find((s) => s === p.status) as LeadStatus | undefined;
  if (p.status !== undefined && !status) return fail('상태 값이 올바르지 않습니다.');
  const note = typeof p.note === 'string' ? p.note.trim().slice(0, 500) : '';

  const lead = await mutateDb((db) => {
    const l = db.leads.find((x) => x.id === id);
    if (!l) return null;
    const now = new Date().toISOString();
    if (status) l.status = status;
    if (note) l.notes.push({ at: now, text: note });
    l.updatedAt = now;
    return structuredClone(l);
  });
  return lead ? NextResponse.json({ lead }) : fail('리드를 찾을 수 없습니다.', 404);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireDealer();
  if (denied) return denied;
  const { id } = await ctx.params;
  const removed = await mutateDb((db) => {
    const before = db.leads.length;
    db.leads = db.leads.filter((l) => l.id !== id);
    return db.leads.length < before;
  });
  return removed ? NextResponse.json({ ok: true }) : fail('리드를 찾을 수 없습니다.', 404);
}
