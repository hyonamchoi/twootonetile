export async function api<T = unknown>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(url, {
    ...rest,
    headers: json !== undefined ? { 'Content-Type': 'application/json', ...rest.headers } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `요청 실패 (${res.status})`);
  return data as T;
}

export const btn =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-line-strong bg-paper-raised px-3 py-1.5 text-[13px] font-medium text-ink transition hover:bg-sand disabled:opacity-50';
export const btnPrimary =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-ink px-3.5 py-1.5 text-[13px] font-medium text-paper transition hover:bg-clay-deep disabled:opacity-50';
export const input =
  'w-full rounded-lg border border-line-strong bg-paper-raised px-3 py-2 text-[13px] text-ink outline-none focus:border-clay';
