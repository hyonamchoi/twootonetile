import type { TilePattern } from './tiles';

/**
 * 제품 이미지가 없는 샘플 타일을 절차적으로 그리는 SVG 생성기.
 * 시드 기반이라 같은 정의는 항상 같은 모양이 나온다.
 * (실제 제품은 딜러가 올린 이미지를 쓰고, 이 생성기는 데모·미리보기용이다.)
 */

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

/** hex 색을 amt(-1~1)만큼 밝게/어둡게 */
function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const t = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  const mix = (c: number) => clamp(c + (t - c) * p);
  return `#${[mix(r), mix(g), mix(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

function f(n: number) {
  return n.toFixed(2);
}

export function swatchSvg(p: TilePattern, size = 256): string {
  const rand = rng(p.seed);
  const [c0, c1 = shade(p.colors[0], -0.25), c2 = c1, c3 = c2] = p.colors;
  let body = '';
  let defs = '';

  switch (p.kind) {
    case 'marble': {
      defs = `<filter id="b" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="0.45"/></filter><filter id="c"><feGaussianBlur stdDeviation="7"/></filter>`;
      body += `<rect width="100" height="100" fill="${c0}"/>`;
      for (let i = 0; i < 4; i++) {
        body += `<ellipse cx="${f(rand() * 100)}" cy="${f(rand() * 100)}" rx="${f(18 + rand() * 20)}" ry="${f(10 + rand() * 16)}" fill="${c2}" opacity="${f(0.1 + rand() * 0.12)}" filter="url(#c)"/>`;
      }
      const veins = 5 + Math.floor(rand() * 3);
      for (let i = 0; i < veins; i++) {
        let x = rand() * 100;
        let y = -5;
        let d = `M${f(x)},${f(y)}`;
        const dir = rand() < 0.5 ? -1 : 1;
        for (let s = 0; s < 4; s++) {
          const nx = x + dir * (4 + rand() * 18) + (rand() - 0.5) * 14;
          const ny = y + 26 + rand() * 6;
          d += ` C${f(x + (rand() - 0.5) * 20)},${f(y + 10)} ${f(nx + (rand() - 0.5) * 20)},${f(ny - 10)} ${f(nx)},${f(ny)}`;
          x = nx;
          y = ny;
        }
        const w = 0.25 + rand() * (i < 2 ? 1.1 : 0.5);
        body += `<path d="${d}" fill="none" stroke="${i % 2 ? c1 : c3}" stroke-width="${f(w)}" opacity="${f(0.3 + rand() * 0.45)}" filter="url(#b)"/>`;
      }
      break;
    }
    case 'terrazzo': {
      body += `<rect width="100" height="100" fill="${c0}"/>`;
      const chips = [c1, c2, c3, shade(c1, 0.4)];
      for (let i = 0; i < 70; i++) {
        const cx = rand() * 100;
        const cy = rand() * 100;
        const r = 0.9 + rand() * rand() * 4.2;
        const pts = Array.from({ length: 6 }, (_, k) => {
          const a = (k / 6) * Math.PI * 2 + rand() * 0.7;
          const rr = r * (0.6 + rand() * 0.6);
          return `${f(cx + Math.cos(a) * rr)},${f(cy + Math.sin(a) * rr)}`;
        }).join(' ');
        body += `<polygon points="${pts}" fill="${chips[Math.floor(rand() * chips.length)]}" opacity="${f(0.75 + rand() * 0.25)}"/>`;
      }
      break;
    }
    case 'concrete': {
      const seed = Math.floor(rand() * 100);
      defs = `<filter id="n" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="${seed}"/><feColorMatrix type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.35  0 0 0 0 0.35  0.9 0.9 0.9 0 -0.9"/></filter><filter id="m" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="${seed + 7}"/><feColorMatrix type="matrix" values="0 0 0 0 0.2  0 0 0 0 0.2  0 0 0 0 0.2  0 0 0 0.55 -0.1"/></filter>`;
      body += `<rect width="100" height="100" fill="${c0}"/><rect width="100" height="100" filter="url(#m)" opacity="0.5"/><rect width="100" height="100" filter="url(#n)" opacity="0.55"/>`;
      break;
    }
    case 'glaze': {
      defs = `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(c0, 0.22)}"/><stop offset="0.5" stop-color="${c0}"/><stop offset="1" stop-color="${shade(c0, -0.14)}"/></linearGradient>`;
      body += `<rect width="100" height="100" fill="url(#g)"/>`;
      body += `<path d="M0,22 C30,10 60,34 100,18 L100,28 C60,44 30,20 0,32Z" fill="#fff" opacity="0.08"/>`;
      break;
    }
    case 'zellige': {
      const n = 5;
      const cell = 100 / n;
      body += `<rect width="100" height="100" fill="${c1}"/>`;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          const tone = shade(c0, (rand() - 0.5) * 0.28);
          const x = i * cell + 0.7 + (rand() - 0.5) * 0.5;
          const y = j * cell + 0.7 + (rand() - 0.5) * 0.5;
          body += `<rect x="${f(x)}" y="${f(y)}" width="${f(cell - 1.4)}" height="${f(cell - 1.4)}" rx="1.2" fill="${tone}"/>`;
          body += `<rect x="${f(x + 1)}" y="${f(y + 1)}" width="${f(cell - 3.4)}" height="${f((cell - 3.4) * 0.45)}" rx="1" fill="#fff" opacity="${f(0.05 + rand() * 0.1)}"/>`;
        }
      }
      break;
    }
    case 'herringbone': {
      body += `<rect width="100" height="100" fill="${c1}"/>`;
      const L = 22;
      const W = 6.4;
      const step = W + 0.8;
      for (let row = -6; row < 24; row++) {
        for (let col = -6; col < 24; col++) {
          const ox = col * step * 2 + (row % 2 ? step : 0);
          const oy = row * step;
          const tone = shade(c0, (rand() - 0.5) * 0.18);
          body += `<rect x="${f(ox * 0.7)}" y="${f(oy * 0.7)}" width="${f(L * 0.7)}" height="${f(W * 0.7)}" fill="${tone}" transform="rotate(${(row + col) % 2 ? 45 : -45} ${f(ox * 0.7)} ${f(oy * 0.7)})"/>`;
        }
      }
      break;
    }
    case 'hex': {
      body += `<rect width="100" height="100" fill="${c1}"/>`;
      const r = 11;
      const w = Math.sqrt(3) * r;
      for (let row = -1; row < 10; row++) {
        for (let col = -1; col < 8; col++) {
          const cx = col * w + (row % 2 ? w / 2 : 0);
          const cy = row * r * 1.5;
          const pts = Array.from({ length: 6 }, (_, k) => {
            const a = (Math.PI / 180) * (60 * k - 30);
            return `${f(cx + (r - 0.7) * Math.cos(a))},${f(cy + (r - 0.7) * Math.sin(a))}`;
          }).join(' ');
          const tone = rand() < 0.45 ? c2 : shade(c0, (rand() - 0.5) * 0.1);
          body += `<polygon points="${pts}" fill="${tone}"/>`;
        }
      }
      break;
    }
    case 'wood': {
      const rows = 9;
      const h = 100 / rows;
      for (let i = 0; i < rows; i++) {
        const tone = shade(c0, (rand() - 0.5) * 0.22);
        body += `<rect y="${f(i * h)}" width="100" height="${f(h)}" fill="${tone}"/>`;
        for (let g = 0; g < 7; g++) {
          const y = i * h + rand() * h;
          body += `<path d="M0,${f(y)} C30,${f(y + (rand() - 0.5) * 3)} 60,${f(y + (rand() - 0.5) * 3)} 100,${f(y)}" stroke="${c1}" stroke-width="0.25" fill="none" opacity="${f(0.2 + rand() * 0.3)}"/>`;
        }
        const jx = rand() * 100;
        body += `<rect x="${f(jx)}" y="${f(i * h)}" width="0.5" height="${f(h)}" fill="${c1}" opacity="0.6"/>`;
        body += `<rect y="${f(i * h + h - 0.4)}" width="100" height="0.4" fill="${c1}" opacity="0.7"/>`;
      }
      break;
    }
    case 'check': {
      const n = 6;
      const cell = 100 / n;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          body += `<rect x="${f(i * cell)}" y="${f(j * cell)}" width="${f(cell)}" height="${f(cell)}" fill="${(i + j) % 2 ? c1 : c0}"/>`;
        }
      }
      break;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice"><defs>${defs}</defs>${body}</svg>`;
}

export function swatchDataUri(p: TilePattern, size = 256): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(swatchSvg(p, size))}`;
}

/**
 * 이미지 주소(data URI 또는 같은 출처 URL)를 정사각 JPEG data URL로 변환한다.
 * AI 모델에 전달할 타일 샘플을 만들 때 쓴다. (브라우저 전용)
 */
export function rasterizeToJpeg(src: string, px = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = px;
      canvas.height = px;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('canvas unavailable'));
      const s = Math.min(img.naturalWidth, img.naturalHeight) || px;
      const sx = ((img.naturalWidth || px) - s) / 2;
      const sy = ((img.naturalHeight || px) - s) / 2;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, px, px);
      ctx.drawImage(img, sx, sy, s, s, 0, 0, px, px);
      resolve(canvas.toDataURL('image/jpeg', 0.88));
    };
    img.onerror = () => reject(new Error('타일 이미지를 불러오지 못했습니다.'));
    img.src = src;
  });
}
