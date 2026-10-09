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
