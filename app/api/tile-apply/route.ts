import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { DAILY_IP_LIMIT, UNLIMITED_TRIAL } from '@/lib/constants';
import { GEMINI_ASPECTS } from '@/lib/image';
import { isDealer } from '@/lib/server/auth';
import { readDb } from '@/lib/server/db';
import { clientIp, fail, readJson } from '@/lib/server/http';
import { allowed, consume } from '@/lib/server/ratelimit';
import {
  GROUT_COLORS,
  HEX_RE,
  ROOM_KINDS,
  SURFACES,
  MAX_SURFACES_PER_APPLY,
  findLayout,
  isSlabSurface,
  type SurfaceId,
} from '@/lib/tiles';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Application = {
  surface?: string;
  tileId?: string;
  sizeId?: string;
  layoutId?: string;
  groutHex?: string;
  groutMm?: number;
  /** 클라이언트에서 512px JPEG로 만든 타일 샘플 */
  swatch?: string;
};

type Body = {
  image?: string;
  roomKindId?: string;
  applications?: Application[];
  /** 원본과 같은 비율로 결과를 받기 위한 출력 비율 (예: "4:3") */
  aspectRatio?: string;
  byokKey?: string | null;
};

const IMG_RE = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;
const DAY = 24 * 60 * 60 * 1000;

function groutName(hex: string): string {
  const near = GROUT_COLORS.find((g) => g.hex.toLowerCase() === hex.toLowerCase());
  return near ? `${near.label} (${hex})` : hex;
}

