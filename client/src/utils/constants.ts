/**
 * PolyPang 게임 상수
 *
 * 출처: docs/planning/04_기술스택.md
 */

export const GAME_CONSTANTS = {
  // Arena
  ARENA_RADIUS_RATIO: 0.38, // ArenaView 대비 반지름 비율

  // Paddle
  PADDLE_LENGTH_RATIO: 0.3, // α: Side 길이 대비 패들 길이
  PADDLE_MOVE_RANGE: 0.6, // β: Side 중심 기준 이동 범위
  PADDLE_MAX_SPEED: 0.8, // 최대 이동 속도 (Side 길이/초)
  PADDLE_ACCELERATION: 2.0, // 가속도
  PADDLE_DECELERATION: 0.9, // 감속 계수

  // Ball
  BALL_INITIAL_SPEED: 0.3, // 초기 속도 (R/초)
  BALL_SPEED_INCREMENT: 1.05, // HIT마다 5% 증가
  BALL_RADIUS_RATIO: 0.03, // Arena 대비 공 크기

  // Timing
  COUNTDOWN_SECONDS: 3,
  OUT_SLOWMO_DURATION: 0.5, // 슬로우모션 지속 (초)
  REMESH_ANIMATION_DURATION: 0.5, // 리메시 애니메이션 (초)

  // Network
  SERVER_TICK_RATE: 30, // 서버 초당 틱
  CLIENT_RENDER_FPS: 60, // 클라이언트 렌더링
  RECONNECT_MAX_ATTEMPTS: 5, // 재연결 최대 시도
  RECONNECT_INTERVAL: 2000, // 재연결 간격 (ms)
} as const

/**
 * 화면 레이아웃 비율 (9:16 기준)
 *
 * 출처: docs/planning/02_PRD_화면기획.md
 */
export const LAYOUT_RATIOS = {
  HEADER: 0.06, // 6%
  SURVIVORS: 0.04, // 4%
  ARENA: 0.52, // 52%
  CONTROLS: 0.38, // 38%
} as const

/**
 * 환경 변수
 */
export const ENV = {
  SERVER_URL: import.meta.env.VITE_SERVER_URL || 'http://localhost:3001',
  SOCKET_PATH: import.meta.env.VITE_SOCKET_PATH || '/socket.io',
  IS_DEV: import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD,
} as const
