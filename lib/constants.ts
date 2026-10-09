// 사용량 제한 (서버 API와 클라이언트 UI가 공유)

/**
 * 기능 테스트용 스위치: NEXT_PUBLIC_UNLIMITED_TRIAL=true 이면 무료 체험 횟수와 IP 일일 제한을 모두 적용하지 않는다.
 * 출시 전에는 .env.local 에서 지우거나 false 로 바꿀 것.
 */
export const UNLIMITED_TRIAL = process.env.NEXT_PUBLIC_UNLIMITED_TRIAL === 'true';

/** 브라우저 로컬 스토리지 기준 무료 체험 횟수 (데모 모드) */
export const FREE_GENERATIONS = 10;

/** 서버 인메모리 맵 기준 IP당 하루 최대 횟수 (데모 모드) */
export const DAILY_IP_LIMIT = 20;