export async function POST(req: NextRequest) {
  try {
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 12 * 1024 * 1024) {
      return fail('업로드 요청 크기가 제한(12MB)을 초과했습니다. 이미지 해상도를 줄여주세요.', 413);
    }

    const body = await readJson<Body>(req);
    if (!body) return fail('요청 형식이 올바르지 않습니다.');

    const roomImg = body.image?.match(IMG_RE);
    if (!roomImg) return fail('타일을 적용할 공간 사진을 먼저 올리거나 데모룸을 선택해 주세요.');
    if (roomImg[2].length > 8 * 1024 * 1024 * 1.34) {
      return fail('업로드 이미지 용량이 8MB를 초과합니다. 더 작은 이미지를 업로드해 주세요.', 413);
    }

    const roomKind = ROOM_KINDS.find((r) => r.id === body.roomKindId) ?? ROOM_KINDS[0];
    const apps = body.applications ?? [];
    if (apps.length === 0) return fail('적용할 타일을 한 가지 이상 선택해 주세요.');
    if (apps.length > MAX_SURFACES_PER_APPLY) {
      return fail(`한 번에 최대 ${MAX_SURFACES_PER_APPLY}곳까지만 적용할 수 있습니다. 일부를 제거한 뒤 다시 시도해 주세요.`);
    }

    const db = await readDb();
    const seen = new Set<SurfaceId>();
    const lines: string[] = [];
    const sampleParts: { inlineData: { mimeType: string; data: string } }[] = [];

    for (const a of apps) {
      const surface = SURFACES.find((s) => s.id === a.surface);
      const tile = db.tiles.find((t) => t.id === a.tileId);
      const layout = findLayout(String(a.layoutId));
      const size = String(a.sizeId ?? '').match(/^(\d{2,4})x(\d{2,4})$/);
      const swatch = a.swatch?.match(IMG_RE);
      const grout = String(a.groutHex ?? '');
      const groutMm = Number(a.groutMm);

      if (!surface || seen.has(surface.id)) return fail('적용면 정보가 올바르지 않습니다.');
      if (!tile) return fail('선택한 타일을 카탈로그에서 찾을 수 없습니다. 목록을 새로고침해 주세요.');
      if (!layout || !size) return fail('타일 크기 또는 시공 패턴이 올바르지 않습니다.');
      if (!swatch || swatch[2].length > 1_000_000) return fail('타일 샘플 이미지가 올바르지 않습니다.');
      if (!HEX_RE.test(grout) || !(groutMm >= 0 && groutMm <= 10)) return fail('줄눈 설정이 올바르지 않습니다.');
      seen.add(surface.id);

      sampleParts.push({ inlineData: { mimeType: swatch[1], data: swatch[2] } });
      const idx = sampleParts.length + 1; // 이미지 1은 공간 사진
      lines.push(
        isSlabSurface(surface.id)
          ? `- ${surface.prompt}: surface it with the engineered stone slab in Image ${idx} ("${tile.name}", ${tile.finish} finish). ` +
              `It is one continuous slab: no grout lines or tile joints, with the veining/speckle flowing naturally across the top and a clean edge. ` +
              `Keep the existing countertop shape, thickness, sink cut-outs and edge profile.`
          : `- ${surface.prompt}: use the tile in Image ${idx} ("${tile.name}", ${tile.finish} finish). ` +
              `Each tile module is ${size[1]} x ${size[2]} mm, installed as ${layout.prompt}. ` +
              `Grout joints are ${groutMm} mm wide, colored ${groutName(grout)}.`
      );
    }

    const instruction = [
      `Image 1 is a customer's photo of their ${roomKind.prompt}. The other images are flat top-down samples of the tiles to install, in the order listed below.`,
      `Task: show this exact room after tiling ONLY the following surfaces:`,
      ...lines,
      `Rules:`,
      `- The output image must keep the exact same framing, camera angle and aspect ratio as Image 1 — do not crop, zoom or extend the scene.`,
      `- Keep everything else unchanged: camera angle, room geometry, fixtures (sink, toilet, bathtub, cabinets, appliances), furniture, windows, doors, ceiling, lighting direction and all objects.`,
      `- Reproduce each sample's real color, veining/pattern and texture faithfully; do not invent a different design or tint it.`,
      `- Scale tiles realistically against the room (a standard door is about 2100 mm high). Follow the surface perspective: tiles and grout lines must converge toward the vanishing points and get smaller with distance, and must wrap neatly around corners and fixtures.`,
      `- Match surface reflections to the finish (glossy = soft mirror-like reflections, matte = diffuse).`,
      `- Photorealistic interior photography. No text, labels or watermarks.`,
    ].join('\n');

    const apiKey =
      (typeof body.byokKey === 'string' && body.byokKey.trim()) || process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return fail(
        '서버의 GEMINI_API_KEY가 설정되지 않았습니다. "내 API 키" 모드를 켜고 개인 키를 입력해 주세요.',
        500
      );
    }

    // 데모 모드(서버 제공 키)인 경우에만 IP당 일일 제한 검증 — 성공했을 때만 차감
    // 딜러 로그인 상태(매장 시연용 iPad 등)는 매장 서버 키를 쓰므로 데모 제한을 적용하지 않는다
    const isDemoMode = !UNLIMITED_TRIAL && !body.byokKey && !(await isDealer());
    const ipKey = `gen:${clientIp(req)}`;
    if (isDemoMode && !allowed(ipKey, DAILY_IP_LIMIT, DAY)) {
      return fail(
        `데모 일일 제한(IP당 하루 ${DAILY_IP_LIMIT}회)을 초과했습니다. 무제한 사용을 위해 "내 API 키로 무제한 사용" 모드를 켜고 무료 API 키를 등록해 주세요.`,
        429
      );
    }

    const aspectRatio = GEMINI_ASPECTS.find((a) => a === body.aspectRatio);
    const ai = new GoogleGenAI({ apiKey });
    const res = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: roomImg[1], data: roomImg[2] } },
            ...sampleParts,
            { text: instruction },
          ],
        },
      ],
      config: aspectRatio ? { imageConfig: { aspectRatio } } : undefined,
    });

    const candidate = res.candidates?.[0];
    if (candidate?.finishReason === 'SAFETY') {
      return fail('안전 정책에 의해 이미지 생성이 차단되었습니다. 다른 사진을 사용해 주세요.');
    }
    const imageBase64 = candidate?.content?.parts?.find((p) => p.inlineData)?.inlineData?.data;
    if (!imageBase64) {
      return fail('이미지 생성이 실패했거나 차단되었습니다. 다른 타일이나 사진으로 다시 시도해 주세요.');
    }

    if (isDemoMode) consume(ipKey, DAY);
    return NextResponse.json({ image: imageBase64 });
  } catch (error) {
    console.error('Gemini Tile Apply API Error:', error);
    const errMsg = error instanceof Error ? error.message : '';

    if (
      errMsg.includes('API_KEY_INVALID') ||
      errMsg.includes('API key not valid') ||
      errMsg.includes('invalid api key')
    ) {
      return fail('API 키가 잘못되었습니다. 발급받은 유효한 API 키를 정확히 입력해 주세요.', 401);
    }
    if (errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota') || errMsg.includes('429')) {
      return fail('API 무료 요청 할당량을 초과했습니다. 잠시 후 다시 시도해 주세요.', 429);
    }
    if (errMsg.includes('SAFETY') || errMsg.includes('safety') || errMsg.includes('blocked')) {
      return fail('안전 필터에 의해 생성이 거부되었습니다. 다른 사진으로 시도해 주세요.');
    }
    return fail(`타일 적용 실패: ${errMsg || '알 수 없는 서버 내부 오류'}`, 500);
  }
}
