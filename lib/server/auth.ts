import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

/**
 * 딜러 콘솔 인증 (MVP).
 * DEALER_PASSWORD 환경변수로 비밀번호를 정하고, 로그인하면 서명된 쿠키를 발급한다.
 * 비밀번호가 없을 때는 개발 환경(NODE_ENV !== 'production')에서만 열어 둔다.
 */

export const DEALER_COOKIE = 'twotone_dealer';
const MAX_AGE_SEC = 60 * 60 * 12;

function secret(): string | null {
  return process.env.DEALER_SESSION_SECRET || process.env.DEALER_PASSWORD || null;
}

export function authConfigured(): boolean {
  return Boolean(process.env.DEALER_PASSWORD);
}

/** 비밀번호 미설정 + 개발 환경이면 로그인 없이 허용 */
export function authOpenInDev(): boolean {
  return !authConfigured() && process.env.NODE_ENV !== 'production';
}

function sign(value: string): string {
  return createHmac('sha256', secret() ?? '').update(value).digest('hex');
}

export function issueToken(): string {
  const exp = Date.now() + MAX_AGE_SEC * 1000;
  return `${exp}.${sign(String(exp))}`;
}

function verifyToken(token: string | undefined): boolean {
  if (!token || !secret()) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const expected = sign(exp);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function checkPassword(input: string): boolean {
  const pw = process.env.DEALER_PASSWORD;
  if (!pw) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(pw);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function isDealer(): Promise<boolean> {
  if (authOpenInDev()) return true;
  const store = await cookies();
  return verifyToken(store.get(DEALER_COOKIE)?.value);
}

export const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: MAX_AGE_SEC,
};
