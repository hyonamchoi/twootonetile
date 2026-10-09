import dns from 'node:dns/promises';
import net from 'node:net';

/**
 * 딜러가 입력한 피드/이미지 URL을 서버에서 가져올 때의 SSRF 방어.
 * https만 허용하고, 사설·루프백·링크로컬 주소로 해석되는 호스트는 거부한다.
 * (DNS 리바인딩까지 완벽히 막지는 못하므로 운영에서는 외부 egress 제한을 함께 쓰는 것이 좋다.)
 */

function isPrivateV4(ip: string): boolean {
  const [a, b] = ip.split('.').map(Number);
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) return isPrivateV4(ip);
  const v6 = ip.toLowerCase();
  if (v6 === '::1' || v6 === '::') return true;
  if (v6.startsWith('::ffff:')) return isPrivateV4(v6.slice(7));
  return v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe8') || v6.startsWith('fe9') || v6.startsWith('fea') || v6.startsWith('feb');
}

export async function assertPublicHttpsUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('URL 형식이 올바르지 않습니다.');
  }
  if (url.protocol !== 'https:') throw new Error('https:// 주소만 사용할 수 있습니다.');
  if (url.username || url.password) throw new Error('인증 정보가 포함된 URL은 사용할 수 없습니다.');

  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error('내부망 주소는 사용할 수 없습니다.');
    return url;
  }
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new Error('내부망 주소는 사용할 수 없습니다.');
  }
  const addrs = await dns.lookup(host, { all: true });
  if (addrs.length === 0 || addrs.some((a) => isPrivateIp(a.address))) {
    throw new Error('내부망 주소로 해석되는 호스트는 사용할 수 없습니다.');
  }
  return url;
}

export async function safeFetch(
  raw: string,
  opts: { maxBytes: number; timeoutMs?: number }
): Promise<{ buf: Buffer; contentType: string }> {
  let current = raw;
  for (let hop = 0; hop < 4; hop++) {
    const url = await assertPublicHttpsUrl(current);
    const res = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(opts.timeoutMs ?? 15000),
      headers: { 'user-agent': 'TWOTONE-CatalogSync/1.0' },
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) throw new Error('리다이렉트 위치가 없습니다.');
      current = new URL(loc, url).toString();
      continue;
    }
    if (!res.ok) throw new Error(`원격 서버 응답 오류 (${res.status})`);

    const declared = Number(res.headers.get('content-length') ?? 0);
    if (declared > opts.maxBytes) throw new Error('파일이 너무 큽니다.');

    const reader = res.body?.getReader();
    if (!reader) throw new Error('응답 본문이 비어 있습니다.');
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > opts.maxBytes) {
        await reader.cancel();
        throw new Error('파일이 너무 큽니다.');
      }
      chunks.push(value);
    }
    return {
      buf: Buffer.concat(chunks),
      contentType: (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase(),
    };
  }
  throw new Error('리다이렉트가 너무 많습니다.');
}
