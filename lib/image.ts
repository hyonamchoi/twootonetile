/** 브라우저 전용: 이미지를 긴 변 maxDim 이하의 JPEG data URL로 줄인다. */

export type LoadedImage = { src: string; w: number; h: number };

function drawToJpeg(img: HTMLImageElement, maxDim: number): LoadedImage {
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  if (!w || !h) throw new Error('이미지 크기를 읽지 못했습니다.');
  if (w > maxDim || h > maxDim) {
    if (w >= h) {
      h = Math.round((h * maxDim) / w);
      w = maxDim;
    } else {
      w = Math.round((w * maxDim) / h);
      h = maxDim;
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('캔버스를 사용할 수 없습니다.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return { src: canvas.toDataURL('image/jpeg', 0.85), w, h };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('이미지를 불러오지 못했습니다.'));
    img.src = src;
  });
}

export async function urlToJpeg(url: string, maxDim = 1024): Promise<LoadedImage> {
  return drawToJpeg(await loadImage(url), maxDim);
}

export function fileToJpeg(file: File, maxDim = 1024): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('파일을 읽지 못했습니다.'));
    reader.onload = async () => {
      try {
        resolve(await urlToJpeg(reader.result as string, maxDim));
      } catch (e) {
        reject(e);
      }
    };
    reader.readAsDataURL(file);
  });
}

/** Gemini 이미지 모델이 지원하는 출력 비율 */
export const GEMINI_ASPECTS = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'] as const;

/** 원본 가로/세로 비율에 가장 가까운 지원 비율 */
export function nearestAspect(ratio: number): (typeof GEMINI_ASPECTS)[number] {
  let best: (typeof GEMINI_ASPECTS)[number] = '1:1';
  let bestGap = Infinity;
  for (const a of GEMINI_ASPECTS) {
    const [w, h] = a.split(':').map(Number);
    const gap = Math.abs(Math.log(w / h / ratio));
    if (gap < bestGap) {
      bestGap = gap;
      best = a;
    }
  }
  return best;
}

/**
 * 생성 결과를 원본과 정확히 같은 픽셀 크기로 맞춘다.
 * 비율이 같으면 단순 리사이즈이고, 조금 다르면 중앙 기준으로 잘라 채운다(cover).
 */
export async function fitToSize(src: string, w: number, h: number): Promise<string> {
  const img = await loadImage(src);
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) throw new Error('결과 이미지 크기를 읽지 못했습니다.');
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('캔버스를 사용할 수 없습니다.');
  const scale = Math.max(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  return canvas.toDataURL('image/png');
}
