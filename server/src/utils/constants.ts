/**
 * PolyPang 게임 상수
 * 출처: docs/planning/01_PRD_게임기획.md, 04_기술스택.md
 */

export const GAME_CONSTANTS = {
  // Arena
  ARENA_RADIUS_RATIO: 0.38,        // ArenaView 대비 반지름 비율
  ARENA_BASE_RADIUS: 100,          // 기본 반지름 (서버 기준, 클라는 스케일링)

  // Paddle (기본값, N별로 getPaddleRatios 사용)
  PADDLE_LENGTH_RATIO: 0.2,        // α: Side 길이 대비 패들 길이 (기본값)
  PADDLE_MOVE_RANGE: 0.8,          // β: Side 중심 기준 이동 범위 (기본값)
  PADDLE_MAX_SPEED: 2.5,           // 최대 이동 속도 (Side 길이/초)
  PADDLE_ACCELERATION: 6.0,        // 가속도
  PADDLE_DECELERATION: 0.85,       // 감속 계수

  // Ball
  BALL_INITIAL_SPEED: 0.5,         // 초기 속도 (R/초) - 빠르게 시작
  BALL_FIRST_TURN_SPEED: 75,       // 첫 턴 속도 (기존 50)
  BALL_NORMAL_SPEED: 100,          // 첫 HIT 후 정상 속도
  BALL_SPEED_INCREMENT: 1.08,      // HIT마다 8% 증가
  BALL_RADIUS_RATIO: 0.03,         // Arena 대비 공 크기

  // Timing
  COUNTDOWN_SECONDS: 3,
  OUT_SLOWMO_DURATION: 1.5,        // OUT 연출 지속 (초) - 어디서 OUT됐는지 확인
  REMESH_ANIMATION_DURATION: 0.5,  // 리메시 애니메이션 (초)

  // Network
  SERVER_TICK_RATE: 30,            // 서버 초당 틱
  CLIENT_RENDER_FPS: 60,           // 클라이언트 렌더링
  RECONNECT_MAX_ATTEMPTS: 5,       // 재연결 최대 시도
  RECONNECT_INTERVAL: 2000,        // 재연결 간격 (ms)
  DISCONNECT_TIMEOUT: 5000,        // 연결 끊김 타임아웃 (ms)

  // Room
  ROOM_CODE_LENGTH: 6,             // 방 코드 길이
  MAX_PLAYERS: 8,                  // 최대 플레이어 수
  MIN_PLAYERS: 2,                  // 최소 플레이어 수
  FIXED_ARENA_SIDES: 8,            // 항상 8각형으로 시작 (빈 자리는 봇)
  BOT_ID_PREFIX: 'BOT_',           // 봇 플레이어 ID 접두사

  // Physics
  DT: 1 / 30,                      // 물리 틱 간격 (초)
  WALL_MIN_ANGLE_RATIO: 0.342,     // 벽 반사 최소 각도 (sin(20°), 루즈한 상황 방지)
} as const;

/**
 * 플레이어 색상 팔레트
 * 출처: docs/planning/03_PRD_Arena상세.md
 */
export const PLAYER_COLORS = [
  '#EF4444', // P1 빨강
  '#F97316', // P2 주황
  '#EAB308', // P3 노랑
  '#22C55E', // P4 초록
  '#06B6D4', // P5 청록
  '#3B82F6', // P6 파랑
  '#8B5CF6', // P7 보라
  '#EC4899', // P8 분홍
] as const;

/**
 * 방 코드 생성용 문자 집합
 */
export const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // I, O, 0, 1 제외

/**
 * N-adaptive 패들 비율 계산 (PolyPang 밸런싱)
 *
 * 핵심 공식: alpha + beta = 1
 * - 이 조건을 만족해야 패들 끝점이 Side 끝점까지 도달 가능
 * - 패들 중심 이동범위(beta/2) + 패들 절반 길이(alpha/2) = Side 절반(0.5)
 *
 * 주의: 클라이언트(client/src/utils/constants.ts)와 동일하게 유지해야 함!
 *
 * @param n - 플레이어 수 (2~8)
 * @returns { alpha: 패들 길이 비율, beta: 이동 범위 비율, renderN: 렌더링용 N }
 */
export function getPaddleRatios(n: number): {
  alpha: number;
  beta: number;
  renderN: number;
} {
  // N=2: 정사각형(N=4)으로 렌더링하되 2명만 배치 (위/아래)
  if (n === 2) {
    const alpha = 0.5; // 매우 큰 패들 (50%)
    return {
      alpha,
      beta: 1 - alpha, // 0.5 (alpha + beta = 1)
      renderN: 4, // 정사각형으로 렌더링
    };
  }

  // N=3: 정삼각형, 큰 패들
  if (n === 3) {
    const alpha = 0.6; // 60% 패들 (클라이언트와 일치)
    return {
      alpha,
      beta: 1 - alpha, // 0.4 (alpha + beta = 1)
      renderN: 3,
    };
  }

  // N=4: 정사각형
  if (n === 4) {
    const alpha = 0.35; // 35% 패들
    return {
      alpha,
      beta: 1 - alpha, // 0.65 (alpha + beta = 1)
      renderN: 4,
    };
  }

  // N=5: 정오각형 (패들 1.5배 확대 - 속도감 승부)
  if (n === 5) {
    const alpha = 0.45; // 45% 패들
    return {
      alpha,
      beta: 1 - alpha,
      renderN: 5,
    };
  }

  // N=6: 정육각형 (패들 확대 - 속도감 승부)
  if (n === 6) {
    const alpha = 0.45; // 45% 패들
    return {
      alpha,
      beta: 1 - alpha,
      renderN: 6,
    };
  }

  // N=7: 정칠각형 (패들 확대)
  if (n === 7) {
    const alpha = 0.5; // 50% 패들 (클라이언트와 일치)
    return {
      alpha,
      beta: 1 - alpha,
      renderN: 7,
    };
  }

  // N≥8: 정팔각형 이상 (패들 확대)
  const alpha = 0.5; // 50% 패들 (클라이언트와 일치)
  return {
    alpha,
    beta: 1 - alpha,
    renderN: n,
  };
}
